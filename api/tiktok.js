import axios from "axios";

export async function getTiktok(url) {
  const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
  const data = res.data?.data;

  if (!data) throw new Error("Invalid TikTok response");

  return {
    title: data.title,
    author: data.author.nickname,
    video_url: data.play
  };
}
