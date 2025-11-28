import { Bot, InlineKeyboard, Context } from "grammy";
import { config } from "./config";
import { getAll, upsertUser, updatePhone } from "./leadSettingsRepo";

function buildWebAppKeyboard() {
  if (!config.webappBaseUrl) return null;
  const keyboard = new InlineKeyboard().webApp("Открыть приложение", config.webappBaseUrl);
  return { reply_markup: keyboard };
}

async function handleStart(ctx: Context) {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) return;

  const user = await upsertUser(telegramId);

  if (!user.phone) {
    await ctx.reply("Отправьте номер телефона для авторизации", {
      reply_markup: {
        keyboard: [[{ text: "Отправить номер телефона", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
    return;
  }

  const keyboard = buildWebAppKeyboard();
  if (keyboard) {
    await ctx.reply("Вы авторизованы. Нажмите кнопку, чтобы открыть приложение.", keyboard);
  } else {
    await ctx.reply("Вы авторизованы. WebApp URL не настроен.");
  }
}

async function handleContact(ctx: Context) {
  if (!ctx.message || !("contact" in ctx.message)) return;
  const telegramId = ctx.from?.id?.toString();
  const contact = ctx.message.contact;
  if (!telegramId || !contact?.phone_number) return;

  await updatePhone(telegramId, contact.phone_number);
  const keyboard = buildWebAppKeyboard();
  if (keyboard) {
    await ctx.reply("Авторизация прошла. Нажмите кнопку, чтобы открыть приложение.", keyboard);
  } else {
    await ctx.reply("Авторизация прошла. WebApp URL не настроен.");
  }
}

function messageMatches(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

async function handleGroupMessage(bot: Bot, ctx: Context) {
  if (!ctx.message || !ctx.chat) return;
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const chatId = ctx.chat.id.toString();

  const text = ("text" in ctx.message ? ctx.message.text : undefined) ||
    ("caption" in ctx.message ? ctx.message.caption : undefined) ||
    "";
  if (!text.trim()) return;

  const users = await getAll();
  const chatTitle = ctx.chat.title || chatId;

  for (const user of users) {
    if (!user.groups.includes(chatId)) continue;
    if (!user.keywords.length) continue;
    if (!messageMatches(text, user.keywords)) continue;

    const alertText = `Найдено совпадение в чате ${chatTitle}:\n\n${text}`;

    const targetChat = config.alertFixedChatId || user.telegramId;

    try {
      await bot.api.sendMessage(targetChat, alertText);
    } catch (err) {
      console.error("Failed to send alert", err);
    }
  }
}

export function createBot() {
  const bot = new Bot(config.botToken);

  bot.command("start", (ctx) => handleStart(ctx));
  bot.command("app", (ctx) => {
    const keyboard = buildWebAppKeyboard();
    if (keyboard) return ctx.reply("Открыть приложение", keyboard);
    return ctx.reply("WebApp URL не настроен.");
  });
  bot.on("message:contact", (ctx) => handleContact(ctx));
  bot.on("message", (ctx) => handleGroupMessage(bot, ctx));

  return bot;
}
