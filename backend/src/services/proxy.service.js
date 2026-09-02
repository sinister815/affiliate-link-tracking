import dotenv from "dotenv"
dotenv.config({
  path:".env"
})
export class ProxyManager {
  constructor(proxyStrings = [], maxFailures = 3) {
    // Parse strings into structured proxy objects
    this.proxies = proxyStrings.map((str) => {
      const [host, port, username, password] = str.trim().split(':');
      return {
        host,
        port,
        username: username || null,
        password: password || null,
        fails: 0,
        isHealthy: true
      };
    });
    this.currentIndex = 0;
    this.maxFailures = maxFailures;
  }

  // Pick the next healthy proxy (Round-Robin)
  getProxy() {
    const healthyPool = this.proxies.filter((p) => p.isHealthy);
    
    // If all proxies dead, fallback to direct server IP
    if (healthyPool.length === 0) return null;

    const proxy = healthyPool[this.currentIndex % healthyPool.length];
    this.currentIndex++;
    return proxy;
  }

  // Reset failure count on successful execution
  markSuccess(proxy) {
    if (!proxy) return;
    proxy.fails = 0;
  }

   // Increment failure count and quarantine if limit reached
  markFailure(proxy) {
    if (!proxy) return;
    proxy.fails += 1;
    if (proxy.fails >= this.maxFailures) {
      proxy.isHealthy = false;
      console.warn(`[ProxyManager] Proxy ${proxy.host}:${proxy.port} disabled due to failures.`);
    }
  }
}

// Shared singleton built from the PROXIES env var (comma-separated "host:port"
// or "host:port:user:pass"). Imported by the inline audit controller so a live
// Redis/queue is no longer required to run audits.
export const proxyManager = new ProxyManager(
  process.env.PROXIES ? process.env.PROXIES.split(',') : []
);