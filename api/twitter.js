import puppeteer from "puppeteer";

const getTwitterVideo = async (url) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  try {
    await page.goto("https://twitterdownloader.snapsave.app/", { waitUntil: "networkidle2", timeout: 60000 });
    
    await page.waitForSelector('input[type="text"]', { timeout: 30000 });
    await page.type('input[type="text"]', url);
    
    await page.click('#send');
    
    await page.waitForTimeout(8000);
    
    const result = await page.evaluate(() => {
      const links = [];
      
      const downloadElements = document.querySelectorAll('a[href*="rapidcdn.app"], a[href*="download"]');
      
      downloadElements.forEach(element => {
        const href = element.href;
        const quality = element.textContent.trim();
        if (href && quality && href.includes('rapidcdn.app')) {
          links.push({
            quality: quality,
            url: href
          });
        }
      });
      
      let title = 'Twitter Video';
      const titleElement = document.querySelector('h1[itemprop="name"] a, .videotikmate-middle h1, h1');
      if (titleElement && titleElement.textContent.trim()) {
        title = titleElement.textContent.trim();
      }
      
      let thumbnail = null;
      const thumbnailElement = document.querySelector('.videotikmate-left img, img[alt]');
      if (thumbnailElement && thumbnailElement.src) {
        thumbnail = thumbnailElement.src;
      }
      
      return { links, title, thumbnail };
    });
    
    await browser.close();
    
    if (!result.links || result.links.length === 0) {
      return { success: false, error: "No download links found" };
    }
    
    let selectedVideo = null;
    
    const hdVideo = result.links.find(link => 
      link.quality.toLowerCase().includes('hd') || 
      link.quality.toLowerCase().includes('720') ||
      link.quality.toLowerCase().includes('1080')
    );
    
    if (hdVideo) {
      selectedVideo = hdVideo;
    } else {
      selectedVideo = result.links[0];
    }
    
    return {
      success: true,
      video_url: selectedVideo.url,
      title: result.title,
      thumbnail: result.thumbnail,
      quality: selectedVideo.quality,
      available_qualities: result.links
    };
    
  } catch (error) {
    await browser.close();
    return { success: false, error: "Failed to get Twitter video", detail: error.message };
  }
};

export { getTwitterVideo };