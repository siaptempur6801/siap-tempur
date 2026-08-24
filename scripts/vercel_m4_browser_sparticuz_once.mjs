import { randomUUID } from 'node:crypto'
import { chromium as playwrightChromium } from '@playwright/test'
import serverlessChromium from '@sparticuz/chromium'

process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3012'
process.env.M4_BROWSER_QA_LOCAL = '1'
process.env.M4_BROWSER_QA_TOKEN = randomUUID()

const executablePath = await serverlessChromium.executablePath()
const originalLaunch = playwrightChromium.launch.bind(playwrightChromium)

Object.defineProperty(playwrightChromium, 'launch', {
  configurable: true,
  value: (options = {}) => originalLaunch({
    ...options,
    executablePath,
    args: [...serverlessChromium.args, ...(options.args ?? [])],
    headless: true,
  }),
})

await import('./vercel_m4_browser_closure_v2.mjs')
