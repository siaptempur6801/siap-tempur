import { randomUUID } from 'node:crypto'
import { chromium as playwrightChromium } from '@playwright/test'
import serverlessChromium from '@sparticuz/chromium'

// One-shot Vercel Preview browser harness. Removed after M4 closure proof.
process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3012'
process.env.M4_BROWSER_QA_LOCAL = '1'
process.env.M4_BROWSER_QA_TOKEN = randomUUID()

const executablePath = await serverlessChromium.executablePath()
const originalLaunch = playwrightChromium.launch.bind(playwrightChromium)

Object.defineProperty(playwrightChromium, 'launch', {
  configurable: true,
  value: async (options = {}) => {
    const browser = await originalLaunch({
      ...options,
      executablePath,
      args: [...serverlessChromium.args, ...(options.args ?? [])],
      headless: true,
    })

    // Sparticuz runs Chromium in single-process mode. Closing an individual
    // BrowserContext can terminate that shared process, so defer context
    // disposal until the harness performs its final browser.close().
    const originalNewContext = browser.newContext.bind(browser)
    Object.defineProperty(browser, 'newContext', {
      configurable: true,
      value: async (...args) => {
        const context = await originalNewContext(...args)
        Object.defineProperty(context, 'close', {
          configurable: true,
          value: async () => undefined,
        })
        return context
      },
    })

    return browser
  },
})

await import('./vercel_m4_browser_closure_v2.mjs')
