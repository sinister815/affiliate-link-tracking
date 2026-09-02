import { checkRedirectChain } from '../src/services/redirectCheck.service.js';
import { ProxyManager } from '../src/services/proxy.service.js';
import { runCheckWithRetry } from '../src/services/runner.service.js'
// Replace with your target campaign link
// const testUrl = 'https://routing-backend-no06.onrender.com/go/tr-2jqtwk';
const testUrl = 'https://routing-backend-no06.onrender.com/go/tr-cgxjxl';
// const testUrl = `http://localhost:5000/go/tr-dihjqs`;

const proxy = [
  '162.214.159.94:3128',
  '3.211.120.181:443',
  '157.90.10.50:80'
]
const proxyManager = new ProxyManager(proxy);

console.log('Starting Network Interception Audit...\n');

runCheckWithRetry(testUrl, proxyManager)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error('Fatal Test Error:', err);
  });
// checkRedirectChain(testUrl, proxyManager)
//   .then((report) => {
//     console.log(JSON.stringify(report, null, 2));
//   })
//   .catch((err) => {
//     console.error('Fatal Test Error:', err);
//   });