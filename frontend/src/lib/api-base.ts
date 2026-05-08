const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

function buildNetworkAwareFallback(): string {
  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }
  const protocol = window.location.protocol || "http:";
  const host = window.location.hostname || "localhost";
  return `${protocol}//${host}:3001`;
}

function resolveApiBase(): string {
  const envValue = import.meta.env.VITE_API_URL?.trim();
  const fallbackBase = buildNetworkAwareFallback();

  if (!envValue) {
    return fallbackBase;
  }

  try {
    const parsed = new URL(envValue);
    if (typeof window !== "undefined") {
      const appHost = window.location.hostname || "";
      if (isLoopbackHost(parsed.hostname) && appHost && !isLoopbackHost(appHost)) {
        parsed.hostname = appHost;
      }
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return envValue.replace(/\/$/, "");
  }
}

export const API_BASE_URL = resolveApiBase();
