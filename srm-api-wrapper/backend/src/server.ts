import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import {
  createHttpClient,
  fetchLoginPage,
  fetchCaptchaImage,
  submitLoginHttp,
  navigateToSection,
  navigateViaAjax,
  extractSidebarLinks,
  extractFormValues,
  HttpSessionState,
  HttpPageResult,
  BASE_URL,
  PORTAL_BASE,
  HRD_SYSTEM_URL,
} from './services/httpSession';
import { supabase } from './lib/supabase';
import { parseAttendance } from './parsers/attendanceParser';
import { parseGradePage } from './parsers/gradeParser';
import { parseInternalMarks } from './parsers/internalMarksParser';
import { parseAcademicCalendar } from './parsers/academicCalendarParser';
import { parseTimetable } from './parsers/timetableParser';
import * as cheerio from 'cheerio';
import { SrmErrorCode } from './types/srm.types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Parse allowed origins from environment (comma-separated)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'https://classivo-1.vercel.app,http://localhost:9000,http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// --------------------------------------------------------------------
// SESSION STORE (HTTP-based, replaces Playwright session store)
// --------------------------------------------------------------------

interface HttpSRMSession {
  sessionId: string;
  client: ReturnType<typeof createHttpClient>['client'];
  jar: ReturnType<typeof createHttpClient>['jar'];
  state: 'CAPTCHA_REQUIRED' | 'AUTHENTICATION_IN_PROGRESS' | 'AUTHENTICATED' | 'AUTH_FAILED' | 'SESSION_LOST' | 'EXPIRED' | 'LOGGED_OUT';
  authenticated: boolean;
  createdAt: number;
  lastActivityAt: number;
  loginInProgress?: boolean;
  captchaGeneratedAt?: number;
  // Cached login page metadata
  loginPageHtml?: string;
  captchaFieldName?: string;
  domainFieldName?: string;
  randomDelimiter?: string;
  challengeId?: string;
  captchaUrl?: string;
  // Cached dashboard HTML (for navigation)
  dashboardHtml?: string;
  // Profile metadata
  netId?: string;
}

class SessionStore {
  private sessions = new Map<string, HttpSRMSession>();
  private sweeperInterval: NodeJS.Timeout | null = null;
  private timeoutMs = 20 * 60 * 1000;

  constructor() {
    this.startSweeper();
  }

  public setTimeoutMinutes(minutes: number) {
    this.timeoutMs = minutes * 60 * 1000;
  }

  public createSession(sessionId: string, client: any, jar: any): HttpSRMSession {
    const session: HttpSRMSession = {
      sessionId,
      client,
      jar,
      state: 'CAPTCHA_REQUIRED',
      authenticated: false,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      captchaGeneratedAt: Date.now(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  public getSession(sessionId: string): HttpSRMSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.lastActivityAt = Date.now();
    return session;
  }

  public destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`Session destroyed: ${sessionId}`);
  }

  private startSweeper() {
    if (this.sweeperInterval) return;
    this.sweeperInterval = setInterval(async () => {
      const now = Date.now();
      const unauthTimeoutMs = (process.env.UNAUTHENTICATED_SESSION_TIMEOUT_MINUTES
        ? parseInt(process.env.UNAUTHENTICATED_SESSION_TIMEOUT_MINUTES, 10)
        : 5) * 60 * 1000;
      const authTimeoutMs = (process.env.SESSION_TIMEOUT_MINUTES
        ? parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10)
        : 20) * 60 * 1000;

      for (const [id, session] of this.sessions.entries()) {
        const currentTimeout = session.authenticated ? authTimeoutMs : unauthTimeoutMs;
        if (now - session.lastActivityAt > currentTimeout) {
          console.log(`Session ${id} expired due to inactivity.`);
          try {
            await supabase
              .from('application_sessions')
              .update({ status: 'EXPIRED', authenticated: false })
              .eq('id', id);
          } catch {}
          this.destroySession(id);
        }
      }
    }, 30 * 1000);

    if (this.sweeperInterval && typeof this.sweeperInterval.unref === 'function') {
      this.sweeperInterval.unref();
    }
  }

  public async destroyAll(): Promise<void> {
    if (this.sweeperInterval) {
      clearInterval(this.sweeperInterval);
    }
    for (const [id] of this.sessions) {
      this.destroySession(id);
    }
  }
}

const sessionStore = new SessionStore();

// Set session timeout from env if provided
if (process.env.SESSION_TIMEOUT_MINUTES) {
  const mins = parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10);
  if (!isNaN(mins)) {
    sessionStore.setTimeoutMinutes(mins);
  }
}

function generateSessionId(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

const backendInstanceId = require('crypto').randomUUID();
const processStartedAt = new Date().toISOString();

// --------------------------------------------------------------------
// AUTH MIDDLEWARE
// --------------------------------------------------------------------

interface AuthenticatedRequest extends Request {
  srmSession?: HttpSRMSession;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string;
  let session = sessionId ? sessionStore.getSession(sessionId) : null;
  const sessionExists = !!session;
  const sessionAuthenticated = session ? session.state === 'AUTHENTICATED' : false;

  console.log(`[AUTH] Request: ${req.method} ${req.path}, Session: ${sessionExists}`);

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'No session ID provided. Please log in.' }
    });
  }

  if (!session) {
    try {
      const { data: dbSession } = await supabase
        .from('application_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (dbSession) {
        const inactiveStates = ['EXPIRED', 'LOGGED_OUT', 'SESSION_LOST'];
        if (!inactiveStates.includes(dbSession.status)) {
          console.log(`[SESSION] ${sessionId} found active in DB but missing in memory. Marking SESSION_LOST.`);
          try {
            await supabase
              .from('application_sessions')
              .update({ status: 'SESSION_LOST', authenticated: false })
              .eq('id', sessionId);
          } catch {}

          return res.status(401).json({
            success: false,
            error: { code: 'SESSION_LOST', message: 'The SRM session was lost due to server restart. Please sign in again.' }
          });
        }
      }
    } catch (e) {
      console.error("[AUTH] Error checking DB:", e);
    }

    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' }
    });
  }

  if (req.path.startsWith('/api/student') && session.state !== 'AUTHENTICATED') {
    return res.status(403).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Session is not authenticated.' }
    });
  }

  // Update last activity
  const now = Date.now();
  if (now - session.lastActivityAt > 30 * 1000) {
    session.lastActivityAt = now;
    const authMinutes = process.env.SESSION_TIMEOUT_MINUTES
      ? parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) : 20;
    const expiresAt = new Date(now + authMinutes * 60 * 1000).toISOString();

    try {
      await supabase.from('application_sessions').update({
        last_activity_at: new Date(now).toISOString(),
        expires_at: expiresAt
      }).eq('id', sessionId);
    } catch {}
  }

  req.srmSession = session;
  next();
}

// --------------------------------------------------------------------
// FRONTEND ROUTE REWRITE MIDDLEWARE
// --------------------------------------------------------------------
// Rewrites /portal/* paths to /api/* paths so the Classivo frontend
// can communicate with this backend.

app.use((req: Request, _res: Response, next: NextFunction) => {
  // Extract session/connection ID from body and put it in headers for requireAuth
  if (req.body && req.body.connectionId && !req.headers['x-session-id']) {
    req.headers['x-session-id'] = req.body.connectionId;
  }
  if (req.body && req.body.sessionId && !req.headers['x-session-id']) {
    req.headers['x-session-id'] = req.body.sessionId;
  }

  // Map /portal/srm/* to the correct /api/auth/* route
  const portalInitMap: Record<string, string> = {
    '/portal/srm/init':              '/api/auth/start',
    '/portal/srm/captcha/refresh':   '/api/auth/captcha/refresh',
    '/portal/srm/login':             '/api/auth/login',
    '/portal/srm/logout':            '/api/auth/logout',
    '/portal/srm/status':            '/api/auth/status',
  };

  const rewrite = portalInitMap[req.path];
  if (rewrite) {
    console.log(`[Portal Rewrite] ${req.method} ${req.path} → ${rewrite}`);
    req.url = rewrite;
    return next();
  }

  // /portal/status → /api/auth/status
  if (req.path === '/portal/status' || req.path === '/portal/srm/status') {
    console.log(`[Portal Rewrite] ${req.method} ${req.path} → /api/auth/status`);
    req.url = '/api/auth/status';
    return next();
  }

  // /portal/connect → /api/auth/start
  if (req.path === '/portal/connect') {
    console.log(`[Portal Rewrite] ${req.method} ${req.path} → /api/auth/start`);
    req.url = '/api/auth/start';
    return next();
  }

  // /portal/disconnect → /api/auth/logout
  if (req.path === '/portal/disconnect') {
    console.log(`[Portal Rewrite] ${req.method} ${req.path} → /api/auth/logout`);
    req.url = '/api/auth/logout';
    return next();
  }

  // /login → /api/academia/init (Academia login)
  if (req.path === '/login' && req.method === 'POST') {
    console.log(`[Portal Rewrite] ${req.method} ${req.path} → /api/academia/init`);
    req.url = '/api/academia/init';
    return next();
  }

  // /refresh → /api/academia/init (Academia refresh)
  if (req.path === '/refresh' && req.method === 'POST') {
    console.log(`[Portal Rewrite] ${req.method} ${req.path} → /api/academia/init`);
    req.url = '/api/academia/init';
    return next();
  }

  // /portal/academic/set-year — handled inline
  if ((req.url === '/portal/academic/set-year' || req.path === '/portal/academic/set-year') && req.method === 'POST') {
    const body = req.body || {};
    const sessionId = req.headers['x-session-id'] as string;
    const academicYearLevel = body.academicYearLevel || body.yearLevel;
    if (sessionId) {
      const session = sessionStore.getSession(sessionId);
      if (session) {
        (session as any).academicYearLevel = academicYearLevel;
      }
    }
    _res.json({ success: true, academicYearLevel });
    return;
  }

  next();
});

// --------------------------------------------------------------------
// AUTH ROUTES
// --------------------------------------------------------------------

app.post('/api/auth/start', async (req: Request, res: Response) => {
  try {
    const oldSessionId = req.headers['x-session-id'] as string;
    const frontendInstanceId = req.headers['x-frontend-instance-id'] as string || 'unknown';
    const requestId = generateSessionId();

    console.log(`[AUTH START] requestId=${requestId} timestamp=${new Date().toISOString()}`);

    if (oldSessionId) {
      const oldSession = sessionStore.getSession(oldSessionId);
      if (oldSession && !oldSession.authenticated && !oldSession.loginInProgress) {
        console.log(`[AUTH START] Destroying previous unauthenticated session: ${oldSessionId}`);
        sessionStore.destroySession(oldSessionId);
      }
    }

    // Create HTTP client with fresh cookie jar
    const { client, jar } = createHttpClient();

    // Fetch login page and extract metadata
    const loginPage = await fetchLoginPage(client);

    const sessionId = generateSessionId();
    const session = sessionStore.createSession(sessionId, client, jar);

    // Cache login page metadata
    session.loginPageHtml = loginPage.html;
    session.captchaFieldName = loginPage.captchaFieldName;
    session.domainFieldName = loginPage.domainFieldName;
    session.randomDelimiter = loginPage.randomDelimiter;
    session.challengeId = loginPage.challengeId;
    session.captchaUrl = loginPage.captchaUrl;
    session.captchaGeneratedAt = Date.now();

    // Fetch CAPTCHA image using the same session
    const captchaBase64 = await fetchCaptchaImage(client, loginPage.captchaUrl);

    // Create session in Supabase
    const unauthMinutes = process.env.UNAUTHENTICATED_SESSION_TIMEOUT_MINUTES
      ? parseInt(process.env.UNAUTHENTICATED_SESSION_TIMEOUT_MINUTES, 10) : 5;
    const expiresAt = new Date(Date.now() + unauthMinutes * 60 * 1000).toISOString();

    try {
      await supabase.from('application_sessions').insert({
        id: sessionId,
        user_id: 'pending',
        status: 'CAPTCHA_REQUIRED',
        created_at: new Date(session.createdAt).toISOString(),
        last_activity_at: new Date(session.lastActivityAt).toISOString(),
        expires_at: expiresAt,
        authenticated: false,
        backend_instance_id: backendInstanceId
      });
    } catch (err) {
      console.error(`[SUPABASE] Failed to create session:`, err);
    }

    console.log(`[AUTH START] Session initialized: ${sessionId}`);
    return res.json({
      success: true,
      sessionId,
      connectionId: sessionId,
      captcha: captchaBase64,
      captchaImage: captchaBase64,
      captchaCdigest: loginPage.challengeId || sessionId,
      cdigest: loginPage.challengeId || sessionId
    });
  } catch (err) {
    console.error("[AUTH START] Error:", err);
    return res.status(503).json({
      success: false,
      error: {
        code: 'SRM_UNAVAILABLE',
        message: 'Unable to reach the SRMIST student portal login page. Please check your connection.'
      }
    });
  }
});

app.post('/api/auth/captcha/refresh', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    const triggerReason = req.body.reason || 'manual';
    console.log(`[CAPTCHA REFRESH] reason=${triggerReason} sessionId=${session.sessionId}`);

    // Re-fetch login page to get a new CAPTCHA
    const loginPage = await fetchLoginPage(session.client);

    // Update session metadata
    session.captchaFieldName = loginPage.captchaFieldName;
    session.domainFieldName = loginPage.domainFieldName;
    session.randomDelimiter = loginPage.randomDelimiter;
    session.challengeId = loginPage.challengeId;
    session.captchaUrl = loginPage.captchaUrl;
    session.captchaGeneratedAt = Date.now();
    session.loginPageHtml = loginPage.html;

    // Fetch new CAPTCHA image
    const captchaBase64 = await fetchCaptchaImage(session.client, loginPage.captchaUrl);

    return res.json({
      success: true,
      captcha: captchaBase64,
      captchaImage: captchaBase64,
      captchaCdigest: session.challengeId || session.sessionId,
      cdigest: session.challengeId || session.sessionId
    });
  } catch (err) {
    console.error("[CAPTCHA REFRESH] Error:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reload Captcha image from portal.'
      }
    });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { sessionId: bodySessionId, connectionId, netId, registrationNumber, password, captcha } = req.body;
  const sessionId = bodySessionId || connectionId || (req.headers['x-session-id'] as string);
  const actualNetId = netId || registrationNumber;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Session ID is required.' }
    });
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please refresh and try again.' }
    });
  }

  const requestId = generateSessionId();
  console.log(`[AUTH LOGIN] requestId=${requestId} sessionId=${sessionId}`);

  if (session.loginInProgress) {
    return res.status(409).json({
      success: false,
      error: { code: 'AUTHENTICATION_IN_PROGRESS', message: 'Authentication is already in progress for this session.' }
    });
  }

  if (!actualNetId || !password || !captcha) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'NetID, Password, and Captcha are all required.' }
    });
  }

  session.loginInProgress = true;
  session.state = 'AUTHENTICATION_IN_PROGRESS';

  try {
    const captchaAgeMs = Date.now() - (session.captchaGeneratedAt || session.createdAt);
    console.log(`[AUTH LOGIN] Captcha age: ${Math.round(captchaAgeMs / 1000)}s`);

    // Submit login via HTTP
    const result = await submitLoginHttp(session.client, {
      netId: actualNetId.trim(),
      password,
      captcha: captcha.trim(),
      captchaFieldName: session.captchaFieldName || 'cptoken',
      domainFieldName: session.domainFieldName || 'dtoken',
      randomDelimiter: session.randomDelimiter || '',
      challengeId: session.challengeId || '',
    });

    if (result.success) {
      session.state = 'AUTHENTICATED';
      session.authenticated = true;
      session.netId = actualNetId.trim().split('@')[0];

      // Cache the dashboard HTML for navigation
      session.dashboardHtml = result.html;

      const authMinutes = process.env.SESSION_TIMEOUT_MINUTES
        ? parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) : 20;
      const expiresAt = new Date(Date.now() + authMinutes * 60 * 1000).toISOString();

      try {
        await supabase.from('application_sessions').update({
          user_id: session.netId,
          status: 'AUTHENTICATED',
          authenticated: true,
          expires_at: expiresAt,
          last_activity_at: new Date().toISOString()
        }).eq('id', sessionId);
      } catch (err) {
        console.error(`[SUPABASE] Failed to update login success:`, err);
      }

      console.log(`[AUTH LOGIN] Success: ${sessionId}`);
      return res.json({
        success: true,
        authenticated: true,
        sessionId: session.sessionId,
        message: 'Login successful'
      });
    } else {
      session.authenticated = false;
      const isCaptchaError = result.error?.toLowerCase().includes('captcha');
      session.state = isCaptchaError
        ? 'CAPTCHA_REQUIRED'
        : 'AUTH_FAILED';

      try {
        await supabase.from('application_sessions').update({
          status: session.state,
          last_activity_at: new Date().toISOString()
        }).eq('id', sessionId);
      } catch (err) {
        console.error(`[SUPABASE] Failed to update login failure:`, err);
      }

      const errorCode: SrmErrorCode = isCaptchaError
        ? 'INVALID_CAPTCHA'
        : result.error?.toLowerCase().includes('password') || result.error?.toLowerCase().includes('username')
          ? 'INVALID_CREDENTIALS'
          : 'AUTHENTICATION_UNKNOWN';

      console.log(`[AUTH LOGIN] Failed: ${errorCode}`);

      let captchaResponseFields = {};
      if (isCaptchaError) {
        try {
          const loginPage = await fetchLoginPage(session.client);
          session.captchaFieldName = loginPage.captchaFieldName;
          session.domainFieldName = loginPage.domainFieldName;
          session.randomDelimiter = loginPage.randomDelimiter;
          session.challengeId = loginPage.challengeId;
          session.captchaUrl = loginPage.captchaUrl;
          session.captchaGeneratedAt = Date.now();
          session.loginPageHtml = loginPage.html;
          const captchaBase64 = await fetchCaptchaImage(session.client, loginPage.captchaUrl);

          captchaResponseFields = {
            captcha_required: true,
            captchaImage: captchaBase64,
            captcha_image: captchaBase64,
            captchaCdigest: loginPage.challengeId || sessionId,
            cdigest: loginPage.challengeId || sessionId,
            connectionId: sessionId
          };
        } catch (e) {
          console.error("[AUTH LOGIN] Failed to re-fetch captcha:", e);
        }
      }

      return res.json({
        success: false,
        authenticated: false,
        type: isCaptchaError ? 'CAPTCHA_REQUIRED' : undefined,
        ...captchaResponseFields,
        error: {
          code: errorCode,
          message: result.error || 'Authentication failed. Please verify credentials and captcha.'
        },
        message: result.error || 'Authentication failed. Please verify credentials and captcha.'
      });
    }
  } catch (err) {
    console.error("[AUTH LOGIN] Error:", err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal error during login process.' }
    });
  } finally {
    session.loginInProgress = false;
  }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const sessionId = req.body.sessionId || (req.headers['x-session-id'] as string);
  if (sessionId) {
    try {
      await supabase
        .from('application_sessions')
        .update({ status: 'LOGGED_OUT', authenticated: false })
        .eq('id', sessionId);
    } catch (e) {
      console.error("[LOGOUT] Failed to update Supabase:", e);
    }
    sessionStore.destroySession(sessionId);
  }
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.get('/api/auth/status', async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (!sessionId) {
    return res.json({
      success: true,
      sessionExists: false,
      authenticated: false,
      state: 'EXPIRED',
      sessionStatus: 'EXPIRED'
    });
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    try {
      const { data: dbSession } = await supabase
        .from('application_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (dbSession) {
        return res.json({
          success: true,
          sessionExists: true,
          authenticated: false,
          state: dbSession.status,
          createdAt: dbSession.created_at,
          lastActivityAt: dbSession.last_activity_at,
          sessionStatus: dbSession.status
        });
      }
    } catch {}

    return res.json({
      success: true,
      sessionExists: false,
      authenticated: false,
      state: 'EXPIRED',
      sessionStatus: 'EXPIRED'
    });
  }

  return res.json({
    success: true,
    sessionExists: true,
    authenticated: session.authenticated,
    state: session.state,
    createdAt: new Date(session.createdAt).toISOString(),
    lastActivityAt: new Date(session.lastActivityAt).toISOString(),
    sessionStatus: session.authenticated ? 'ACTIVE' : 'INCOMPLETE'
  });
});

app.get('/health', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'classivo-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    startedAt: processStartedAt,
    processId: process.pid,
    backendInstanceId: backendInstanceId
  });
});

// --------------------------------------------------------------------
// HELPER: Navigate to a section using form submission
// --------------------------------------------------------------------

async function navigateToSrmSection(session: HttpSRMSession, formId: number, sectionName: string): Promise<string> {
  console.log(`[NAV] Navigating to ${sectionName} (formId=${formId})`);

  // Use cached dashboard HTML or fetch it
  let html = session.dashboardHtml || '';
  if (!html) {
    throw Object.assign(new Error('SRM_SESSION_EXPIRED'), { code: 'SRM_SESSION_EXPIRED' });
  }

  try {
    // Strategy 1: Form submission to HRDSystem.jsp
    const result = await navigateToSection(session.client, html, formId, sectionName);
    session.dashboardHtml = result.html; // Update cached HTML
    return result.html;
  } catch (err: any) {
    if (err.message === 'SRM_SESSION_EXPIRED') throw err;
    console.log(`[NAV] Strategy 1 failed: ${err.message}`);
  }

  throw Object.assign(new Error('SRM_NAVIGATION_FAILED'), {
    code: 'SRM_NAVIGATION_FAILED',
    details: `Could not navigate to ${sectionName}. Try logging in again.`
  });
}

// --------------------------------------------------------------------
// STUDENT DATA ROUTES
// --------------------------------------------------------------------

app.get('/api/student/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    const html = session.dashboardHtml || '';
    if (!html) {
      throw Object.assign(new Error('SESSION_EXPIRED'), { code: 'SRM_SESSION_EXPIRED' });
    }

    const $ = cheerio.load(html);
    const links = extractSidebarLinks(html);

    // Extract basic info
    let studentName = '';
    const nameSelectors = ['.student-name', '#studentName', '[class*="student"]', 'h1', 'h2', 'h3', '.welcome'];
    for (const sel of nameSelectors) {
      const text = $(sel).first().text().trim().replace(/\s+/g, ' ');
      if (text && text.length < 80 && text.length > 2) {
        studentName = text;
        break;
      }
    }

    return res.json({
      success: true,
      data: {
        currentUrl: 'dashboard',
        pageTitle: 'Student Portal',
        studentName,
        links: links.map(l => ({ text: l.text, href: `formId:${l.formId}` })),
        rawSummary: {
          linksFound: links.length,
        }
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get('/api/student/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    // Navigate to Personal Details (formId=17)
    const html = await navigateToSrmSection(session, 17, 'Personal Details');

    const $ = cheerio.load(html);
    const data: Record<string, string> = {};

    // Extract label-value pairs from table rows
    $('tr').each((_, trEl) => {
      const tds = $(trEl).find('td');
      if (tds.length >= 2) {
        const label = tds.eq(0).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
        const value = tds.eq(1).text().trim().replace(/\s+/g, ' ');
        if (label && value && label.length < 60) {
          data[label] = value;
        }
      }
    });

    // Extract from dt/dd pairs
    $('dl').each((_, dl) => {
      const dts = $(dl).find('dt');
      const dds = $(dl).find('dd');
      dts.each((i, dt) => {
        const label = $(dt).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
        const value = $(dds.eq(i)).text().trim().replace(/\s+/g, ' ');
        if (label) data[label] = value;
      });
    });

    // Map common fields
    const fieldMap: Record<string, string[]> = {
      name: ['Student Name', 'Name', 'Full Name'],
      studentId: ['Student Id', 'Student ID', 'NetID'],
      registerNumber: ['Register Number', 'Reg No', 'Registration No'],
      email: ['Email', 'Email Id'],
      program: ['Program', 'Programme', 'Course'],
      semester: ['Semester', 'Sem'],
      batch: ['Batch', 'Year'],
      section: ['Section'],
    };

    const profile: Record<string, string | null> = {};
    for (const [normalized, variants] of Object.entries(fieldMap)) {
      for (const variant of variants) {
        const match = Object.entries(data).find(([k]) =>
          k.toLowerCase().includes(variant.toLowerCase())
        );
        if (match) {
          profile[normalized] = match[1];
          break;
        }
      }
      if (!profile[normalized]) profile[normalized] = null;
    }

    return res.json({
      success: true,
      data: {
        ...profile,
        _rawLabelValues: data,
        _url: 'Personal Details'
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get(['/api/student/grades', '/api/student/marks'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    // Navigate to Grade/Mark & Credit (formId=8)
    const html = await navigateToSrmSection(session, 8, 'Grade / Mark & Credit');

    if (!html.toLowerCase().includes('grade') && !html.toLowerCase().includes('mark')) {
      throw Object.assign(new Error('WRONG_PAGE'), {
        code: 'WRONG_PAGE',
        message: 'The Grades/Marks page was not opened.'
      });
    }

    const parsed = parseGradePage(html);

    return res.json({
      success: true,
      data: {
        headers: parsed._rawHeaders,
        grades: parsed.courses.map(c => c._raw),
        semesters: parsed.semesters,
        overallSummary: parsed.overallSummary,
        _url: 'Grade / Mark & Credit'
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get('/api/student/exams', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    // Try to find exam timetable link
    const links = extractSidebarLinks(session.dashboardHtml || '');
    const examLink = links.find(l =>
      l.text.toLowerCase().includes('exam') || l.text.toLowerCase().includes('examination')
    );

    if (!examLink?.formId) {
      throw Object.assign(new Error('NOT_AVAILABLE'), {
        code: 'NOT_AVAILABLE',
        details: 'Exam timetable link not found in sidebar.'
      });
    }

    const html = await navigateToSrmSection(session, examLink.formId, 'Exam Timetable');

    const $ = cheerio.load(html);
    const tables: Array<{ headers: string[]; rows: Record<string, string>[] }> = [];

    $('table').each((_, tableEl) => {
      const headers: string[] = [];
      const rows: Record<string, string>[] = [];

      $(tableEl).find('thead tr, tr').first().find('th, td').each((_, th) => {
        headers.push($(th).text().trim().replace(/\s+/g, ' '));
      });

      $(tableEl).find('tbody tr, tr').slice(1).each((_, rowEl) => {
        const cells = $(rowEl).find('td');
        if (cells.length === 0) return;
        const row: Record<string, string> = {};
        cells.each((cellIdx, cellEl) => {
          row[headers[cellIdx] || `col_${cellIdx}`] = $(cellEl).text().trim().replace(/\s+/g, ' ');
        });
        if (Object.values(row).some(v => v.length > 0)) rows.push(row);
      });

      if (headers.length > 0 || rows.length > 0) tables.push({ headers, rows });
    });

    if (tables.length === 0 || tables.every(t => t.rows.length === 0)) {
      throw Object.assign(new Error('NOT_AVAILABLE'), {
        code: 'NOT_AVAILABLE',
        details: 'Exam timetable page loaded but contained no table data.'
      });
    }

    const timetableTable = tables.sort((a, b) => b.rows.length - a.rows.length)[0];

    return res.json({
      success: true,
      data: {
        headers: timetableTable.headers,
        timetable: timetableTable.rows,
        _url: 'Exam Timetable'
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get('/api/student/hostel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    // Try hostel subpages
    const results: Record<string, any> = {};
    const subpages = [
      { name: 'booking', formId: 14, patterns: ['Hostel Booking'] },
      { name: 'details', formId: 11, patterns: ['Hostel Details'] },
      { name: 'willingness', formId: 135, patterns: ['Hostel Willingness'] },
    ];

    for (const sub of subpages) {
      try {
        const html = await navigateToSrmSection(session, sub.formId, sub.name);
        const $ = cheerio.load(html);

        const tables: Array<{ headers: string[]; rows: Record<string, string>[] }> = [];
        $('table').each((_, tableEl) => {
          const headers: string[] = [];
          const rows: Record<string, string>[] = [];
          $(tableEl).find('thead tr, tr').first().find('th, td').each((_, th) => {
            headers.push($(th).text().trim().replace(/\s+/g, ' '));
          });
          $(tableEl).find('tbody tr, tr').slice(1).each((_, rowEl) => {
            const cells = $(rowEl).find('td');
            if (cells.length === 0) return;
            const row: Record<string, string> = {};
            cells.each((cellIdx, cellEl) => {
              row[headers[cellIdx] || `col_${cellIdx}`] = $(cellEl).text().trim().replace(/\s+/g, ' ');
            });
            if (Object.values(row).some(v => v.length > 0)) rows.push(row);
          });
          if (headers.length > 0 || rows.length > 0) tables.push({ headers, rows });
        });

        const labelValues: Record<string, string> = {};
        $('tr').each((_, trEl) => {
          const tds = $(trEl).find('td');
          if (tds.length >= 2) {
            const label = tds.eq(0).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
            const value = tds.eq(1).text().trim().replace(/\s+/g, ' ');
            if (label && value && label.length < 60) labelValues[label] = value;
          }
        });

        results[sub.name] = {
          success: tables.length > 0 || Object.keys(labelValues).length > 0,
          data: { tables, labelValues }
        };
      } catch (err: any) {
        results[sub.name] = {
          success: false,
          error: { code: err.code || 'PARSER_ERROR', message: err.message }
        };
      }
    }

    return res.json({
      success: true,
      data: {
        booking: results.booking,
        details: results.details,
        willingness: results.willingness,
        _url: 'Hostel'
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get('/api/student/attendance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    console.log(`[ATTENDANCE] Starting extraction...`);

    // Navigate to Attendance Details (formId=9)
    const html = await navigateToSrmSection(session, 9, 'Attendance Details');

    console.log(`[ATTENDANCE] HTML length: ${html.length}`);

    // Parse attendance
    let parsed = parseAttendance(html);
    console.log(`[ATTENDANCE] Subjects extracted: ${parsed.subjects.length}`);

    // If no subjects found, check for alternative table structures
    if (parsed.subjects.length === 0) {
      console.log(`[ATTENDANCE] No subjects found, checking alternative structures...`);

      // Try to find attendance data in any table
      const $ = cheerio.load(html);
      const tables = $('table');
      console.log(`[ATTENDANCE] Tables found: ${tables.length}`);

      tables.each((i, tableEl) => {
        const headers: string[] = [];
        $(tableEl).find('thead tr th, tr:first-child th, tr:first-child td').each((_, th) => {
          headers.push($(th).text().trim().toLowerCase());
        });
        console.log(`[ATTENDANCE] Table ${i} headers: ${headers.join(', ')}`);
      });
    }

    if (parsed.subjects.length === 0) {
      const hasAttendanceText = html.toLowerCase().includes('attendance');
      const code = hasAttendanceText ? 'ATTENDANCE_PARSER_ERROR' : 'ATTENDANCE_PAGE_EMPTY';
      throw Object.assign(new Error(code), {
        code,
        details: hasAttendanceText
          ? `Attendance page loaded but parser found no data. HTML length: ${html.length}`
          : `Attendance page contained no attendance content. HTML length: ${html.length}`
      });
    }

    return res.json({
      success: true,
      data: {
        semester: parsed.metadata.semester,
        academicYear: parsed.metadata.academicYear,
        section: parsed.metadata.section,
        overallPercentage: parsed.overallPercentage,
        totalHeld: parsed.totalHeld,
        totalAttended: parsed.totalAttended,
        subjects: parsed.subjects.map(s => ({
          courseCode: s.courseCode,
          courseName: s.courseName,
          courseType: s.courseType,
          faculty: s.faculty,
          classesHeld: s.classesHeld,
          classesAttended: s.classesAttended,
          percentage: s.percentage,
          status: s.status,
        })),
        metadata: {
          periodStart: parsed.metadata.periodStart,
          periodEnd: parsed.metadata.periodEnd,
          semester: parsed.metadata.semester,
          academicYear: parsed.metadata.academicYear,
          section: parsed.metadata.section,
        },
        _debug: {
          url: 'Attendance Details',
          rawHeaders: parsed._rawHeaders,
          tablesFound: parsed._tablesFound,
          rowsFound: parsed._rowsFound,
        },
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get('/api/student/internal-marks', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    // Navigate to Internal Mark Details (formId=13)
    const html = await navigateToSrmSection(session, 13, 'Internal Mark Details');

    if (!html.toLowerCase().includes('internal mark') && !html.toLowerCase().includes('internal assessment')) {
      throw Object.assign(new Error('WRONG_PAGE'), {
        code: 'WRONG_PAGE',
        message: 'The Internal Marks page was not opened.'
      });
    }

    const parsed = parseInternalMarks(html);

    return res.json({
      success: true,
      data: {
        metadata: parsed.metadata,
        subjects: parsed.subjects.map(s => ({
          semester: s.semester,
          academicYear: s.academicYear,
          courseCode: s.courseCode,
          courseName: s.courseName,
          courseType: s.courseType,
          faculty: s.faculty,
          components: s.components,
          total: s.total,
          maxMarks: s.maxMarks,
          obtainedMarks: s.obtainedMarks,
          status: s.status,
          remarks: s.remarks,
        })),
        tables: parsed.tables,
        _url: 'Internal Mark Details'
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get('/api/student/academic-calendar', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    console.log(`[ACADEMIC CALENDAR] Starting extraction...`);

    // Discover sidebar links to find calendar formId
    const links = extractSidebarLinks(session.dashboardHtml || '');
    console.log(`[ACADEMIC CALENDAR] Sidebar links: ${links.length}`);

    const calPatterns = ['academic calendar', 'calendar/planner', 'academic planner', 'calendar planner'];
    const calLink = links.find(l =>
      calPatterns.some(p => l.text.toLowerCase().includes(p))
    );

    let html = '';

    if (calLink?.formId) {
      console.log(`[ACADEMIC CALENDAR] Navigating via formId ${calLink.formId}`);
      html = await navigateToSrmSection(session, calLink.formId, 'Academic Calendar');
    } else {
      // Try brute-forcing nearby formIds
      for (const formId of [10, 11, 12, 14, 15, 16, 17, 18, 19, 20]) {
        try {
          html = await navigateToSrmSection(session, formId, 'Calendar Search');
          if (html.toLowerCase().includes('academic calendar') || html.toLowerCase().includes('calendar planner')) {
            break;
          }
        } catch {}
      }
    }

    if (!html.toLowerCase().includes('academic calendar') && !html.toLowerCase().includes('calendar planner')) {
      throw Object.assign(new Error('SRM_NAVIGATION_FAILED'), {
        code: 'SRM_NAVIGATION_FAILED',
        details: 'Could not navigate to Academic Calendar.'
      });
    }

    console.log(`[ACADEMIC CALENDAR] HTML length: ${html.length}`);

    const parsed = parseAcademicCalendar(html);
    console.log(`[ACADEMIC CALENDAR] Entries: ${parsed.entries.length}`);

    if (parsed.entries.length === 0) {
      throw Object.assign(new Error('PARSER_NO_DATA'), {
        code: 'PARSER_NO_DATA',
        details: `Academic calendar page loaded but no entries found. HTML length: ${html.length}`
      });
    }

    return res.json({
      success: true,
      data: {
        template: parsed.template,
        dateRange: parsed.dateRange,
        summary: parsed.summary,
        entries: parsed.entries,
        _url: 'Academic Calendar'
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

app.get('/api/student/timetable', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    console.log(`[TIMETABLE] Starting extraction...`);

    // Discover sidebar links to find timetable formId
    const links = extractSidebarLinks(session.dashboardHtml || '');
    console.log(`[TIMETABLE] Sidebar links: ${links.length}`);

    const timetablePatterns = ['timetable', 'time table', 'class timetable', 'class schedule'];
    const timetableLink = links.find(l =>
      timetablePatterns.some(p => l.text.toLowerCase().includes(p))
    );

    let html = '';

    if (timetableLink?.formId) {
      console.log(`[TIMETABLE] Navigating via formId ${timetableLink.formId}`);
      html = await navigateToSrmSection(session, timetableLink.formId, 'Timetable');
    } else {
      // Try brute-forcing nearby formIds
      for (const formId of [10, 11, 12, 14, 15]) {
        try {
          html = await navigateToSrmSection(session, formId, 'Timetable Search');
          if (html.toLowerCase().includes('timetable') || html.toLowerCase().includes('time table') ||
              html.toLowerCase().includes('slot')) {
            break;
          }
        } catch {}
      }
    }

    console.log(`[TIMETABLE] HTML length: ${html.length}`);

    // Wait for dynamic content (AJAX-loaded timetable)
    // In HTTP mode, we already have the full HTML from the form submission
    const parsed = parseTimetable(html);
    console.log(`[TIMETABLE] Days extracted: ${Object.keys(parsed.schedule).length}`);

    if (Object.keys(parsed.schedule).length === 0) {
      throw Object.assign(new Error('PARSER_NO_DATA'), {
        code: 'PARSER_NO_DATA',
        details: `Timetable page loaded but no schedule data found. HTML length: ${html.length}. Diagnostics: ${JSON.stringify(parsed._diagnostics)}`
      });
    }

    return res.json({
      success: true,
      data: {
        schedule: parsed.schedule,
        semester: parsed.semester,
        academicYear: parsed.academicYear,
        section: parsed.section,
        dayNames: parsed.dayNames,
        courseDetails: parsed.courseDetails,
        _diagnostics: parsed._diagnostics,
        _url: 'Timetable'
      }
    });
  } catch (err) {
    return handleExtractionError(err, res);
  }
});

// Generic stub for unmapped endpoints
const unmappedEndpoints = [
  '/api/student/personal-details',
  '/api/student/course-registration',
  '/api/student/exam-results',
  '/api/student/revaluation-results',
  '/api/student/fees',
  '/api/student/courses',
];

unmappedEndpoints.forEach(path => {
  app.get(path, requireAuth, (req: AuthenticatedRequest, res: Response) => {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `The section '${path.split('/').pop()}' extraction is not yet implemented.`
      }
    });
  });
});

function handleExtractionError(err: any, res: Response) {
  console.error("Extraction error:", err?.message || err);

  const code = err?.code || (err instanceof Error ? err.message : 'INTERNAL_ERROR');

  if (code === 'SRM_SESSION_EXPIRED' || code === 'SESSION_EXPIRED') {
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Your SRM session has expired. Please log in again.' }
    });
  }
  if (code === 'SRM_NAVIGATION_FAILED') {
    return res.status(422).json({
      success: false,
      error: {
        code: 'SRM_NAVIGATION_FAILED',
        message: err?.details || 'Could not navigate to this section from the SRM dashboard.',
        hint: 'Check /api/student/dashboard for discovered navigation links.'
      }
    });
  }
  if (code === 'PARSER_NO_DATA') {
    return res.status(200).json({
      success: false,
      error: {
        code: 'PARSER_NO_DATA',
        message: err?.details || 'The SRM page loaded but the parser found no structured data.'
      }
    });
  }
  if (code === 'NOT_AVAILABLE') {
    return res.status(200).json({
      success: false,
      error: {
        code: 'NOT_AVAILABLE',
        message: err?.details || 'This section is not available or has no data for your account.'
      }
    });
  }
  if (code === 'ATTENDANCE_PAGE_EMPTY') {
    return res.status(200).json({
      success: false,
      error: {
        code: 'ATTENDANCE_PAGE_EMPTY',
        message: err?.details || 'The attendance page loaded but contained no attendance data.'
      }
    });
  }
  if (code === 'ATTENDANCE_PARSER_ERROR') {
    return res.status(200).json({
      success: false,
      error: {
        code: 'ATTENDANCE_PARSER_ERROR',
        message: err?.details || 'The attendance page loaded but the structure could not be parsed.'
      }
    });
  }
  if (code === 'WRONG_PAGE') {
    return res.status(200).json({
      success: false,
      error: {
        code: 'WRONG_PAGE',
        message: err?.message || 'The wrong page was loaded.'
      }
    });
  }

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: `Extraction failed: ${err?.message || err}` }
  });
}

// --------------------------------------------------------------------
// ACADEMIA ROUTES
// --------------------------------------------------------------------

app.post('/api/academia/init', async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, username: rawUsername, password } = req.body || {};
    const email = rawEmail || rawUsername || '';
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    console.log(`[Academia] Login attempt for: ${email}`);

    // Create a fresh HTTP session for Academia
    const ACADEMIA_BASE = 'https://academia.srmist.edu.in';
    const { CookieJar: ToughJar } = require('tough-cookie');
    const jar = new ToughJar();
    const client = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxRedirects: 5,
      validateStatus: (s: number) => s < 500,
    });

    // Cookie interceptors for Academia session
    client.interceptors.request.use(async (config: any) => {
      const url = `${ACADEMIA_BASE}${config.url || ''}`;
      const cookieString = await jar.getCookieString(url);
      if (cookieString) config.headers = { ...config.headers, Cookie: cookieString };
      return config;
    });
    client.interceptors.response.use(async (response: any) => {
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        const url = `${ACADEMIA_BASE}${response.config?.url || ''}`;
        const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
        for (const c of arr) { try { await jar.setCookie(c, url); } catch {} }
      }
      return response;
    });

    // Step 1: Load the login page
    const loginPageResp = await client.get(`${ACADEMIA_BASE}/login`, {
      maxRedirects: 5,
      timeout: 15000,
    });
    console.log(`[Academia] Login page status: ${loginPageResp.status}`);

    // Step 2: Submit login credentials
    const loginResp = await client.post(`${ACADEMIA_BASE}/login`,
      new URLSearchParams({ email, password }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 5,
        timeout: 20000,
      }
    );
    console.log(`[Academia] Login response status: ${loginResp.status}`);

    const loginHtml = typeof loginResp.data === 'string' ? loginResp.data : '';

    // Check if login was successful (look for dashboard indicators)
    const isLoggedIn = loginHtml.includes('logout') || loginHtml.includes('dashboard') || 
                       loginHtml.includes('timetable') || loginHtml.includes('my-courses') ||
                       loginResp.status === 200;

    if (!isLoggedIn) {
      console.log('[Academia] Login appears to have failed');
      return res.status(401).json({ success: false, message: 'Invalid Academia credentials.' });
    }

    // Step 3: Try to fetch timetable page
    let timetable: any[] = [];
    try {
      const timetableResp = await client.get(`${ACADEMIA_BASE}/my-timetable`, {
        maxRedirects: 5,
        timeout: 15000,
      });
      console.log(`[Academia] Timetable page status: ${timetableResp.status}`);

      if (timetableResp.status === 200) {
        const $ = cheerio.load(String(timetableResp.data));
        // Extract timetable data from the page
        $('table tr').each((_i, row) => {
          const cells = $(row).find('td, th').map((_j, cell) => $(cell).text().trim()).get();
          if (cells.length > 0 && cells.some(c => c.length > 0)) {
            timetable.push(cells);
          }
        });
      }
    } catch (e: any) {
      console.log(`[Academia] Timetable fetch failed: ${e?.message}`);
    }

    // Step 4: Extract user info from page
    const nameMatch = loginHtml.match(/Hello[\s,]*([\w\s]+)/i) || loginHtml.match(/Welcome[\s,]*([\w\s]+)/i);
    const name = nameMatch ? nameMatch[1].trim() : email.split('@')[0];

    // Detect academic year from semester if present
    let academicYearLevel = null;
    let semester = null;
    const semMatch = loginHtml.match(/semester[\s:]*(\d+)/i);
    if (semMatch) {
      semester = parseInt(semMatch[1], 10);
      academicYearLevel = Math.ceil(semester / 2);
    }

    // Store the session for later use
    const sessionId = generateSessionId();
    const authMinutes = process.env.SESSION_TIMEOUT_MINUTES
      ? parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) : 20;
    const expiresAt = new Date(Date.now() + authMinutes * 60 * 1000).toISOString();

    // Store in supabase
    try {
      await supabase.from('application_sessions').insert({
        id: sessionId,
        srm_session_id: sessionId,
        frontend_instance_id: 'academia',
        state: 'AUTHENTICATED',
        authenticated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
    } catch (e: any) {
      console.log(`[Academia] Session store warning: ${e?.message}`);
    }

    console.log(`[Academia] Login successful for ${email}, name: ${name}`);

    return res.json({
      success: true,
      user: {
        name,
        email,
        academicYearLevel,
        semester,
      },
      schedule: {
        timetable,
      },
      sessionId,
    });
  } catch (err: any) {
    console.error(`[Academia] Login error:`, err?.message || err);
    return res.status(503).json({
      success: false,
      message: 'Could not connect to Academia. ' + (err?.message || 'Please try again.'),
    });
  }
});

// --------------------------------------------------------------------
// SERVER START AND SHUTDOWN
// --------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`Classivo backend running on http://localhost:${PORT}`);
  console.log(`Mode: HTTP-based (no browser required)`);
  console.log(`Backend instance: ${backendInstanceId}`);
});

async function shutdown() {
  console.log("\nShutting down backend server...");
  server.close();
  await sessionStore.destroyAll();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
