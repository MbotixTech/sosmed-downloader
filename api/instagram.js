import puppeteer from "puppeteer";

export async function getInstagramVideo(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true, 
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://fastdl.app/", { waitUntil: "networkidle2" });

    await page.waitForSelector("#search-form-input");
    await page.type("#search-form-input", url);

    await page.click(".search-form__button");

    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    await page.waitForSelector(".button__download", { timeout: 30000 });

    const videoLink = await page.evaluate(() => {
      const downloadBtn = document.querySelector(".button__download");
      return downloadBtn ? downloadBtn.href : null;
    });

    await browser.close();

    if (!videoLink) {
      return { success: false, error: "Gagal menemukan link download." };
    }

    return { success: true, video_url: videoLink };
  } catch (err) {
    if (browser) await browser.close();
    return { success: false, error: "Instagram scrape failed", detail: err.message };
  }
}
