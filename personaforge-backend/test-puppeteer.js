import puppeteer from 'puppeteer';
import * as http from 'http';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('request', request => {
    if (request.url().includes('/forge') && request.method() === 'POST') {
      console.log('Intercepted /forge POST:', request.postData());
    }
  });

  await page.goto('http://localhost:3000/sandbox');
  
  // Wait to see if the initial render sends the request
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
