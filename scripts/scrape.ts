import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

interface HotelConfig {
  id: string;
  name: string;
  maxfhrId: string;
}

const MONTHS_TO_SCRAPE = 12;
const DATA_DIR = path.join(process.cwd(), "data");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthData {
  day: number;
  price: number | null;
}

async function extractMonthData(page: import("playwright").Page): Promise<MonthData[]> {
  return await page.evaluate(() => {
    const results: { day: number; price: number | null }[] = [];
    const bodyText = document.body.innerText;
    const calStart = bodyText.indexOf("Sunday");
    if (calStart === -1) return results;
    const afterHeaders = bodyText.indexOf("Saturday", calStart);
    if (afterHeaders === -1) return results;
    const calEnd = bodyText.indexOf("Disclaimer", afterHeaders);
    const calText = calEnd > -1
      ? bodyText.substring(afterHeaders + "Saturday".length, calEnd)
      : bodyText.substring(afterHeaders + "Saturday".length, afterHeaders + 5000);

    const lines = calText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const dayNum = parseInt(line);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        let price: number | null = null;
        let found = false;
        for (let j = 1; j <= 3 && i + j < lines.length; j++) {
          const nextLine = lines[i + j];
          if (nextLine === "Not Available" || nextLine.startsWith("Not")) {
            price = null;
            found = true;
            break;
          }
          const priceNum = parseInt(nextLine.replace(/,/g, ""));
          if (!isNaN(priceNum) && priceNum >= 50 && priceNum <= 99999) {
            price = priceNum;
            found = true;
            break;
          }
        }
        if (found || dayNum <= 31) {
          results.push({ day: dayNum, price: found ? price : null });
        }
      }
      i++;
    }
    const seen = new Map<number, { day: number; price: number | null }>();
    for (const item of results) {
      const existing = seen.get(item.day);
      if (!existing || (existing.price === null && item.price !== null)) {
        seen.set(item.day, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.day - b.day);
  });
}

async function scrapeHotel(hotelConfig: HotelConfig): Promise<Record<string, number | null>> {
  console.log(`\n--- Scraping: ${hotelConfig.name} (ID: ${hotelConfig.maxfhrId}) ---`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Block ads to speed up loading
  await page.route("**/*doubleclick*", (route) => route.abort());
  await page.route("**/*googlesyndication*", (route) => route.abort());
  await page.route("**/*google-analytics*", (route) => route.abort());
  await page.route("**/*criteo*", (route) => route.abort());
  await page.route("**/*adnxs*", (route) => route.abort());
  await page.route("**/*sharethrough*", (route) => route.abort());
  await page.route("**/*pub.network*", (route) => route.abort());
  await page.route("**/*ad-delivery*", (route) => route.abort());
  await page.route("**/*lijit*", (route) => route.abort());
  await page.route("**/*bidswitch*", (route) => route.abort());
  await page.route("**/*turn.com*", (route) => route.abort());

  const rates: Record<string, number | null> = {};

  try {
    await page.goto(`https://www.maxfhr.com/hotel/${hotelConfig.maxfhrId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for the calendar to actually render — look for "Sunday" in body text
    // (instead of a fixed timeout that may be too short on slow runners)
    const calendarLoaded = await page
      .waitForFunction(() => {
        const text = document.body.innerText;
        return text.includes("Sunday") && text.includes("Saturday") && text.length > 500;
      }, { timeout: 30000 })
      .then(() => true)
      .catch(() => false);

    if (!calendarLoaded) {
      console.log(`  ⚠️ Calendar did not render. Page text length: ${(await page.evaluate(() => document.body.innerText.length))}`);
      const sample = await page.evaluate(() => document.body.innerText.substring(0, 400));
      console.log(`  Page text sample: ${sample.replace(/\n/g, " | ")}`);
      throw new Error("Calendar failed to render");
    }

    // Extra time for React to fully hydrate
    await page.waitForTimeout(3000);

    const now = new Date();
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();

    for (let m = 0; m < MONTHS_TO_SCRAPE; m++) {
      const monthName = MONTH_NAMES[currentMonth];
      console.log(`  Scraping ${monthName} ${currentYear}...`);

      // Try extraction up to 3 times with increasing waits
      let monthData: MonthData[] = [];
      for (let attempt = 1; attempt <= 3; attempt++) {
        monthData = await extractMonthData(page);
        if (monthData.length > 0) break;
        console.log(`    Attempt ${attempt}: got 0 days, retrying after ${attempt * 2}s...`);
        await page.waitForTimeout(attempt * 2000);
      }

      for (const { day, price } of monthData) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        rates[dateStr] = price;
      }

      console.log(`    Found ${monthData.length} days, ${monthData.filter((d) => d.price !== null).length} with prices`);

      if (m < MONTHS_TO_SCRAPE - 1) {
        const nextClicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          for (const btn of buttons) {
            const label = btn.getAttribute("aria-label") || "";
            const text = btn.textContent?.trim() || "";
            if (label === "Next Month" || text === ">" || label.toLowerCase().includes("next")) {
              if (!(btn as HTMLButtonElement).disabled) {
                (btn as HTMLButtonElement).click();
                return true;
              }
            }
          }
          return false;
        });

        if (!nextClicked) {
          console.log("    Could not find/click Next Month button, stopping.");
          break;
        }

        // Wait longer between month transitions on slow runners
        await page.waitForTimeout(3000);

        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
    }
  } catch (error) {
    console.error(`  ❌ Error scraping ${hotelConfig.name}:`, error instanceof Error ? error.message : error);
  } finally {
    await browser.close();
  }

  return rates;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const hotelsPath = path.join(DATA_DIR, "hotels.json");
  if (!fs.existsSync(hotelsPath)) {
    console.error("No hotels.json found in data/");
    process.exit(1);
  }

  const hotels: HotelConfig[] = JSON.parse(fs.readFileSync(hotelsPath, "utf-8"));
  console.log(`Found ${hotels.length} hotels to scrape`);

  let totalSaved = 0;
  let totalSkipped = 0;

  for (const hotel of hotels) {
    const filePath = path.join(DATA_DIR, `${hotel.id}.json`);
    const rates = await scrapeHotel(hotel);
    const pricesCount = Object.values(rates).filter((v) => v !== null).length;

    // SAFETY GUARD: Don't overwrite existing data with empty/bad scrape results.
    // Many hotels legitimately have no upcoming data (e.g. Sensei Lana'i is always empty),
    // but for those we'd still have 0 prices. The key difference: a successful scrape
    // returns 365+ dates total (even if all null), a failed one returns nothing.
    const datesCount = Object.keys(rates).length;
    const MIN_DATES_THRESHOLD = 30;

    if (datesCount < MIN_DATES_THRESHOLD && fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const existingDates = Object.keys(existing.rates || {}).length;
      if (existingDates > MIN_DATES_THRESHOLD) {
        console.log(`  ⚠️ Skipping write: scrape returned only ${datesCount} dates (existing has ${existingDates}). Keeping existing data.`);
        totalSkipped++;
        continue;
      }
    }

    const output = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      lastUpdated: new Date().toISOString(),
      rates,
    };

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log(`  ✓ Saved ${datesCount} dates (${pricesCount} with prices) to ${filePath}`);
    totalSaved++;
  }

  console.log(`\nDone! Saved: ${totalSaved}, Skipped (kept existing): ${totalSkipped}`);

  // Fail the workflow if too many hotels failed
  if (totalSkipped > hotels.length / 2) {
    console.error(`\n❌ Too many failed scrapes (${totalSkipped}/${hotels.length}). Failing workflow.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
