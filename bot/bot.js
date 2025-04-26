import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { finished } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bot = new Telegraf('YOUR-BOT-TOKEN');
const VPS_API_URL = 'http://YOUR-IP-ADDRESS:3000';

const userState = new Map();
const lastAction = new Map();
const lastBotMessage = new Map();

let botInfo = null;
bot.telegram.getMe().then((info) => {
  botInfo = info;
  console.log(`🤖 Bot jalan sebagai @${botInfo.username}`);
});

bot.start(async (ctx) => {
  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'User';

  try {
    const photos = await ctx.telegram.getUserProfilePhotos(botInfo.id, { limit: 1 });

    if (photos.total_count > 0) {
      const file_id = photos.photos[0][0].file_id;
      const msg = await ctx.replyWithPhoto(file_id, {
        caption: `👋 Hola ${fullName}!\n\n📥 Pilih jenis downloader:`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎵 TikTok — Download video tanpa watermark', callback_data: 'select_tiktok' }],
            [{ text: '📘 Facebook — Download reels & video  ', callback_data: 'select_facebook' }],
            [{ text: '📸 Instagram — Download reels, story, feed', callback_data: 'select_instagram' }],
            [{ text: '📦 Terabox — Download file cloud', callback_data: 'select_terabox' }]
          ]
        }
      });
      lastBotMessage.set(ctx.from.id, msg.message_id);
    } else {
      const msg = await ctx.reply(`👋 Hola ${fullName}!\n\n📥 Pilih jenis downloader:`, Markup.inlineKeyboard([
        [{ text: '🎵 TikTok — Download video tanpa watermark', callback_data: 'select_tiktok' }],
        [{ text: '📘 Facebook — Download reels & video  ', callback_data: 'select_facebook' }],
        [{ text: '📸 Instagram — Download reels, story, feed', callback_data: 'select_instagram' }],
        [{ text: '📦 Terabox — Download file cloud', callback_data: 'select_terabox' }]
      ]));
      lastBotMessage.set(ctx.from.id, msg.message_id);
    }
  } catch (e) {
    console.error('❌ Gagal ambil foto profil:', e.message);
    await ctx.reply('❌ Error ambil foto profil.');
  }
});

bot.action(/select_(.+)/, async (ctx) => {
  const type = ctx.match[1];
  userState.set(ctx.from.id, type);

  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'User';
  const msg = await ctx.reply(`📥 Downloader dipilih: ${type.toUpperCase()}\n\n${fullName}, silakan kirim link kamu sekarang.`);
  lastBotMessage.set(ctx.from.id, msg.message_id);

  await ctx.answerCbQuery();
});

bot.on('text', async (ctx) => {
  const type = userState.get(ctx.from.id);
  const link = ctx.message.text.trim();
  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'User';

  try {
    await ctx.deleteMessage(ctx.message.message_id);
  } catch (e) {
    console.warn('Gagal hapus pesan user:', e.message);
  }

  const lastMsgId = lastBotMessage.get(ctx.from.id);
  if (lastMsgId) {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, lastMsgId);
    } catch (e) {
      console.warn('Gagal hapus pesan instruksi:', e.message);
    }
    lastBotMessage.delete(ctx.from.id);
  }

  if (!type) {
    return ctx.reply(`📌 ${fullName}, silakan pilih tipe downloader dulu dengan /start`);
  }

  const processingMessage = await ctx.reply(`⏳ ${fullName} sedang memproses video kamu...`);

  try {
    let apiUrl = '';
    if (type === 'facebook') apiUrl = `${VPS_API_URL}/api/facebook?url=${encodeURIComponent(link)}`;
    if (type === 'tiktok') apiUrl = `${VPS_API_URL}/api/tiktok?url=${encodeURIComponent(link)}`;
    if (type === 'terabox') apiUrl = `${VPS_API_URL}/api/terabox?data=${encodeURIComponent(link)}`;
    if (type === 'instagram') apiUrl = `${VPS_API_URL}/api/instagram?url=${encodeURIComponent(link)}`;

    const response = await axios.get(apiUrl, { timeout: 60000 });
    const videoUrl = response.data.video_url || response.data.download_url;
    const title = response.data.title || 'Mbotix Sosmed Downloader';

    if (!videoUrl) {
      await ctx.telegram.editMessageText(ctx.chat.id, processingMessage.message_id, undefined, `❌ Gagal mengambil video.`);
      return;
    }

    const caption = `🎬 Sumber: ${type.toUpperCase()}\n📌 Judul: ${title}\n\n☕ Dukung bot ini atau laporkan bug:`;
    const buttons = Markup.inlineKeyboard([
      [Markup.button.url('☕ Support Dev', 'https://saweria.co/MbotixTech')],
      [Markup.button.url('⚠️ Report Bug', 'https://t.me/xiaogarpu')]
    ]);

    if (type === 'facebook') {
      const tempPath = path.join(__dirname, 'temp_video.mp4');
      const writer = fs.createWriteStream(tempPath);

      const videoStream = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream'
      });

      videoStream.data.pipe(writer);
      await finished(writer);

      await ctx.replyWithVideo({ source: tempPath }, { caption, ...buttons });

      fs.unlinkSync(tempPath);
    } else {
      await ctx.replyWithVideo({ url: videoUrl }, { caption, ...buttons });
    }

    lastAction.set(ctx.from.id, { type, link, title });

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);

    const done = await ctx.reply('✅ Video berhasil dikirim!');
    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, done.message_id).catch(() => {});
    }, 4000);

    userState.delete(ctx.from.id);
  } catch (err) {
    console.error('❌ Error di downloader:', err);
    await ctx.telegram.editMessageText(ctx.chat.id, processingMessage.message_id, undefined, `❌ Terjadi kesalahan saat mengambil video.`);
  }
});

bot.launch();
console.log('🤖 Bot Telegram berjalan...');
