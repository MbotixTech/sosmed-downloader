import dotenv from 'dotenv';
import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { finished } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const bot = new Telegraf(process.env.BOT_TOKEN);
const VPS_API_URL = process.env.VPS_API_URL;
const ADMINS = process.env.ADMINS ? process.env.ADMINS.split(',').map(id => parseInt(id)) : [];
const usersFilePath = path.join(__dirname, 'users.json');


const activeUsers = new Set();
const lastAction = new Map();
const lastBotMessage = new Map();
const pendingBroadcast = new Map();
const userState = new Map();


if (fs.existsSync(usersFilePath)) {
  try {
    const rawData = fs.readFileSync(usersFilePath, 'utf-8');
    const userIds = JSON.parse(rawData);
    userIds.forEach(id => activeUsers.add(id));
    console.log(`✅ Loaded ${userIds.length} active users from users.json`);
  } catch (e) {
    console.error('❌ Gagal load users.json:', e.message);
  }
}

function saveUsers() {
  const userIds = Array.from(activeUsers);
  fs.writeFileSync(usersFilePath, JSON.stringify(userIds, null, 2));
}

let botInfo = null;
bot.telegram.getMe().then((info) => {
  botInfo = info;
  console.log(`🤖 Bot jalan sebagai @${botInfo.username}`);
});

bot.start(async (ctx) => {
  if (ctx.chat.type !== 'private') return;

  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'User';

  if (!activeUsers.has(ctx.from.id)) {
    activeUsers.add(ctx.from.id);
    saveUsers();
  }

  try {
    const photos = await ctx.telegram.getUserProfilePhotos(botInfo.id, { limit: 1 });

    const baseButtons = [
      [{ text: '🎵 TikTok — Download video tanpa watermark', callback_data: 'select_tiktok' }],
      [{ text: '📘 Facebook — Download reels & video', callback_data: 'select_facebook' }],
      [{ text: '📸 Instagram — Download reels, story, feed', callback_data: 'select_instagram' }],
      [{ text: '🐦 Twitter/X — Download video dari Twitter', callback_data: 'select_twitter' }],
    ];

    if (ADMINS.includes(ctx.from.id)) {
      baseButtons.push([{ text: '🚀 Broadcast ke semua user', callback_data: 'admin_broadcast' }]);
    }

    if (photos.total_count > 0) {
      const file_id = photos.photos[0][0].file_id;
      const msg = await ctx.replyWithPhoto(file_id, {
        caption: `👋 Hola ${fullName}!\n\n📥 Pilih jenis downloader:`,
        reply_markup: { inline_keyboard: baseButtons }
      });
      lastBotMessage.set(ctx.from.id, msg.message_id);
    } else {
      const msg = await ctx.reply(`👋 Hola ${fullName}!\n\n📥 Pilih jenis downloader:`, Markup.inlineKeyboard(baseButtons));
      lastBotMessage.set(ctx.from.id, msg.message_id);
    }
  } catch (e) {
    console.error('❌ Gagal ambil foto profil:', e.message);
    await ctx.reply('❌ Error ambil foto profil.');
  }
});

bot.action(/select_(.+)/, async (ctx) => {
  if (ctx.chat.type !== 'private') return;

  const type = ctx.match[1];
  userState.set(ctx.from.id, type);

  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'User';
  const msg = await ctx.reply(`📥 Downloader dipilih: ${type.toUpperCase()}\n\n${fullName}, silakan kirim link kamu sekarang.`);
  lastBotMessage.set(ctx.from.id, msg.message_id);

  await ctx.answerCbQuery();
});


bot.action('admin_broadcast', async (ctx) => {
  if (ctx.chat.type !== 'private') return;

  if (!ADMINS.includes(ctx.from.id)) {
    return ctx.answerCbQuery('❌ Kamu tidak punya akses broadcast.', { show_alert: true });
  }
  const sent = await ctx.reply('🚀 Silakan kirim pesan yang mau di-broadcast (text, gambar, atau video).');
  pendingBroadcast.set(ctx.from.id, { waiting: true, messageId: sent.message_id });
  await ctx.answerCbQuery();
});

function detectPlatform(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  if (lowerText.includes('tiktok.com') || lowerText.includes('vm.tiktok.com') || lowerText.includes('vt.tiktok.com')) {
    return 'tiktok';
  }
  if (lowerText.includes('instagram.com') || lowerText.includes('instagr.am')) {
    return 'instagram';
  }
  if (lowerText.includes('facebook.com') || lowerText.includes('fb.com') || lowerText.includes('fb.watch')) {
    return 'facebook';
  }
  if (lowerText.includes('twitter.com') || lowerText.includes('x.com') || lowerText.includes('t.co')) {
    return 'twitter';
  }
  return null;
}

function extractUrl(text) {
  if (!text) return null;
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : text.trim();
}

bot.on(['text', 'photo', 'video'], async (ctx) => {
  if (ctx.chat.type !== 'private') {
    const messageText = ctx.message.text || ctx.message.caption || '';
    const detectedPlatform = detectPlatform(messageText);
    
    if (!detectedPlatform) return;
    
    const link = extractUrl(messageText);
    if (!link) return;
    
    try {
      let apiUrl = '';
      if (detectedPlatform === 'facebook') apiUrl = `${VPS_API_URL}/api/facebook?url=${encodeURIComponent(link)}`;
      if (detectedPlatform === 'tiktok') apiUrl = `${VPS_API_URL}/api/tiktok?url=${encodeURIComponent(link)}`;
      if (detectedPlatform === 'instagram') apiUrl = `${VPS_API_URL}/api/instagram?url=${encodeURIComponent(link)}`;
      if (detectedPlatform === 'twitter') apiUrl = `${VPS_API_URL}/api/twitter?url=${encodeURIComponent(link)}`;
      
      const response = await axios.get(apiUrl, { timeout: 60000 });
      const videoUrl = response.data.video_url || response.data.download_url;
      
      if (!videoUrl) return;
      
      if (detectedPlatform === 'facebook') {
        const tempPath = path.join(__dirname, 'temp_video.mp4');
        const writer = fs.createWriteStream(tempPath);

        const videoStream = await axios({
          method: 'get',
          url: videoUrl,
          responseType: 'stream'
        });

        videoStream.data.pipe(writer);
        await finished(writer);

        await ctx.replyWithVideo({ source: tempPath });
        fs.unlinkSync(tempPath);
      } else {
        await ctx.replyWithVideo({ url: videoUrl });
      }
    } catch (err) {
      console.error('❌ Error di group downloader:', err);
    }
    return;
  }

  const pending = pendingBroadcast.get(ctx.from.id);
  if (pending) {
    pendingBroadcast.delete(ctx.from.id);

    const broadcastLoading = await ctx.reply('⏳ Sedang broadcast ke semua user...');

    let successCount = 0;
    let failedUsers = [];
    const promises = [];

    const originalText = ctx.message.text || ctx.message.caption || '';
    const originalEntities = ctx.message.entities || ctx.message.caption_entities || [];

    let cleanText = originalText;
    let buttons = [];

    let removedSegments = [];

    if (originalEntities.length > 0) {
      const textLinks = originalEntities.filter(e => e.type === 'text_link');

      if (textLinks.length > 0) {
        for (let i = textLinks.length - 1; i >= 0; i--) {
          const entity = textLinks[i];
          const label = originalText.substring(entity.offset, entity.offset + entity.length);
          const url = entity.url;
          buttons.push([Markup.button.url(label, url)]);

          removedSegments.push({ offset: entity.offset, length: entity.length });

          cleanText = cleanText.slice(0, entity.offset) + cleanText.slice(entity.offset + entity.length);
        }
        cleanText = cleanText.trim();
      }
    }

    let newEntities = [];
    if (originalEntities.length > 0) {
      let totalRemoved = 0;
      for (const entity of originalEntities) {
        if (entity.type !== 'text_link') {
          let adjustment = 0;
          for (const removed of removedSegments) {
            if (entity.offset > removed.offset) {
              adjustment += removed.length;
            }
          }
          newEntities.push({
            ...entity,
            offset: entity.offset - adjustment
          });
        }
      }
    }

    for (const userId of activeUsers) {
      if (ADMINS.includes(userId)) continue;

      const sendPromise = (async () => {
        try {
          if (ctx.message.photo) {
            const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            await ctx.telegram.sendPhoto(userId, fileId, {
              caption: cleanText || '📢 Broadcast',
              caption_entities: newEntities,
              reply_markup: buttons.length > 0 ? Markup.inlineKeyboard(buttons).reply_markup : undefined
            });
          } else if (ctx.message.video) {
            const fileId = ctx.message.video.file_id;
            await ctx.telegram.sendVideo(userId, fileId, {
              caption: cleanText || '📢 Broadcast',
              caption_entities: newEntities,
              reply_markup: buttons.length > 0 ? Markup.inlineKeyboard(buttons).reply_markup : undefined
            });
          } else if (ctx.message.text) {
            await ctx.telegram.sendMessage(userId, cleanText || '📢 Broadcast', {
              entities: newEntities,
              disable_web_page_preview: true,
              reply_markup: buttons.length > 0 ? Markup.inlineKeyboard(buttons).reply_markup : undefined
            });
          }
          successCount++;
        } catch (error) {
          try {
            const chat = await ctx.telegram.getChat(userId);
            failedUsers.push({
              id: userId,
              username: chat.username ? `@${chat.username}` : '(no username)',
              fullName: [chat.first_name, chat.last_name].filter(Boolean).join(' ') || '(no full name)'
            });
            console.log(`❌ Gagal kirim ke ${userId} (${chat.username || 'no username'}) - Error: ${error.message}`);
          } catch (e) {
            failedUsers.push({
              id: userId,
              username: '(unknown)',
              fullName: '(unknown)'
            });
            console.log(`❌ Gagal kirim ke ${userId} (unknown) - Error: ${error.message}`);
          }
        }
      })();
      promises.push(sendPromise);
    }

    await Promise.allSettled(promises);

    try { await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id); } catch {}
    try { await ctx.telegram.deleteMessage(ctx.chat.id, pending.messageId); } catch {}
    try { await ctx.telegram.deleteMessage(ctx.chat.id, broadcastLoading.message_id); } catch {}

    let report = `✅ <b>Broadcast Selesai!</b>\n\n`;
    report += `👤 <b>Total User:</b> ${activeUsers.size}\n`;
    report += `📬 <b>Berhasil Dikirim:</b> ${successCount}\n`;
    report += `🚫 <b>Gagal Dikirim:</b> ${failedUsers.length}\n\n`;
    report += `🕒 Laporan ini akan otomatis dihapus dalam 5 menit.`;

    if (failedUsers.length > 0) {
      report += `Daftar Gagal:\n`;
      failedUsers.forEach(user => {
        report += `- ${user.username} | ${user.id} | ${user.fullName}\n`;
      });
    }

    const finalReport = await ctx.reply(report, { parse_mode: 'HTML' });

    setTimeout(() => {
      ctx.telegram.deleteMessage(ctx.chat.id, finalReport.message_id).catch(() => {});
    }, 5 * 60 * 1000);

    return;
  }

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
    if (type === 'instagram') apiUrl = `${VPS_API_URL}/api/instagram?url=${encodeURIComponent(link)}`;
    if (type === 'twitter') apiUrl = `${VPS_API_URL}/api/twitter?url=${encodeURIComponent(link)}`;

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
