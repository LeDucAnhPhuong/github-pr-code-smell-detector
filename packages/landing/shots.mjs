// Ad-hoc visual harness for the landing page. Not part of the build.
// Usage: node shots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const OUT = "shots";
mkdirSync(OUT, { recursive: true });

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch();

// 1) Full-page UI verification — reduced motion so every section is visible
//    regardless of scroll-reveal state.
for (const [name, viewport] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/full-${name}.png`, fullPage: true });
  await ctx.close();
}

// 2) Hero with motion ON — capture the above-the-fold intro end-state.
{
  const ctx = await browser.newContext({ viewport: viewports.desktop });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600); // let the hero timeline finish
  await page.screenshot({ path: `${OUT}/hero-motion.png` });
  await ctx.close();
}

// 3) Motion ON, scroll the whole page to fire every reveal, then assert no
//    hooked element is left stuck at opacity 0, and screenshot full page.
{
  const ctx = await browser.newContext({ viewport: viewports.desktop });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  const stuck = await page.evaluate(() =>
    [...document.querySelectorAll("[data-hero],[data-reveal],[data-reveal-stagger] > *")]
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length,
  );
  const counts = await page.evaluate(() =>
    [...document.querySelectorAll("[data-count]")].map((el) => el.textContent),
  );
  console.log("stuck-hidden:", stuck, "| counts:", JSON.stringify(counts));
  await page.screenshot({ path: `${OUT}/full-motion-desktop.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
console.log("done");
