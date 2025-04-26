import puppeteer from "puppeteer";

export async function getFacebookVideo(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://snapsave.app/facebook-reels-download", { waitUntil: "networkidle2" });

    await page.waitForSelector("#url");
    await page.type("#url", url);

    await page.click('button[type="submit"]');

    await page.waitForSelector(".button.is-success.is-small", { timeout: 30000 });

    const videoLink = await page.evaluate(() => {
      const link = document.querySelector('.button.is-success.is-small');
      return link ? link.href : null;
    });

    await browser.close();

    if (!videoLink) {
      return { success: false, error: "Tidak ada video link ditemukan." };
    }

    return { success: true, video_url: videoLink, title: "Tanpa Judul" };
  } catch (err) {
    if (browser) await browser.close();
    return { success: false, error: "SnapSave scrape failed", detail: err.message };
  }
}
