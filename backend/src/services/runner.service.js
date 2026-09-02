import { checkRedirectChain } from './redirectCheck.service.js';

/**
 * Runs an check with automatic proxy retries
   targetUrl - The campaign URL to check
   proxyManager - Active proxy manager instance
   maxRetries - Max attempts before declaring the link dead
 */

export async function runCheckWithRetry(targetUrl, proxyManager = null, maxRetries = 3) {
  let lastError = null;
  let lastChain = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[check] Attempt ${attempt}/${maxRetries} for: ${targetUrl}`);

    const result = await checkRedirectChain(targetUrl, proxyManager);

    // If navigation succeeded, return immediately
    if (result.success) {
      console.log(`[check] Success on attempt ${attempt}`);
      return result;
    }

    console.warn(`[check] Attempt ${attempt} failed: ${result.error}. Retrying...`);
    lastError = result.error;
    lastChain = result.chain || [];

    // Brief delay before retrying (next attempt may pick a different proxy)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // If we were routing through proxies and every attempt failed, retry once
  // directly (no proxy) in case the configured proxies are dead/unreachable
  // but the target itself is reachable.
  if (proxyManager) {
    console.warn(`[check] Proxy attempts exhausted for ${targetUrl}; retrying directly.`);
    const direct = await checkRedirectChain(targetUrl, null);
    if (direct.success) {
      console.log(`[check] Success on direct attempt for ${targetUrl}`);
      return direct;
    }
    lastError = `${lastError}; direct: ${direct.error}`;
    lastChain = direct.chain || [];
  }

  return {
    success: false,
    inputUrl: targetUrl,
    error: `Failed after ${maxRetries} proxy attempt(s)`,
    chain: lastChain
  };
}