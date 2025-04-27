# 🚀 Sosmed Downloader Bot

**Sosmed Downloader** is a powerful Telegram bot built with Node.js and Puppeteer that allows users to download videos easily from multiple social media platforms:
- TikTok
- Facebook
- Instagram
- Terabox

🎯 Just send a link – the bot will automatically fetch and send the video back to you!

---

<p align="center">
  <img src="https://img.shields.io/github/license/MbotixTech/sosmed-downloader?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/stars/MbotixTech/sosmed-downloader?style=flat-square" alt="Stars">
  <img src="https://img.shields.io/github/forks/MbotixTech/sosmed-downloader?style=flat-square" alt="Forks">
</p>

---

## ✨ Features
- Download TikTok videos without watermark.
- Download Facebook Reels and video posts.
- Download Instagram Reels, Posts, and Stories.
- Download large files from Terabox.
- Fast, lightweight, and fully automated.
- **Admin Broadcast System**:
  - Support sending text, photo, video broadcasts to all users.
  - Auto-detect and create link buttons from text.
  - Full text formatting supported (bold, italic, underline, spoiler, etc).
  - Auto-remove text-links from body if converted into buttons.
  - Broadcast report (success/failure) and auto-delete report after 5 minutes.
  - Admins are excluded from receiving broadcast messages.

---

## ⚙️ Tech Stack
- **Node.js** – JavaScript Runtime
- **Telegraf.js** – Telegram Bot Framework
- **Puppeteer** – Chrome Headless Automation
- **Express.js** – Lightweight API server
- **Axios** – HTTP client
- **PM2** – Process Manager for production

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/MbotixTech/sosmed-downloader.git

# Navigate to the project directory
cd sosmed-downloader

# Install all dependencies
npm install

# Create a .env or edit .env.example file inside the /bot folder and set your environment variables
BOT_TOKEN=your_telegram_bot_token
VPS_API_URL=http://YOUR-IP-ADDRESS:3000
ADMINS=your_telegram_admin_id_1,your_telegram_admin_id_2

# (Recommended) Use PM2 for production deployment
pm2 start npm --name yourbotname -- run start:all

```

---

## 📸 Bot Preview
| Bot Menu | Download Result |
| :---: | :---: |
| ![Bot Menu](https://github.com/user-attachments/assets/1c1cbfe4-7f73-40e9-95b5-dda2f5504ba0) | ![Download Result](https://github.com/user-attachments/assets/327b3307-70d0-4792-b05f-0e2b0ffb8758) |


---

## 💬 Contact
- Developer: [@xiaogarpu](https://t.me/xiaogarpu)

---

## 📄 License
This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 📈 Quick Start
- Open Telegram
- Find **@mbotixdownloader_bot**
- Send your video link
- Enjoy instant downloads!


> Made with ❤️ by **MbotixTech**
