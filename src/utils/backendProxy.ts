export function warmupAcademiaBackend() {
  try {
    const defaultAcademiaBackend = "https://classivo3.onrender.com";
    fetch(`${defaultAcademiaBackend}/`, { mode: "no-cors" }).catch(() => {});
  } catch {}
}

export async function fetchWithLoadBalancer(endpoint: string, options: RequestInit = {}) {
  const defaultAcademiaBackend = "https://classivo3.onrender.com";
  const defaultPortalBackend = process.env.PORTAL_BACKEND_URL || "https://classivo-portal-backend-ascdgqevhuf6gqfx.centralindia-01.azurewebsites.net";

  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URLS || "";
  const rawUrls = envUrl.split(",").map((u) => u.trim()).filter(Boolean);

  // Determine if this request is specifically for the SRM Student Portal connector
  const isPortalEndpoint = endpoint.startsWith("/portal") || endpoint.startsWith("/api/portal") || endpoint.startsWith("/api/auth") || endpoint.startsWith("/api/student");

  let urls: string[] = [];

  if (isPortalEndpoint) {
    // Portal requests hit Azure Student Portal backend
    urls = [defaultPortalBackend, ...rawUrls.filter((u) => u.includes("azurewebsites"))];
  } else {
    // Academia requests MUST hit Academia backend only (Render / local)
    // NEVER fall back to Azure Portal backend which performs Student Portal extraction
    const academiaUrls = rawUrls.filter((u) => !u.includes("azurewebsites.net"));
    urls = [...academiaUrls, defaultAcademiaBackend];
  }

  // Deduplicate URLs while preserving order
  urls = Array.from(new Set(urls.filter(Boolean)));

  let lastError: any = null;

  for (const baseUrl of urls) {
    // Try each candidate URL up to 2 times to handle Render cold starts
    const maxRetries = baseUrl.includes("onrender.com") ? 2 : 1;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutMs = baseUrl.includes("onrender.com") ? 75000 : 45000;
        const timeoutId = setTimeout(() => {
          console.log(`[Proxy] Request to ${baseUrl}${endpoint} timed out after ${timeoutMs / 1000}s (Attempt ${attempt})`);
          controller.abort();
        }, timeoutMs);

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
          break; // move to next URL
        }

        if (res.ok || (res.status >= 400 && res.status < 500)) {
          return res;
        }

        lastError = new Error(`Server ${baseUrl} responded with status ${res.status}`);
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          console.log(`[Proxy] Retrying ${baseUrl}${endpoint} (Attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  throw lastError;
}
