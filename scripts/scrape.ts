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

async function scrapeHotel(hotelConfig: HotelConfig) {
  console.log(`\n--- Scraping: ${hotelConfig.name} (ID: ${hotelConfig.maxfhrId}) ---`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Block ads and tracking to speed up loading
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
  let hotelName = hotelConfig.name;

  try {
    await page.goto(`https://www.maxfhr.com/hotel/${hotelConfig.maxfhrId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for React app to hydrate and calendar to render
    await page.waitForTimeout(6000);

    // Determine the current month/year displayed
    const now = new Date();
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();

    for (let m = 0; m < MONTHS_TO_SCRAPE; m++) {
      const monthName = MONTH_NAMES[currentMonth];
      console.log(`  Scraping ${monthName} ${currentYear}...`);

      // Use a robust extraction: get full page text, then parse the calendar section
      const monthData = await page.evaluate((expectedMonth: string) => {
        const results: { day: number; price: number | null }[] = [];

        // Strategy: Find all elements that look like calendar day cells
        // Each cell typically has: day number, and either a price or "Not Available"
        // The cells are in a grid pattern after "Sunday Monday Tuesday..."

        // Get the full body text to find the calendar section
        const bodyText = document.body.innerText;

        // Find the calendar section - starts after "Sunday" header row
        const calStart = bodyText.indexOf("Sunday");
        if (calStart === -1) return results;

        // Find the section between "Saturday" (end of headers) and "Disclaimer"
        const afterHeaders = bodyText.indexOf("Saturday", calStart);
        if (afterHeaders === -1) return results;

        const calEnd = bodyText.indexOf("Disclaimer", afterHeaders);
        const calText = calEnd > -1
          ? bodyText.substring(afterHeaders + "Saturday".length, calEnd)
          : bodyText.substring(afterHeaders + "Saturday".length, afterHeaders + 5000);

        // Parse the calendar text line by line
        const lines = calText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);

        let i = 0;
        while (i < lines.length) {
          const line = lines[i];

          // Check if this line is a day number (1-31)
          const dayNum = parseInt(line);
          if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
            // Look at the next few lines for price or "Not Available"
            let price: number | null = null;
            let found = false;

            for (let j = 1; j <= 3 && i + j < lines.length; j++) {
              const nextLine = lines[i + j];
              if (nextLine === "Not Available" || nextLine.startsWith("Not")) {
                price = null;
                found = true;
                break;
              }
              // Check if it's a price (3-5 digit number)
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
            i++;
          } else {
            i++;
          }
        }

        // Deduplicate: if we got duplicate day numbers, keep the one with a price
        const seen = new Map<number, { day: number; price: number | null }>();
        for (const item of results) {
          const existing = seen.get(item.day);
          if (!existing || (existing.price === null && item.price !== null)) {
            seen.set(item.day, item);
          }
        }

        return Array.from(seen.values()).sort((a, b) => a.day - b.day);
      }, monthName);

      // Store the rates
      for (const { day, price } of monthData) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        rates[dateStr] = price;
      }

      console.log(`    Found ${monthData.length} days, ${monthData.filter((d) => d.price !== null).length} with prices`);

      // Navigate to next month
      if (m < MONTHS_TO_SCRAPE - 1) {
        // Try multiple selectors for the next month button
        const nextClicked = await page.evaluate(() => {
          // Look for ">" or "Next Month" button
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

        await page.waitForTimeout(2000);

        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
    }
  } catch (error) {
    console.error(`  Error scraping ${hotelConfig.name}:`, error);
  } finally {
    await browser.close();
  }

  // Write data - use the config name (more reliable than scraping the page title)
  const output = {
    hotelId: hotelConfig.id,
    hotelName: hotelConfig.name,
    lastUpdated: new Date().toISOString(),
    rates,
  };

  const filePath = path.join(DATA_DIR, `${hotelConfig.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`  Saved ${Object.keys(rates).length} dates to ${filePath}`);
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

  for (const hotel of hotels) {
    await scrapeHotel(hotel);
  }

  console.log("\nDone!");
}

main().catch(console.error);
