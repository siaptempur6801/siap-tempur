import { chromium as playwrightChromium } from '@playwright/test'
import serverlessChromium from '@sparticuz/chromium'

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

await import('./vercel_m4_browser_once.mjs')
