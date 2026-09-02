import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { URL } from 'url';

puppeteer.use(StealthPlugin());

const CLICK_ID_KEYS = ['clickid', 'click_id', 'aff_sub', 'subid', 's1', 'rdtk'];

function findClickId(urlString) {
    try {
        const parsedUrl = new URL(urlString);
        for (const key of CLICK_ID_KEYS) {
            if (parsedUrl.searchParams.has(key)) {
                return parsedUrl.searchParams.get(key);
            }
        }
    } catch (err) {
        // Return null if URL parsing fails
    }
    return null;
}

export async function checkRedirectChain(targetUrl, proxyManager = null) {
    let browser = null;
    const redirectChain = [];
    let detectedClickId = null;
    let stepCounter = 1;
    const proxy = proxyManager ? proxyManager.getProxy() : null;

    try {
        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ];

        if (proxy && proxy.host && proxy.port) {
            launchArgs.push(`--proxy-server=http://${proxy.host}:${proxy.port}`);
        }

        browser = await puppeteer.launch({
            headless: 'new',
            args: launchArgs
        });

        const page = await browser.newPage();

        // 1. Authenticate proxy credentials if present
        if (proxy && proxy.username && proxy.password) {
            await page.authenticate({
                username: proxy.username,
                password: proxy.password
            });
        }

        // 2. Simplified User-Agent configuration
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );

        // 3. Resource blocking for speed optimization
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 4. Capture redirect responses in real-time
        page.on('response', (response) => {
            const status = response.status();
            const url = response.url();
            const headers = response.headers();

            const foundId = findClickId(url);
            if (foundId && !detectedClickId) {
                detectedClickId = foundId;
            }

            if (status >= 300 && status < 400) {
                redirectChain.push({
                    step: stepCounter++,
                    statusCode: status,
                    url: url,
                    targetLocation: headers['location'] || null
                });
            } else if (status === 200 && response.request().isNavigationRequest()) {
                redirectChain.push({
                    step: stepCounter++,
                    statusCode: status,
                    url: url,
                    targetLocation: null
                });
            }
        });

        page.setDefaultNavigationTimeout(20000);

        // 5. Navigate directly through the redirect chain
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        const finalUrl = page.url();

        // Check if Chrome hit an internal proxy or routing crash page
        if (finalUrl.startsWith('chrome-error://')) {
            throw new Error(`Navigation failed: Chrome loaded error page (${finalUrl})`);
        }

        if (proxyManager && proxy) {
            proxyManager.markSuccess(proxy);
        }

        if(redirectChain.length<1){
            return {
            success: false,
            inputUrl: targetUrl,
            // finalUrl: finalUrl,
            redirectCount: redirectChain.length,
            clickIdFound: detectedClickId,
            chain: redirectChain
        };
        }

        return {
            success: true,
            inputUrl: targetUrl,
            finalUrl: finalUrl,
            redirectCount: redirectChain.length,
            clickIdFound: detectedClickId,
            chain: redirectChain
        };

    } catch (error) {
        if (proxyManager && proxy) {
            proxyManager.markFailure(proxy);
        }

        return {
            success: false,
            inputUrl: targetUrl,
            error: error.message,
            chain: redirectChain
        };
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}