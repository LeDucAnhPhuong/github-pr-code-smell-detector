// Screenshot just the #pricing section. Usage: node pricing-shot.mjs [outName]
import { chromium } from "playwright";
const out = process.argv[2] || "pricing";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto("http://localhost:3001", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const el = await page.$("#pricing");
await el.screenshot({ path: `shots/${out}.png` });
await browser.close();
console.log("shot:", out);
