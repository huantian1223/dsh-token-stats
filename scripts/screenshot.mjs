// Capture docs/screenshot.png from the live standalone stats page using the
// local Chrome (puppeteer-core, no bundled browser). Waits for the network to
// idle so the fetched stats have rendered before the shot.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'

const CHROME =
  process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe'

const url = process.env.TOKEN_STATS_URL || 'http://127.0.0.1:3080/token-stats'
const out = fileURLToPath(new URL('../docs/screenshot.png', import.meta.url))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--disable-gpu'],
})
try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warn') console.log('CONSOLE', m.type() + ':', m.text())
  })
  await page.setViewport({ width: 1200, height: 1700 })
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  // extra settle time for rendering + the 15s poll's first tick
  await new Promise((r) => setTimeout(r, 2000))
  const probe = await page.evaluate(async () => {
    try {
      const r = await fetch('/token-stats/api/stats', { cache: 'no-store' })
      return { status: r.status, ok: r.ok, head: (await r.text()).slice(0, 80) }
    } catch (e) {
      return { error: String(e) }
    }
  })
  console.log('fetch probe:', JSON.stringify(probe))
  await page.screenshot({ path: out })
  const text = await page.evaluate(() => document.body.innerText.slice(0, 400))
  console.log('captured:', out)
  console.log('page text head:', JSON.stringify(text.slice(0, 120)))
} finally {
  await browser.close()
}
