import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

export type ScrapeOpts = { headless?: boolean; maxPages?: number; maxJobs?: number; totalTimeoutMs?: number };

export async function scrapeJora(urls: string[], opts: ScrapeOpts) {
  const headless = opts.headless !== false;
  const browser = await chromium.launch({ headless });
  try {
    const page = await browser.newPage({
      userAgent: randomUA(),
      viewport: { width: 1366, height: 900 },
    });
    const deadline = typeof opts.totalTimeoutMs === 'number' ? Date.now() + opts.totalTimeoutMs : null;

    // speed up by blocking heavy resources
    await page.route('**/*', (route) => {
      const r = route.request();
      const type = r.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        return route.abort();
      }
      route.continue();
    });

    const jobs = new Map<string, any>();
    // tracking for timeout logging
    let pagesVisited = 0;
    let detailsVisited = 0;
    let __timeoutLogged = false;
    const logTimeoutOnce = () => {
      if (__timeoutLogged) return;
      __timeoutLogged = true;
      console.warn(JSON.stringify({
        level: 'warn',
        msg: 'scrape aborted due to total timeout',
        pagesVisited,
        jobsSoFar: jobs.size,
        detailsVisited,
      }));
    };

    for (const startUrl of urls) {
      let url: string | null = startUrl;
      let pageCount = 0;
      while (url && pageCount < (opts.maxPages ?? 3) && jobs.size < (opts.maxJobs ?? 40)) {
        if (deadline && Date.now() >= deadline) { logTimeoutOnce(); url = null; break; }
        const gotoTimeout = deadline ? Math.max(1, Math.min(45_000, deadline - Date.now())) : 45_000;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: gotoTimeout });
        const sleepMs = 800 + Math.random()*400;
        if (deadline) {
          const left = deadline - Date.now();
          if (left <= 0) { logTimeoutOnce(); url = null; break; }
          await page.waitForTimeout(Math.min(sleepMs, left));
        } else {
          await page.waitForTimeout(sleepMs);
        }
        const html = await page.content();
        const $ = cheerio.load(html);

        // Adjust selectors if Jora changes structure
        $('[data-automation="job-card"], .job-card, article').each((_, el) => {
          const titleEl = $(el).find('a[href*="/job/"], a[data-automation="job-title"]');
          const href = titleEl.attr('href');
          const title = titleEl.text().trim();
          const company = $(el).find('[data-automation="job-company"], .job-company').text().trim();
          const location = $(el).find('[data-automation="job-location"], .job-location').text().trim();
          const listedAgo = $(el).find('[datetime], time').text().trim();
          const snippet = $(el)
            .find('[data-automation="job-snippet"], [data-automation="job-description"], .job-snippet, .job-card__body, .job-card__content')
            .text()
            .trim();
          if (!href || !title) return;
          // url is guaranteed truthy by the while guard; narrow for TS inside this callback
          const fullUrl = new URL(href, url!).toString();
          const u = new URL(fullUrl);
          const id = `${u.host}${u.pathname}`.toLowerCase().replace(/\/+$/, '');
          if (!jobs.has(id)) jobs.set(id, { id, title, company, location, url: fullUrl, listedAgo, description: snippet || undefined });
        });

        // pagination: look for "Next" link
        const nextHref = $('a[aria-label="Next"], a[rel="next"], a:contains("Next")').attr('href');
        url = nextHref ? new URL(nextHref, url).toString() : null;
        pageCount++;
        pagesVisited++;
      }
    }

    // Fetch descriptions (detail pages), light throttle
    const all = Array.from(jobs.values());

    // limit concurrency to avoid hammering
    const limit = pLimit(3);
    const withDesc = await Promise.all(all.map(j => limit(async () => {
      if (deadline && Date.now() >= deadline) { logTimeoutOnce(); return j; }
      try {
        const gotoTimeout = deadline ? Math.max(1, Math.min(45_000, deadline - Date.now())) : 45_000;
        detailsVisited++;
        const detailPage = await browser.newPage({
          userAgent: randomUA(),
          viewport: { width: 1366, height: 900 },
        });
        await detailPage.route('**/*', (route) => {
          const r = route.request();
          const type = r.resourceType();
          if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
            return route.abort();
          }
          route.continue();
        });
        await detailPage.goto(j.url, { waitUntil: 'domcontentloaded', timeout: gotoTimeout });
        const sleepMs = 700 + Math.random()*400;
        if (deadline) {
          const left = deadline - Date.now();
          if (left <= 0) { logTimeoutOnce(); await detailPage.close(); return j; }
          await detailPage.waitForTimeout(Math.min(sleepMs, left));
        } else {
          await detailPage.waitForTimeout(sleepMs);
        }
        // Try to wait for a likely description container to render
        try {
          const waitLeft = deadline ? Math.max(1, Math.min(4000, deadline - Date.now())) : 4000;
          await detailPage.waitForSelector('[data-automation="jobAdDetails"], .jobdesc, [class*="job-description"], article', { timeout: waitLeft });
        } catch {}
        const html = await detailPage.content();
        const $ = cheerio.load(html);
        let desc = $('[data-automation="jobAdDetails"], .jobdesc, [class*="job-description"]').text().trim();
        if (!desc) desc = $('article').text().trim();
        if (!desc) desc = $('main').text().trim();
        j.description = desc || j.description || '';
        await detailPage.close();
      } catch {
        // ignore
      }
      return j;
    })));

    return withDesc;
  } finally {
    await browser.close();
  }
}

function randomUA() {
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
  ];
  return uas[Math.floor(Math.random()*uas.length)];
}
