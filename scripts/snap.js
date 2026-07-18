import { chromium } from "playwright";

const baseUrl = process.env.PAGE_URL || "https://linhavo.github.io/slovo-dne/?ui=0";

const shots = [
  { file: "wallpaper.png",     width: 393,  height: 852, scale: 3 }, // iPhone (1179×2556)
  { file: "wallpaper-mac.png", width: 1440, height: 900, scale: 2 }, // Mac (2880×1800)
];

const browser = await chromium.launch();
let word = null;

for (const s of shots) {
  const page = await browser.newPage({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.scale,
  });

  // druhý snímek dostane stejné slovo jako první (localStorage se mezi stránkami nesdílí)
  const url = word ? baseUrl + "&w=" + encodeURIComponent(word) : baseUrl;

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("#card:not(.hidden)", { timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600); // doběhnutí animace

  if (!word) word = (await page.textContent("#word")).trim();

  await page.screenshot({ path: s.file });
  await page.close();
  console.log(s.file, "→", word);
}

await browser.close();
