import { chromium } from "playwright";

const baseUrl = process.env.PAGE_URL || "https://linhavo.github.io/slovo-dne/?ui=0";

// iPhone 1179×2556, Mac 2880×1800 — světlá i tmavá varianta, vždy stejné slovo
const shots = [
  { file: "wallpaper-light.png",     width: 393,  height: 852, scale: 3, mode: "light" },
  { file: "wallpaper-dark.png",      width: 393,  height: 852, scale: 3, mode: "dark"  },
  { file: "wallpaper-mac-light.png", width: 1440, height: 900, scale: 2, mode: "light" },
  { file: "wallpaper-mac-dark.png",  width: 1440, height: 900, scale: 2, mode: "dark"  },
];

const browser = await chromium.launch();
let word = null;

for (const s of shots) {
  const page = await browser.newPage({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.scale,
  });

  let url = baseUrl + "&mode=" + s.mode;
  if (word) url += "&w=" + encodeURIComponent(word);

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("#card:not(.hidden)", { timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  if (!word) word = (await page.textContent("#word")).trim();

  await page.screenshot({ path: s.file });
  await page.close();
  console.log(s.file, "→", word);
}

await browser.close();
