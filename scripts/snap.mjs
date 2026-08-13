import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// snap.mjs runs in a fresh CI browser every night with no localStorage of its own,
// so the no-repeat guard in index.html can't remember anything on its own — we read
// the repo's word history here and hand it to the page as `exclude`, then append
// today's word back so the workflow can commit the updated file.
const HISTORY_PATH = path.join(__dirname, "..", "word-history.json");
const HISTORY_WINDOW = 90; // kolik posledních slov se vylučuje z losování
const HISTORY_KEEP = 365;  // kolik slov se uchovává v souboru

const history = existsSync(HISTORY_PATH) ? JSON.parse(readFileSync(HISTORY_PATH, "utf8")) : [];
const excludeParam = history.slice(-HISTORY_WINDOW).join(",");

const baseUrl = process.env.PAGE_URL || "https://linhavo.github.io/slovo-dne/?ui=0";
// a word pinned via w= in PAGE_URL bypassed the draw entirely — it doesn't belong
// in the history (and isn't sanitized, so a comma in it would corrupt the exclude list)
const wordWasForced = /[?&]w=/.test(baseUrl);

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
  else if (excludeParam) url += "&exclude=" + encodeURIComponent(excludeParam);

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

if (word && !wordWasForced && history[history.length - 1] !== word) {
  history.push(word);
  while (history.length > HISTORY_KEEP) history.shift();
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
  console.log("word-history.json →", history.length, "slov");
}
