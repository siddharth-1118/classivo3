export async function fetchWithLoadBalancer(endpoint: string, options: RequestInit = {}) {
  // Read from env variable; fall back to the hardcoded domain if not set
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URLS || "https://nancey-pandemoniacal-candra.ngrok-free.dev";
  const urls = envUrl.split(",").map((u) => u.trim()).filter(Boolean);

  const shuffledUrls = [...urls].sort(() => Math.random() - 0.5);

  let lastError: any = null;

  for (const baseUrl of shuffledUrls) {
    try {
      const controller = new AbortController();
      // Increased timeout to 60 seconds to allow ngrok to warm up
      const timeoutId = setTimeout(() => {
        console.log(`[Proxy] Request to ${baseUrl} timed out after 60s`);
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
