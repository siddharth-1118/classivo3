export async function fetchWithLoadBalancer(endpoint: string, options: RequestInit = {}) {
  const defaultAcademiaBackend = "https://classivo3.onrender.com";
  const defaultPortalBackend = process.env.PORTAL_BACKEND_URL || "https://classivo-portal-backend-ascdgqevhuf6gqfx.centralindia-01.azurewebsites.net";

  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URLS || "";
  const rawUrls = envUrl.split(",").map((u) => u.trim()).filter(Boolean);

  let urls: string[] = [];

  // Determine if this request is specifically for the SRM Student Portal connector
  const isPortalEndpoint = endpoint.startsWith("/portal") || endpoint.startsWith("/api/portal") || endpoint.startsWith("/api/auth") || endpoint.startsWith("/api/student");

  if (isPortalEndpoint) {
    urls = [defaultPortalBackend, ...rawUrls, defaultAcademiaBackend];
  } else {
    urls = [...rawUrls, defaultAcademiaBackend, defaultPortalBackend];
  }

  // Deduplicate URLs while preserving order
  urls = Array.from(new Set(urls.filter(Boolean)));

  let lastError: any = null;

  for (const baseUrl of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[Proxy] Request to ${baseUrl}${endpoint} timed out after 60s`);
        controller.abort();
      }, 60000);

      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        mode: 'cors',
        headers: {
          ...options.headers,
          "ngrok-skip-browser-warning": "true",
          "bypass-tunnel-reminder": "true",
          "Content-Type": "application/json"
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // If endpoint doesn't exist on this backend (404), try the next server in load balancer list
      if (res.status === 404 && urls.length > 1) {
        console.log(`[Proxy] ${baseUrl}${endpoint} returned 404, trying next server...`);
        lastError = new Error(`Server ${baseUrl} returned 404 for ${endpoint}`);
        continue;
      }

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
      
      lastError = new Error(`Server ${baseUrl} responded with status ${res.status}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError;
}
