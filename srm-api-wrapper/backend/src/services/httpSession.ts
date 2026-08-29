import { CookieJar } from 'tough-cookie';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://sp.srmist.edu.in';
const PORTAL_BASE = `${BASE_URL}/srmiststudentportal`;
const LOGIN_PAGE_URL = `${PORTAL_BASE}/students/loginManager/youLogin.jsp`;
const LOGIN_ACTION_URL = `${PORTAL_BASE}/LoginServlet`;
const CAPTCHA_SERVLET_URL = `${PORTAL_BASE}/SCaptchaServlet`;
const HRD_SYSTEM_URL = `${PORTAL_BASE}/students/template/HRDSystem.jsp`;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export interface HttpSessionState {
  cookies: string;
  hdnFormId: string;
  hdnFormDetails: string;
  csrfPreventionSalt: string;
  loginPageHtml: string;
  captchaFieldName: string;
  domainFieldName: string;
  randomDelimiter: string;
  challengeId: string;
  captchaToken: string;
  captchaTimestamp: number;
}

export interface HttpPageResult {
  html: string;
  url: string;
  status: number;
}

/**
 * Creates an axios instance with cookie jar support.
 * Each student session gets its own independent cookie jar.
 */
export function createHttpClient(): { client: AxiosInstance; jar: CookieJar } {
  const jar = new CookieJar();

  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    },
    // Do NOT follow redirects automatically — we need to inspect them
    maxRedirects: 0,
    validateStatus: (status) => status < 500, // Accept all non-5xx responses
  });

  // Intercept requests to inject cookies
  client.interceptors.request.use(async (config) => {
    const url = `${config.baseURL || ''}${config.url || ''}`;
    const cookieString = await jar.getCookieString(url);
    if (cookieString) {
      config.headers.set('Cookie', cookieString);
    }
    return config;
  });

  // Intercept responses to capture Set-Cookie headers
  client.interceptors.response.use(async (response) => {
    const setCookies = response.headers['set-cookie'];
    if (setCookies) {
      const url = `${response.config.baseURL || ''}${response.config.url || ''}`;
      const cookieArray = Array.isArray(setCookies) ? setCookies : [setCookies];
      for (const cookieStr of cookieArray) {
        try {
          await jar.setCookie(cookieStr, url);
        } catch (e) {
          // Ignore invalid cookies
        }
      }
    }
    return response;
  });

  return { client, jar };
}

/**
 * Fetches the SRM login page and extracts all required form fields.
 * Returns the HTML and extracted metadata.
 */
export async function fetchLoginPage(client: AxiosInstance): Promise<{
  html: string;
  captchaFieldName: string;
  domainFieldName: string;
  randomDelimiter: string;
  challengeId: string;
  captchaUrl: string;
}> {
  console.log('[HTTP SESSION] Fetching login page...');
  const response = await client.get(LOGIN_PAGE_URL.replace(BASE_URL, ''), {
    headers: {
      'Referer': `${PORTAL_BASE}/`,
    },
    maxRedirects: 10,
  });

  const html = response.data as string;
  const $ = cheerio.load(html);

  // Extract SECURE_CONFIG values
  const scriptContent = $('script').map((_, el) => $(el).html() || '').get().join('\n');

  // Extract captchaFieldName
  const captchaFieldMatch = scriptContent.match(/captchaFieldName\s*[:=]\s*['"]([^'"]+)['"]/);
  const captchaFieldName = captchaFieldMatch ? captchaFieldMatch[1] : 'cptoken';

  // Extract domainFieldName
  const domainFieldMatch = scriptContent.match(/domainFieldName\s*[:=]\s*['"]([^'"]+)['"]/);
  const domainFieldName = domainFieldMatch ? domainFieldMatch[1] : 'dtoken';

  // Extract randomDelimiter
  const delimiterMatch = scriptContent.match(/randomDelimiter\s*[:=]\s*['"]([^'"]+)['"]/);
  const randomDelimiter = delimiterMatch ? delimiterMatch[1] : '';

  // Extract challengeId
  const challengeMatch = html.match(/id="challengeId"\s+value="([^"]+)"/);
  const challengeId = challengeMatch ? challengeMatch[1] : '';

  // Extract CAPTCHA URL from data-src attribute
  const captchaImg = $('img#secure_captcha');
  const dataSrc = captchaImg.attr('data-src') || '';
  const captchaUrl = dataSrc
    ? dataSrc.replace(/&amp;/g, '&')
    : `${CAPTCHA_SERVLET_URL}?ts=${Date.now()}`;

  console.log(`[HTTP SESSION] Login page fetched. captchaField=${captchaFieldName}, domainField=${domainFieldName}`);
  console.log(`[HTTP SESSION] CAPTCHA URL: ${captchaUrl}`);

  return {
    html,
    captchaFieldName,
    domainFieldName,
    randomDelimiter,
    challengeId,
    captchaUrl,
  };
}

/**
 * Fetches the CAPTCHA image from the SRM portal.
 * Returns the image as a base64 data URL.
 */
export async function fetchCaptchaImage(
  client: AxiosInstance,
  captchaUrl: string
): Promise<string> {
  console.log('[HTTP CAPTCHA] Fetching CAPTCHA image...');
  console.log('[HTTP CAPTCHA] Original URL:', captchaUrl);

  // The CAPTCHA URL is already relative (e.g., /srmiststudentportal/SCaptchaServlet?ts=...)
  // Just use it directly with the client (baseURL is BASE_URL)
  const response = await client.get(captchaUrl, {
    responseType: 'arraybuffer',
    headers: {
      'Referer': '/srmiststudentportal/students/loginManager/youLogin.jsp',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });

  console.log(`[HTTP CAPTCHA] Response status: ${response.status}`);
  console.log(`[HTTP CAPTCHA] Response data type: ${typeof response.data}`);
  console.log(`[HTTP CAPTCHA] Response data isBuffer: ${Buffer.isBuffer(response.data)}`);

  const buffer = Buffer.isBuffer(response.data)
    ? response.data
    : Buffer.from(response.data);
  const base64 = buffer.toString('base64');
  const contentType = response.headers['content-type'] || 'image/png';

  console.log(`[HTTP CAPTCHA] CAPTCHA fetched: ${buffer.length} bytes, type: ${contentType}`);

  return `data:${contentType};base64,${base64}`;
}

/**
 * Generates a spoofed telemetry payload compatible with SRM's secure2.js.
 * This replaces the browser-based telemetry injection.
 */
function generateTelemetryPayload(): string {
  const mockData = {
    E: 'sp.srmist.edu.in',
    D: -330, // IST timezone offset
    C: 24,
    B: 24,
    '1o': 1.25,
    '1n': 1,
    '1m': 'Win32',
    '1l': USER_AGENT,
    '1k': 'en-US',
    '1j': 8,
    '1i': 8,
    '2h': false,
    v: false, // webdriver: false
    z: 3 + Math.floor(Math.random() * 4),
    y: 150 + Math.floor(Math.random() * 100),
    x: 25 + Math.floor(Math.random() * 15),
    w: 5000 + Math.floor(Math.random() * 3000),
    u: 'f60f2f2',
  };

  try {
    const str = JSON.stringify(mockData);
    return Buffer.from(str).toString('base64');
  } catch {
    return '';
  }
}

/**
 * Generates a random fingerprint token.
 */
function generateFingerprintToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generates a random fingerprint payload (canvas fingerprint-like).
 */
function generateFingerprintPayload(): string {
  const chars = 'abcdef0123456789';
  return Array.from({ length: 7 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

/**
 * Submits the login form to SRM Student Portal.
 * Uses the same cookies from the login page fetch.
 */
export async function submitLoginHttp(
  client: AxiosInstance,
  params: {
    netId: string;
    password: string;
    captcha: string;
    captchaFieldName: string;
    domainFieldName: string;
    randomDelimiter: string;
    challengeId: string;
  }
): Promise<{ success: boolean; html: string; url: string; error?: string }> {
  const { netId, password, captcha, captchaFieldName, domainFieldName, randomDelimiter, challengeId } = params;

  // Clean the NetID
  const cleanNetId = netId.includes('@') ? netId.split('@')[0] : netId;

  // Build the form data
  const formData = new URLSearchParams();
  formData.append('username', cleanNetId.trim());
  formData.append('password', password);
  formData.append('captcha', captcha.trim());

  // Dynamic token fields (from SECURE_CONFIG)
  formData.append(captchaFieldName, 'true'); // CAPTCHA validation token
  formData.append(domainFieldName, randomDelimiter); // Domain validation token

  // Honeypot field (must be empty)
  const honeypotMatch = (await client.get(LOGIN_PAGE_URL.replace(BASE_URL, ''), { maxRedirects: 10 })).data.match(/name="(ph_[^"]+)"/);
  if (honeypotMatch) {
    formData.append(honeypotMatch[1], '');
  }

  // Fingerprint fields
  formData.append('fpPayload', generateFingerprintPayload());
  formData.append('fpToken', generateFingerprintToken());

  // Challenge ID
  formData.append('challengeId', challengeId);

  // Telemetry payload
  formData.append('telemetryPayload', generateTelemetryPayload());

  console.log('[HTTP AUTH] Submitting login form...');

  const response = await client.post(LOGIN_ACTION_URL.replace(BASE_URL, ''), formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': LOGIN_PAGE_URL.replace(BASE_URL, ''),
      'Origin': BASE_URL,
    },
    maxRedirects: 10,
  });

  const html = response.data as string;
  const finalUrl = response.request?.res?.responseUrl || LOGIN_PAGE_URL.replace(BASE_URL, '');
  const $ = cheerio.load(html);

  // Check for errors
  const hasLoginInputs = html.includes('id="username"') || html.includes('name="username"');
  const hasDashboard = html.includes('studentHomePage.jsp') || html.includes('funSetFormId');
  const hasLogout = $('a[href*="logout"], a[href*="Logout"]').length > 0;

  // Check for specific error messages
  let errorText = '';
  const errorPatterns = [
    'invalid captcha', 'captcha is incorrect',
    'invalid username', 'invalid password', 'login failed',
    'incorrect captcha', 'captcha mismatch', 'wrong captcha'
  ];

  $('div, span, p, font, td').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 2 && text.length < 200) {
      const lower = text.toLowerCase();
      if (errorPatterns.some(p => lower.includes(p))) {
        errorText = text;
      }
    }
  });

  // Also check body text for error patterns
  if (!errorText) {
    const bodyText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const captchaMatch = bodyText.match(/invalid captcha|captcha (is )?incorrect|wrong captcha/i);
    const credMatch = bodyText.match(/invalid (username|password|credentials|netid)|username (or|and) password (is )?incorrect|login failed/i);
    if (captchaMatch) errorText = captchaMatch[0];
    else if (credMatch) errorText = credMatch[0];
  }

  const isSuccess = hasDashboard || hasLogout || (!hasLoginInputs && !errorText);

  console.log(`[HTTP AUTH] Response: success=${isSuccess}, hasLoginInputs=${hasLoginInputs}, hasDashboard=${hasDashboard}`);
  if (errorText) console.log(`[HTTP AUTH] Error: ${errorText}`);

  return {
    success: isSuccess,
    html,
    url: finalUrl,
    error: errorText || undefined,
  };
}

/**
 * Navigates to an SRM portal section using the form submission method.
 * This replaces Playwright's page.evaluate() calls for funSetFormId().
 */
export async function navigateToSection(
  client: AxiosInstance,
  html: string,
  formId: number,
  sectionName: string
): Promise<HttpPageResult> {
  console.log(`[HTTP NAV] Navigating to ${sectionName} (formId=${formId})`);

  const $ = cheerio.load(html);

  // Extract hidden form values
  const hdnFormId = $('#hdnFormId').val() as string || '1';
  const hdnFormDetails = $('#hdnFormDetails').val() as string || '1';
  const csrfPreventionSalt = $('#csrfPreventionSalt').val() as string || '';

  // Build form data for HRDSystem.jsp
  const formData = new URLSearchParams();
  formData.append('hdnFormId', String(formId));
  formData.append('hdnFormDetails', hdnFormDetails);
  formData.append('hdnFormStatus', '0');
  formData.append('csrfPreventionSalt', csrfPreventionSalt);

  const response = await client.post(HRD_SYSTEM_URL.replace(BASE_URL, ''), formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': `${PORTAL_BASE}/students/loginManager/UserHomePage.jsp`,
    },
  });

  const responseHtml = response.data as string;
  const responseUrl = response.request?.res?.responseUrl || HRD_SYSTEM_URL.replace(BASE_URL, '');

  // Check for session expiry
  if (responseUrl.includes('youLogin.jsp') || responseHtml.includes('youLogin.jsp')) {
    throw new Error('SRM_SESSION_EXPIRED');
  }

  console.log(`[HTTP NAV] Navigation complete. URL: ${responseUrl}, HTML: ${responseHtml.length} bytes`);

  return {
    html: responseHtml,
    url: responseUrl,
    status: response.status,
  };
}

/**
 * Navigates to a section using AJAX POST (funShow equivalent).
 * Used when the portal loads content via AJAX into #divMainDetails.
 */
export async function navigateViaAjax(
  client: AxiosInstance,
  html: string,
  formId: number,
  jspUrl: string
): Promise<HttpPageResult> {
  console.log(`[HTTP NAV] AJAX navigation to formId=${formId}, url=${jspUrl}`);

  const $ = cheerio.load(html);

  const hdnFormDetails = $('#hdnFormDetails').val() as string || '1';
  const csrfPreventionSalt = $('#csrfPreventionSalt').val() as string || '';

  // Build AJAX POST data (matches funShow() JavaScript)
  const formData = new URLSearchParams();
  formData.append('iden', String(formId));
  formData.append('filter', '');
  formData.append('hdnFormDetails', hdnFormDetails);
  formData.append('csrfPreventionSalt', csrfPreventionSalt);

  // Resolve relative URL
  let fullUrl = jspUrl;
  if (!jspUrl.startsWith('http')) {
    // Convert relative path to absolute
    fullUrl = jspUrl
      .replace('../../', `${PORTAL_BASE}/`)
      .replace('../', `${PORTAL_BASE}/`);
    if (!fullUrl.startsWith('http')) {
      fullUrl = `${BASE_URL}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
    }
  }

  const relativeUrl = fullUrl.replace(BASE_URL, '');

  const response = await client.post(relativeUrl, formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': `${PORTAL_BASE}/students/template/HRDSystem.jsp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const responseHtml = response.data as string;
  const responseUrl = response.request?.res?.responseUrl || relativeUrl;

  if (responseUrl.includes('youLogin.jsp')) {
    throw new Error('SRM_SESSION_EXPIRED');
  }

  console.log(`[HTTP NAV] AJAX response: ${responseHtml.length} bytes`);

  return {
    html: responseHtml,
    url: responseUrl,
    status: response.status,
  };
}

/**
 * Extracts sidebar links and their formIds from the dashboard HTML.
 */
export function extractSidebarLinks(html: string): Array<{ text: string; formId: number | null }> {
  const $ = cheerio.load(html);
  const links: Array<{ text: string; formId: number | null }> = [];

  $('a[onclick]').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    const onclick = $(el).attr('onclick') || '';

    // Match funSetFormId(N)
    const formIdMatch = onclick.match(/funSetFormId\s*\(\s*(\d+)\s*\)/);
    // Match funShow(N, ...)
    const showMatch = onclick.match(/funShow\s*\(\s*(\d+)/);

    const formId = formIdMatch
      ? parseInt(formIdMatch[1], 10)
      : showMatch
        ? parseInt(showMatch[1], 10)
        : null;

    if (formId !== null && text) {
      links.push({ text, formId });
    }
  });

  return links;
}

/**
 * Extracts hidden form values from HTML.
 */
export function extractFormValues(html: string): {
  hdnFormId: string;
  hdnFormDetails: string;
  csrfPreventionSalt: string;
} {
  const $ = cheerio.load(html);
  return {
    hdnFormId: ($('#hdnFormId').val() as string) || '1',
    hdnFormDetails: ($('#hdnFormDetails').val() as string) || '1',
    csrfPreventionSalt: ($('#csrfPreventionSalt').val() as string) || '',
  };
}

/**
 * Gets the page HTML, checking iframes for content.
 */
export function getHtmlWithIframeFallback(mainHtml: string): string {
  const $ = cheerio.load(mainHtml);

  // Check if main page has meaningful content
  if ($('table').length > 0 || $('#divMainDetails').text().trim().length > 100) {
    return mainHtml;
  }

  // Check for iframe content
  const iframes = $('iframe');
  for (let i = 0; i < iframes.length; i++) {
    const src = $(iframes[i]).attr('src') || '';
    if (src && !src.startsWith('javascript')) {
      // Note: We can't easily fetch cross-origin iframes via HTTP
      // The iframe content is usually loaded via the same session
      console.log(`[HTTP SESSION] Found iframe: ${src}`);
    }
  }

  return mainHtml;
}

export { BASE_URL, PORTAL_BASE, LOGIN_PAGE_URL, HRD_SYSTEM_URL, CAPTCHA_SERVLET_URL };
