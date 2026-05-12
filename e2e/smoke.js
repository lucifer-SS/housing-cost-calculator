/**
 * E2E smoke test — builds the project, starts vite preview, and runs Puppeteer checks.
 * Run with:  npm run test:e2e
 */

import { execSync, spawn } from 'child_process'
import puppeteer from 'puppeteer'

const PORT = 4175
const BASE = `http://localhost:${PORT}`

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function waitForServer(url, retries = 30, delayMs = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await wait(delayMs)
  }
  throw new Error(`Server at ${url} did not become ready`)
}

function pass(msg) { console.log(`  ✓ ${msg}`) }
function fail(msg) { console.error(`  ✗ ${msg}`); process.exitCode = 1 }

async function run() {
  // Build first so preview has up-to-date output
  console.log('\n▶ Building…')
  execSync('npm run build', { stdio: 'inherit' })

  console.log(`\n▶ Starting vite preview on port ${PORT}…`)
  const server = spawn(
    'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )
  server.stderr.on('data', () => {}) // suppress vite startup noise

  try {
    await waitForServer(BASE)
    console.log('  Server ready\n')

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    // ── 1. Page loads ─────────────────────────────────────────────────────
    await page.goto(BASE, { waitUntil: 'networkidle0' })
    const title = await page.title()
    title.includes('Housing Cost Calculator')
      ? pass('Page title: ' + title)
      : fail('Unexpected title: ' + title)

    // ── 2. Logo is visible ────────────────────────────────────────────────
    const logo = await page.$('img[alt="Housing Cost Calculator"]')
    logo ? pass('Logo visible') : fail('Logo not found')

    // ── 3. All input sections present ─────────────────────────────────────
    const sectionTexts = await page.$$eval('.section-label', els => els.map(e => e.textContent.trim()))
    for (const expected of ['Property details', 'Loan details', 'Rent savings']) {
      sectionTexts.some(t => t.includes(expected))
        ? pass(`Section "${expected}" present`)
        : fail(`Section "${expected}" not found`)
    }

    // ── 4. Default values pre-filled ──────────────────────────────────────
    const propertyVal = await page.$eval('input[value="11000000"]', el => el.value).catch(() => null)
    propertyVal === '11000000'
      ? pass('Property value pre-filled')
      : fail('Property value not pre-filled')

    // ── 5. Calculate with defaults → XIRR ~5.92% ──────────────────────────
    await page.click('.calc-btn')
    await page.waitForSelector('.verdict-title', { timeout: 5000 })
    const verdict = await page.$eval('.verdict-title', el => el.textContent)
    verdict.includes('XIRR:')
      ? pass('Verdict rendered: ' + verdict)
      : fail('Verdict missing XIRR: ' + verdict)
    const xirrInRange = verdict.includes('6.')
    xirrInRange
      ? pass('XIRR is in expected 6.x% range')
      : fail('XIRR out of expected range: ' + verdict)

    // ── 6. Net profit row present ─────────────────────────────────────────
    const rkTexts = await page.$$eval('.result-row .rk', els => els.map(e => e.textContent))
    rkTexts.some(t => t.includes('Net profit'))
      ? pass('Net profit row visible')
      : fail('Net profit row not found')

    // ── 7. Benchmark section present ──────────────────────────────────────
    const benchLabels = await page.$$eval('.bench-lbl', els => els.map(e => e.textContent))
    benchLabels.some(t => t.includes('Nifty 50'))
      ? pass('Benchmark section rendered')
      : fail('Benchmark section missing')

    // ── 8. Cash flow ledger present ───────────────────────────────────────
    const tableHeaders = await page.$$eval('.cf-table th', els => els.map(e => e.textContent))
    tableHeaders.includes('Description')
      ? pass('Cash flow ledger table rendered')
      : fail('Cash flow ledger missing')

    // ── 9. Mode toggle: switch to Rate & Tenure ───────────────────────────
    const modeBtns = await page.$$('.mode-btn')
    await modeBtns[1].click() // Rate & Tenure
    await wait(300)
    const emiInputGone = await page.$eval(
      'input[type="number"]',
      // If EMI (75500) input still exists anywhere visible
      () => !document.querySelector('.events-list') || true
    ).catch(() => true)
    // Verify the rate input is now visible
    const rateVisible = await page.$eval('input[value="8.5"]', el => !!el).catch(() => false)
    rateVisible ? pass('Rate & Tenure mode: rate input visible') : fail('Rate input not found after mode switch')

    // ── 10. Add extra expense ──────────────────────────────────────────────
    const rowsBefore = (await page.$$('.event-row')).length
    await page.click('.add-btn')
    await wait(200)
    const rowsAfter = (await page.$$('.event-row')).length
    rowsAfter === rowsBefore + 1
      ? pass(`Add expense: rows ${rowsBefore} → ${rowsAfter}`)
      : fail(`Add expense row count unexpected: ${rowsAfter}`)

    await browser.close()

    const passed = process.exitCode !== 1
    console.log(passed ? '\n✅ All E2E checks passed\n' : '\n❌ Some E2E checks failed\n')
  } finally {
    server.kill()
  }
}

run().catch(e => {
  console.error('Fatal E2E error:', e)
  process.exit(1)
})
