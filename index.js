import express from "express";
import { getFacebookVideo } from "./api/facebook.js";
import { getTiktok } from "./api/tiktok.js";
import { getTerabox } from "./api/terabox.js";
import { getInstagramVideo } from "./api/instagram.js";
import { getTwitterVideo } from "./api/twitter.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/facebook", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, error: "Missing URL" });
  }

  try {
    const result = await getFacebookVideo(url);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json({
      success: true,
      video_url: result.video_url,
      title: "Mbotix Downloader"
    });
  } catch (error) {
    console.error("❌ Error di /api/facebook:", error);
    res.status(500).json({ success: false, error: "Internal Server Error", detail: error.message });
  }
});

app.get("/api/tiktok", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "No URL provided." });

  try {
    const result = await getTiktok(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "TikTok error", detail: err.message });
  }
});

app.get("/api/terabox", async (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ error: "No data provided." });

  try {
    const result = await getTerabox(data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Terabox error", detail: err.message });
  }
});

app.get("/api/instagram", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: "Missing URL" });

  const result = await getInstagramVideo(url);
  res.status(result.success ? 200 : 500).json(result);
});

app.get("/api/twitter", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, error: "Missing URL" });
  }

  try {
    const result = await getTwitterVideo(url);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json({
      success: true,
      video_url: result.video_url,
      title: result.title || "Twitter Video",
      quality: result.quality,
      available_qualities: result.available_qualities
    });
  } catch (error) {
    console.error("❌ Error di /api/twitter:", error);
    res.status(500).json({ success: false, error: "Internal Server Error", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
