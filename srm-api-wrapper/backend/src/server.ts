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
import { srmLog, srmError } from './utils/srmLogger';
import { buildUnifiedMarks } from './parsers/unifiedMarksParser';
import { extractStudentCourses } from './parsers/courseParser';
import { parseHostelBookingPage } from './parsers/hostelBookingParser';
import { parseHostelDetailsPage } from './parsers/hostelDetailsParser';
import { parseDashboard } from './parsers/parse-dashboard';
import { parseHostel } from './parsers/parse-hostel';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const defaultOrigins = [
  'https://classivo-1.vercel.app',
  'http://localhost:9000',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001'
];
const envOrigins = [
  ...(process.env.ALLOWED_ORIGINS || '').split(','),
  ...(process.env.FRONTEND_URL || '').split(',')
].map(o => o.trim()).filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
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
  nonce?: string;
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
    '/portal/sync':                  '/api/auth/sync',
    '/portal/srm/sync':              '/api/auth/sync',
    '/portal/all':                   '/api/student/all',
    '/portal/srm/all':               '/api/student/all',
    '/portal/student/all':           '/api/student/all',
    '/portal/courses':               '/api/student/courses',
    '/portal/srm/courses':           '/api/student/courses',
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
    session.nonce = loginPage.nonce;
    session.captchaGeneratedAt = Date.now();

    // Fetch CAPTCHA image using the same session
    const captchaBase64 = await fetchCaptchaImage(client, loginPage.captchaUrl, loginPage.nonce);

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
    session.nonce = loginPage.nonce;
    session.captchaGeneratedAt = Date.now();
    session.loginPageHtml = loginPage.html;

    // Fetch new CAPTCHA image
    const captchaBase64 = await fetchCaptchaImage(session.client, loginPage.captchaUrl, loginPage.nonce);

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

async function fetchInternalMarksHtml(session: HttpSRMSession): Promise<string> {
  const dashboardHtml = session.dashboardHtml || '';
  const links = extractSidebarLinks(dashboardHtml);
  
  const intLink = links.find(l => {
    const text = l.text.toLowerCase();
    const onclick = l.onclick.toLowerCase();
    return (
      (text.includes('internal') && (text.includes('mark') || text.includes('detail'))) ||
      text === 'internal mark details' ||
      text === 'internal marks' ||
      onclick.includes('studentinternalmark') ||
      onclick.includes('internalmark')
    );
  });

  // Never use formId 8 (Grade / Mark & Credit page) for internal marks!
  let formId = intLink?.formId;
  if (!formId || formId === 8) {
    formId = 13;
  }

  const jspUrl = intLink?.jspUrl || 'StudentInternalMarkDetails.jsp';

  const isInternalMarksHtml = (html: string) => {
    if (!html) return false;
    const lower = html.toLowerCase();
    // Reject if it is purely the Grade / Mark & Credit page (Page 1) with SGPA / letter grades only
    if ((lower.includes('grade / mark & credit') || lower.includes('sgpa') || lower.includes('grade point')) &&
        !lower.includes('mark / max') && !lower.includes('studentinternalmarkdetails')) {
      return false;
    }
    return (
      lower.includes('internal mark') ||
      lower.includes('mark / max') ||
      lower.includes('studentinternalmark') ||
      lower.includes('description')
    );
  };

  // 1. Try AJAX navigation via jspUrl if extracted
  if (jspUrl) {
    try {
      srmLog('INTERNAL_MARKS', `Attempting AJAX navigation to ${jspUrl} (formId=${formId})...`);
      const ajaxRes = await navigateViaAjax(session.client, dashboardHtml, formId, jspUrl);
      if (isInternalMarksHtml(ajaxRes.html)) {
        srmLog('INTERNAL_MARKS', `AJAX navigation succeeded (${ajaxRes.html.length} bytes)`);
        return ajaxRes.html;
      }
    } catch (e: any) {
      srmError('INTERNAL_MARKS', `AJAX navigation to ${jspUrl} failed: ${e.message}`);
    }
  }

  // 2. Try candidate AJAX endpoints with candidate formIds
  const candidateJspUrls = [
    'StudentInternalMarkDetails.jsp',
    '../students/template/StudentInternalMarkDetails.jsp',
    'students/template/StudentInternalMarkDetails.jsp',
    'StudentInternalMarks.jsp',
    'InternalMarkDetails.jsp'
  ];

  const candidateFormIds = Array.from(new Set([formId, 13, 25, 14, 15])).filter(id => id !== 8);

  for (const fId of candidateFormIds) {
    for (const candidateUrl of candidateJspUrls) {
      try {
        const ajaxRes = await navigateViaAjax(session.client, dashboardHtml, fId, candidateUrl);
        if (isInternalMarksHtml(ajaxRes.html)) {
          srmLog('INTERNAL_MARKS', `Candidate AJAX navigation (formId=${fId}, url=${candidateUrl}) succeeded`);
          return ajaxRes.html;
        }
      } catch {}
    }
  }

  // 3. Fallback to HRDSystem.jsp section navigation
  srmLog('INTERNAL_MARKS', `Falling back to navigateToSrmSection for formId=${formId}...`);
  return await navigateToSrmSection(session, formId, 'Internal Mark Details');
}

// --------------------------------------------------------------------
// HELPER: Extract Full Student Data (Profile, Attendance, Marks, Timetable, Calendar, Courses)
// --------------------------------------------------------------------

async function extractFullStudentData(session: HttpSRMSession): Promise<Record<string, any>> {
  srmLog('ALL_DATA', `Starting full extraction for session ${session.netId || 'active'}...`);

  const responseData: Record<string, any> = {
    success: true,
    sources: {
      profile: 'srm_portal',
      courses: 'srm_portal',
      attendance: 'srm_portal',
      marks: 'srm_portal',
      timetable: 'srm_portal',
      academicCalendar: 'srm_portal',
    }
  };

  // 1. Profile Extraction (Merging Dashboard landing page + Personal Details)
  let profileData: any = {};
  let dashboardData: any = null;

  if (session.dashboardHtml) {
    try {
      dashboardData = parseDashboard(session.dashboardHtml);
      srmLog('PROFILE', `Dashboard parsed:`, { name: dashboardData.studentName, regNo: dashboardData.registerNumber });
      if (dashboardData) {
        profileData = {
          name: dashboardData.studentName || null,
          studentId: dashboardData.studentId || null,
          registrationNumber: dashboardData.registerNumber || null,
          registerNumber: dashboardData.registerNumber || null,
          regNo: dashboardData.registerNumber || null,
          email: dashboardData.email || null,
          institution: dashboardData.institution || null,
          campus: dashboardData.institution || null,
          program: dashboardData.program || null,
          semester: dashboardData.semester ? String(dashboardData.semester) : null,
          batch: dashboardData.batch || null,
          section: dashboardData.section || null,
          roomNo: dashboardData.roomNo || null,
          facultyAdvisor: dashboardData.facultyAdvisor || null,
          academicAdvisor: dashboardData.academicAdvisor || null,
          currentStatus: dashboardData.currentStatus || 'Active',
          status: dashboardData.currentStatus || 'Active',
          cgpa: dashboardData.cgpa ? String(dashboardData.cgpa) : null,
          hostelStatus: dashboardData.hostelStatus || null,
        };
      }
    } catch (dashErr: any) {
      srmError('PROFILE', `Dashboard parsing error: ${dashErr.message}`);
    }
  }

  try {
    const personalDetailsHtml = await navigateToSrmSection(session, 17, 'Personal Details');
    const $ = cheerio.load(personalDetailsHtml);
    const data: Record<string, string> = {};

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

    $('dl').each((_, dl) => {
      const dts = $(dl).find('dt');
      const dds = $(dl).find('dd');
      dts.each((i, dt) => {
        const label = $(dt).text().trim().replace(/\s+/g, ' ').replace(/:$/, '');
        const value = $(dds.eq(i)).text().trim().replace(/\s+/g, ' ');
        if (label) data[label] = value;
      });
    });

    const fieldMap: Record<string, string[]> = {
      name: ['Student Name', 'Name', 'Full Name'],
      registrationNumber: ['Register Number', 'Reg No', 'Registration No', 'Student Id', 'Student ID'],
      rollNumber: ['Roll Number', 'Roll No'],
      email: ['Email', 'Email Id', 'Email ID'],
      mobile: ['Mobile', 'Mobile Number', 'Phone', 'Contact No'],
      program: ['Program', 'Programme', 'Degree'],
      department: ['Department', 'Dept', 'Branch', 'Specialization'],
      specialization: ['Specialization', 'Branch'],
      batch: ['Batch', 'Year of Admission'],
      academicYear: ['Academic Year', 'Year'],
      semester: ['Semester', 'Sem'],
      section: ['Section'],
      campus: ['Campus', 'Institution'],
      faculty: ['School', 'Faculty', 'Department'],
      admissionInfo: ['Admission', 'Quota'],
      status: ['Status', 'Student Status', 'Academic Status'],
    };

    for (const [normalized, variants] of Object.entries(fieldMap)) {
      let found: string | null = null;
      for (const variant of variants) {
        const match = Object.entries(data).find(([k]) => k.toLowerCase().includes(variant.toLowerCase()));
        if (match) {
          found = match[1];
          break;
        }
      }
      if (found) {
        profileData[normalized] = found;
      }
    }
    srmLog('PROFILE', `Personal Details merged successfully`, { name: profileData.name, regNo: profileData.registrationNumber });
  } catch (err: any) {
    srmError('PROFILE', `Failed to extract personal details section: ${err.message}`);
  }

  // Ensure aliases and fallbacks for complete profile object
  const netIdClean = (session.netId || '').trim();
  profileData.name = profileData.name || netIdClean || 'Student';
  profileData.registrationNumber = profileData.registrationNumber || profileData.registerNumber || profileData.studentId || netIdClean;
  profileData.registerNumber = profileData.registrationNumber;
  profileData.regNo = profileData.registrationNumber;
  profileData.dept = profileData.dept || profileData.department || profileData.specialization || profileData.program;
  profileData.email = profileData.email || (netIdClean ? `${netIdClean}@srmist.edu.in` : null);

  responseData.profile = profileData;

  // Determine student category (FIRST_YEAR vs SECOND_YEAR_PLUS)
  const semNum = profileData && profileData.semester ? parseInt(String(profileData.semester).replace(/[^0-9]/g, ''), 10) : NaN;
  const isFirstYear = !isNaN(semNum) ? semNum <= 2 : true;
  responseData.studentCategory = isFirstYear ? 'FIRST_YEAR' : 'SECOND_YEAR_PLUS';

  // 2. Attendance Extraction
  let parsedAttendance: any = null;
  try {
    const attHtml = await navigateToSrmSection(session, 9, 'Attendance Details');
    parsedAttendance = parseAttendance(attHtml);
    srmLog('ATTENDANCE', `Extracted ${parsedAttendance.subjects.length} attendance records`);
    responseData.attendance = parsedAttendance.subjects.map((s: any) => ({
      courseCode: s.courseCode,
      courseName: s.courseName,
      courseType: s.courseType,
      faculty: s.faculty,
      classesHeld: s.classesHeld,
      classesAttended: s.classesAttended,
      percentage: s.percentage,
      status: s.status,
      code: s.courseCode,
      title: s.courseName,
      subject: s.courseName,
      attended: s.classesAttended || 0,
      conducted: s.classesHeld || 0,
      absent: Math.max(0, (s.classesHeld || 0) - (s.classesAttended || 0)),
    }));
  } catch (err: any) {
    srmError('ATTENDANCE', `Failed to extract attendance: ${err.message}`);
    responseData.attendance = { status: 'error', data: [], message: err.message || 'Unable to retrieve attendance from Student Portal' };
  }

  // 3. Internal Marks Extraction (exclusively from Internal Mark Details page)
  let internalMarksList: any[] = [];
  try {
    const intHtml = await fetchInternalMarksHtml(session);
    const parsedInternalMarks = parseInternalMarks(intHtml);
    
    if (parsedInternalMarks && parsedInternalMarks.subjects && parsedInternalMarks.subjects.length > 0) {
      internalMarksList = parsedInternalMarks.subjects.map(s => ({
        code: s.courseCode,
        courseCode: s.courseCode,
        title: s.courseName,
        courseName: s.courseName,
        subject: s.courseName,
        courseTitle: s.courseName,
        obtainedMarks: s.obtainedMarks,
        maxMarks: s.maxMarks,
        totalGot: s.obtainedMarks,
        totalMax: s.maxMarks,
        total: s.obtainedMarks,
        performance: (s.obtainedMarks !== null && s.maxMarks !== null) ? `${s.obtainedMarks}/${s.maxMarks}` : 'N/A',
        components: s.components || {},
        status: s.status || 'active',
      }));
    }
    srmLog('INTERNAL_MARKS', `Extracted ${internalMarksList.length} internal mark records from Internal Mark Details page`);
  } catch (err: any) {
    srmError('INTERNAL_MARKS', `Internal Mark Details navigation failed: ${err.message}`);
  }

  responseData.marks = internalMarksList;

  // 3b. Official Grades Extraction (from Grade / Mark & Credit page)
  let gradesList: any[] = [];
  try {
    const links = extractSidebarLinks(session.dashboardHtml || '');
    const gradeLink = links.find(l => ['grade', 'credit'].some(p => l.text.toLowerCase().includes(p)));
    const gradeFormId = gradeLink?.formId || 8;
    const gradeHtml = await navigateToSrmSection(session, gradeFormId, 'Grade / Mark & Credit');
    const parsedGrades = parseGradePage(gradeHtml);
    if (parsedGrades && parsedGrades.courses && parsedGrades.courses.length > 0) {
      gradesList = parsedGrades.courses.map(c => c._raw);
    }
    srmLog('GRADES', `Extracted ${gradesList.length} grade records from Grade / Mark & Credit page`);
  } catch (err: any) {
    srmError('GRADES', `Grade extraction failed: ${err.message}`);
  }

  responseData.grades = gradesList;


  // 4. Timetable Extraction
  let parsedTimetable: any = null;
  try {
    const links = extractSidebarLinks(session.dashboardHtml || '');
    const ttLink = links.find(l => ['timetable', 'time table', 'schedule'].some(p => l.text.toLowerCase().includes(p)));
    const ttFormId = ttLink?.formId || 130;
    const ttHtml = await navigateToSrmSection(session, ttFormId, 'Timetable');
    parsedTimetable = parseTimetable(ttHtml);
    srmLog('TIMETABLE', `Extracted timetable slots`, { entries: parsedTimetable._diagnostics?.entriesExtracted });
    responseData.timetable = parsedTimetable.schedule;
    responseData.schedule = parsedTimetable.schedule;
    responseData.dayNames = parsedTimetable.dayNames;
  } catch (err: any) {
    srmError('TIMETABLE', `Failed to extract timetable: ${err.message}`);
    responseData.timetable = { status: 'error', data: [], message: err.message || 'Unable to retrieve timetable from Student Portal' };
    responseData.schedule = {};
  }

  // 5. Academic Calendar Extraction
  let parsedCalendar: any = null;
  try {
    const links = extractSidebarLinks(session.dashboardHtml || '');
    const calLink = links.find(l => ['calendar', 'academic planner'].some(p => l.text.toLowerCase().includes(p)));
    const calFormId = calLink?.formId || 10;
    const calHtml = await navigateToSrmSection(session, calFormId, 'Academic Calendar');
    parsedCalendar = parseAcademicCalendar(calHtml);
    srmLog('CALENDAR', `Extracted ${parsedCalendar.entries.length} calendar entries`);
    responseData.academicCalendar = parsedCalendar.entries;
    responseData.calendarSummary = parsedCalendar.summary;
  } catch (err: any) {
    srmError('CALENDAR', `Failed to extract academic calendar: ${err.message}`);
    responseData.academicCalendar = { status: 'error', data: [], message: err.message || 'Unable to retrieve academic calendar from Student Portal' };
  }

  // 6. Registered Courses Extraction
  try {
    const courses = extractStudentCourses(parsedAttendance, null, parsedTimetable);
    srmLog('COURSES', `Extracted ${courses.length} courses`);
    responseData.courses = courses;
  } catch (err: any) {
    responseData.courses = { status: 'error', data: [], message: err.message || 'Unable to extract courses' };
  }

  // 7. Hostel Details & Booking Extraction
  try {
    const links = extractSidebarLinks(session.dashboardHtml || '');
    const hostelLinks = links.filter(l => l.text.toLowerCase().includes('hostel'));
    
    const targetFormIds = new Set<number>();
    hostelLinks.forEach(l => { if (l.formId) targetFormIds.add(l.formId); });
    // Standard SRM Hostel formIds
    targetFormIds.add(14); // Hostel Booking
    targetFormIds.add(11); // Hostel Details
    targetFormIds.add(15); // Hostel Willingness / Fee

    let hostelData: any = {};

    if (dashboardData?.hostelRoomDetails) {
      if (dashboardData.hostelRoomDetails.hostelName) hostelData.hostelName = dashboardData.hostelRoomDetails.hostelName;
      if (dashboardData.hostelRoomDetails.roomNo) hostelData.roomNo = dashboardData.hostelRoomDetails.roomNo;
    }

    for (const formId of Array.from(targetFormIds)) {
      try {
        const html = await navigateToSrmSection(session, formId, `Hostel Section (${formId})`);
        
        // 1. Comprehensive parseHostel (handles multi-column allotment tables)
        const parsedHostel = parseHostel(html);
        if (parsedHostel && parsedHostel.hostel) {
          if (parsedHostel.hostel.hostelName && !hostelData.hostelName) {
            hostelData.hostelName = parsedHostel.hostel.hostelName;
          }
          if (parsedHostel.hostel.roomNo && !hostelData.roomNo) {
            hostelData.roomNo = parsedHostel.hostel.roomNo;
          }
          if (parsedHostel.hostel.allotmentDate && !hostelData.allotmentDate) {
            hostelData.allotmentDate = parsedHostel.hostel.allotmentDate;
          }
          if (parsedHostel.hostel.feeAmount && !hostelData.feeAmount) {
            hostelData.feeAmount = String(parsedHostel.hostel.feeAmount);
          }
        }
        
        // Helper to find hostel name from KV map with all key variations
        const getHostelNameFromKv = (kvMap: Record<string, string>): string | null => {
          if (!kvMap) return null;
          for (const [k, v] of Object.entries(kvMap)) {
            const lower = String(k).toLowerCase();
            if (
              (lower.includes('hostel') || lower.includes('block') || lower.includes('hall') || lower.includes('residence')) &&
              !lower.includes('fee') && !lower.includes('date') && !lower.includes('status') && !lower.includes('room') && v
            ) {
              return String(v);
            }
          }
          return null;
        };

        const getRoomNoFromKv = (kvMap: Record<string, string>): string | null => {
          if (!kvMap) return null;
          for (const [k, v] of Object.entries(kvMap)) {
            const lower = String(k).toLowerCase();
            if ((lower.includes('room') || lower.includes('bed')) && v) {
              return String(v);
            }
          }
          return null;
        };

        // 2. parseHostelBookingPage for KV maps
        const bookingParsed = parseHostelBookingPage(html);
        if (bookingParsed?.labelValues) {
          const nameFromBooking = getHostelNameFromKv(bookingParsed.labelValues);
          const roomFromBooking = getRoomNoFromKv(bookingParsed.labelValues);
          if (nameFromBooking && !hostelData.hostelName) hostelData.hostelName = nameFromBooking;
          if (roomFromBooking && !hostelData.roomNo) hostelData.roomNo = roomFromBooking;
          if (bookingParsed.labelValues['Allotment Date'] && !hostelData.allotmentDate) hostelData.allotmentDate = bookingParsed.labelValues['Allotment Date'];
          if (bookingParsed.labelValues['Fee Amount'] && !hostelData.feeAmount) hostelData.feeAmount = bookingParsed.labelValues['Fee Amount'];
        }

        // 3. parseHostelDetailsPage for KV maps
        const detailsParsed = parseHostelDetailsPage(html);
        if (detailsParsed?.labelValues) {
          const nameFromDetails = getHostelNameFromKv(detailsParsed.labelValues);
          const roomFromDetails = getRoomNoFromKv(detailsParsed.labelValues);
          if (nameFromDetails && !hostelData.hostelName) hostelData.hostelName = nameFromDetails;
          if (roomFromDetails && !hostelData.roomNo) hostelData.roomNo = roomFromDetails;
          if (detailsParsed.labelValues['Allotment Date'] && !hostelData.allotmentDate) hostelData.allotmentDate = detailsParsed.labelValues['Allotment Date'];
        }
      } catch (e: any) {
        srmError('HOSTEL', `Hostel formId ${formId} navigation error: ${e.message}`);
      }
    }

    const hostelNameFinal = hostelData.hostelName || null;
    const roomNoFinal = hostelData.roomNo || null;
    const allotmentDateFinal = hostelData.allotmentDate || null;
    const feeAmountFinal = hostelData.feeAmount || null;

    srmLog('HOSTEL', `Extracted hostel details`, { hostelName: hostelNameFinal, roomNo: roomNoFinal });

    hostelData.hostelName = hostelNameFinal;
    hostelData.roomNo = roomNoFinal;
    hostelData.allotmentDate = allotmentDateFinal;
    hostelData.feeAmount = feeAmountFinal;

    hostelData.hostel = {
      hostelName: hostelNameFinal,
      roomNo: roomNoFinal,
      allotmentDate: allotmentDateFinal,
      feeAmount: feeAmountFinal,
    };
    responseData.hostel = hostelData;
  } catch (err: any) {
    srmError('HOSTEL', `Failed to extract hostel info: ${err.message}`);
    responseData.hostel = { status: 'error', data: null, message: err.message || 'Unable to retrieve hostel info from Student Portal' };
  }

  return responseData;
}

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
      loginPageHtml: session.loginPageHtml || '',
    });

    if (result.success) {
      session.state = 'AUTHENTICATED';
      session.authenticated = true;
      session.netId = actualNetId.trim().split('@')[0];

      // Cache the dashboard HTML for navigation
      session.dashboardHtml = result.html;

      console.log(`[AUTH LOGIN] Login successful for session ${sessionId}, extracting full student data...`);
      const fullStudentData = await extractFullStudentData(session);

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

      console.log(`[AUTH LOGIN] Full student data extracted successfully for session ${sessionId}`);
      return res.json({
        success: true,
        authenticated: true,
        sessionId: session.sessionId,
        connectionId: session.sessionId,
        ...fullStudentData,
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
          const captchaBase64 = await fetchCaptchaImage(session.client, loginPage.captchaUrl, loginPage.nonce);

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

app.post('/api/auth/sync', async (req: Request, res: Response) => {
  const sessionId = (req.body && (req.body.sessionId || req.body.connectionId)) || (req.headers['x-session-id'] as string);
  const session = sessionId ? sessionStore.getSession(sessionId) : null;

  if (!session || !session.authenticated) {
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Session expired or not authenticated.' }
    });
  }

  try {
    console.log(`[AUTH SYNC] Syncing full student data for session ${sessionId}...`);
    const fullData = await extractFullStudentData(session);
    return res.json({
      success: true,
      ...fullData
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Sync failed.' });
  }
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

// --------------------------------------------------------------------
// UNIFIED STUDENT DATA & COURSES ROUTES
// --------------------------------------------------------------------

app.get(['/api/student/all', '/portal/all', '/portal/srm/all', '/portal/student/all'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  const data = await extractFullStudentData(session);
  return res.json(data);
});

app.get(['/api/student/courses', '/portal/courses', '/portal/srm/courses'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  srmLog('COURSES', `Extracting courses for session ${session.netId || 'active'}...`);

  try {
    let attendanceData: any = null;
    try {
      const attHtml = await navigateToSrmSection(session, 9, 'Attendance Details');
      attendanceData = parseAttendance(attHtml);
    } catch {}

    let gradeData: any = null;
    try {
      const gradeHtml = await navigateToSrmSection(session, 8, 'Grade / Mark & Credit');
      gradeData = parseGradePage(gradeHtml);
    } catch {}

    const courses = extractStudentCourses(attendanceData, gradeData, null);
    return res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (err: any) {
    return handleExtractionError(err, res);
  }
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

  // Step 1: POST to HRDSystem.jsp to get the shell page for this formId
  let shellHtml = '';
  try {
    const shellResult = await navigateToSection(session.client, html, formId, sectionName);
    shellHtml = shellResult.html;
    // Do NOT overwrite session.dashboardHtml with sub-page HTML so main UserHomePage.jsp stays cached
  } catch (err: any) {
    if (err.message === 'SRM_SESSION_EXPIRED') throw err;
    console.log(`[NAV] Shell navigation failed: ${err.message}`);
    throw err;
  }

  // Step 2: Extract the funShow() JSP URL from the shell page and do the AJAX POST
  // The shell page auto-calls funShow(formId, '../../students/report/someReport.jsp') on load
  const funShowMatch = shellHtml.match(/funShow\(\s*\d+\s*,\s*['"]([^'"]+)['"]/);
  if (funShowMatch) {
    const jspUrl = funShowMatch[1];
    console.log(`[NAV] Found funShow URL: ${jspUrl}, performing AJAX fetch...`);
    try {
      const ajaxResult = await navigateViaAjax(session.client, shellHtml, formId, jspUrl);
      return ajaxResult.html;
    } catch (err: any) {
      if (err.message === 'SRM_SESSION_EXPIRED') throw err;
      console.log(`[NAV] AJAX navigation failed: ${err.message}, falling back to shell HTML`);
    }
  }

  // Fallback: return the shell HTML if no funShow URL found
  return shellHtml;
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

app.get('/api/student/grades', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    // Navigate to Grade/Mark & Credit (formId=8)
    const html = await navigateToSrmSection(session, 8, 'Grade / Mark & Credit');

    if (!html.toLowerCase().includes('grade') && !html.toLowerCase().includes('mark')) {
      throw Object.assign(new Error('WRONG_PAGE'), {
        code: 'WRONG_PAGE',
        message: 'The Grades page was not opened.'
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

app.get('/api/student/marks', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.srmSession!;
  try {
    const html = await fetchInternalMarksHtml(session);

    if (!html.toLowerCase().includes('internal mark') && !html.toLowerCase().includes('internal assessment') && !html.toLowerCase().includes('mark')) {
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
          code: s.courseCode,
          courseCode: s.courseCode,
          title: s.courseName,
          courseName: s.courseName,
          subject: s.courseName,
          courseTitle: s.courseName,
          obtainedMarks: s.obtainedMarks,
          maxMarks: s.maxMarks,
          totalGot: s.obtainedMarks,
          totalMax: s.maxMarks,
          total: s.obtainedMarks,
          performance: (s.obtainedMarks !== null && s.maxMarks !== null) ? `${s.obtainedMarks}/${s.maxMarks}` : 'N/A',
          components: s.components || {},
          status: s.status || 'active',
        })),
        tables: parsed.tables,
        _url: 'Internal Mark Details'
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
    const html = await fetchInternalMarksHtml(session);

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
    const { email: rawEmail, username: rawUsername, password, captcha, cdigest } = req.body || {};
    let username = (rawEmail || rawUsername || '').trim();
    if (username && !username.includes('@')) {
      username = `${username}@srmist.edu.in`;
    }
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'SRM Email ID and password are required.' });
    }

    console.log(`[Academia] Login attempt for: ${username}`);

    const ACADEMIA_BASE = 'https://academia.srmist.edu.in';
    const LOGIN_URL = 'https://academia.srmist.edu.in/accounts/signin.ac';
    const { CookieJar: ToughJar } = require('tough-cookie');
    const jar = new ToughJar();

    const client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': ACADEMIA_BASE,
        'Referer': `${ACADEMIA_BASE}/`,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      },
      maxRedirects: 5,
      validateStatus: (s: number) => s < 500,
    });

    client.interceptors.request.use(async (config: any) => {
      const url = config.url?.startsWith('http') ? config.url : `${ACADEMIA_BASE}${config.url || ''}`;
      const cookieString = await jar.getCookieString(url);
      if (cookieString) config.headers = { ...config.headers, Cookie: cookieString };
      return config;
    });

    client.interceptors.response.use(async (response: any) => {
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        const url = response.config?.url?.startsWith('http') ? response.config.url : `${ACADEMIA_BASE}${response.config?.url || ''}`;
        const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
        for (const c of arr) { try { await jar.setCookie(c, url); } catch {} }
      }
      return response;
    });

    // Step 1: Initial GET to https://academia.srmist.edu.in/ to initialize cookies
    try {
      await client.get(`${ACADEMIA_BASE}/`);
      await client.get(`${ACADEMIA_BASE}/accounts/p/10002227248/signin?hide_fp=true&orgtype=40&service_language=en&css_url=/49910842/academia-academic-services/downloadPortalCustomCss/login&dcc=true`);
    } catch (e: any) {
      console.log(`[Academia] Initial page load warning: ${e?.message}`);
    }

    // Build payload for signin.ac
    const payload = new URLSearchParams();
    payload.append('username', username);
    payload.append('password', password);
    payload.append('client_portal', 'true');
    payload.append('portal', '10002227248');
    payload.append('servicename', 'ZohoCreator');
    payload.append('serviceurl', `${ACADEMIA_BASE}/`);
    payload.append('is_ajax', 'true');
    payload.append('grant_type', 'password');
    payload.append('service_language', 'en');

    if (cdigest) payload.append('cdigest', cdigest);
    if (captcha) payload.append('captcha', captcha);

    const loginResp = await client.post(LOGIN_URL, payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const responseData = typeof loginResp.data === 'object' ? loginResp.data : {};

    // Check for error dict
    if (responseData.error) {
      const errObj = responseData.error;
      const msg = typeof errObj === 'string' ? errObj : (errObj.msg || Object.values(errObj).join('; ') || 'Academia login failed');
      return res.status(401).json({ success: false, message: msg });
    }

    if (responseData.status === 'fail') {
      const code = responseData.code;
      const msg = responseData.message || 'Login failed';
      if (code === 'HIP_REQUIRED' || code === 'HIP_FAILED') {
        const newCdigest = responseData.cdigest;
        return res.status(200).json({
          success: false,
          captchaRequired: true,
          cdigest: newCdigest,
          captchaImage: `https://academia.srmist.edu.in/accounts/p/40-10002227248/webclient/v1/captcha/${newCdigest}?darkmode=false`,
          message: 'CAPTCHA verification required for Academia.'
        });
      }
      return res.status(401).json({ success: false, message: msg });
    }

    // Step 2: Access Token Exchange for JSESSIONID
    if (responseData.data && responseData.data.access_token) {
      const token = responseData.data.access_token;
      const oauthorizeUri = responseData.data.oauthorize_uri;
      const finalAuthUrl = `${oauthorizeUri}&access_token=${token}`;

      console.log(`[Academia] Access token received. Exchanging for JSESSIONID...`);
      await client.get(finalAuthUrl);

      // Fetch Timetable Page
      let timetableHtml = '';
      try {
        const ttResp = await client.get(`${ACADEMIA_BASE}/srm_university/academia-academic-services/page/My_Time_Table_2023_24`);
        timetableHtml = String(ttResp.data);
      } catch (e: any) {
        console.log(`[Academia] Timetable page fetch failed: ${e?.message}`);
      }

      // Fetch Attendance Page
      let attendanceHtml = '';
      try {
        const attResp = await client.get(`${ACADEMIA_BASE}/srm_university/academia-academic-services/page/My_Attendance`);
        attendanceHtml = String(attResp.data);
      } catch (e: any) {
        console.log(`[Academia] Attendance page fetch failed: ${e?.message}`);
      }

      const sessionId = generateSessionId();

      return res.json({
        success: true,
        user: { email: username, name: username.split('@')[0] },
        timetableHtml,
        attendanceHtml,
        sessionId,
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid Academia credentials.' });
  } catch (err: any) {
    console.error(`[Academia] Login error:`, err?.message || err);
    return res.status(503).json({
      success: false,
      message: 'Could not connect to Academia: ' + (err?.message || 'Please try again.'),
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
