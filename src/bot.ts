import { Bot, InlineKeyboard, Context } from "grammy";
import { config } from "./config";
import {
  getAll,
  upsertUser,
  updatePhone,
} from "./leadSettingsRepo";

function buildWebAppKeyboard() {
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

  await ctx.reply(
    "Вы авторизованы. Нажмите кнопку, чтобы открыть приложение.",
    buildWebAppKeyboard()
  );
}

async function handleContact(ctx: Context) {
  if (!ctx.message || !("contact" in ctx.message)) return;
  const telegramId = ctx.from?.id?.toString();
  const contact = ctx.message.contact;
  if (!telegramId || !contact?.phone_number) return;

  await updatePhone(telegramId, contact.phone_number);
  await ctx.reply(
    "Авторизация прошла. Нажмите кнопку, чтобы открыть приложение.",
    buildWebAppKeyboard()
  );
}

function messageMatches(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

async function handleGroupMessage(bot: Bot, ctx: Context) {
  if (!ctx.message || !ctx.chat) return;
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const chatId = ctx.chat.id.toString();
  if (!config.monitoredGroups.includes(chatId)) return;

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

    try {
      if (config.alertTargetMode === "user") {
        await bot.api.sendMessage(user.telegramId, alertText);
      } else if (config.alertFixedChatId) {
        await bot.api.sendMessage(config.alertFixedChatId, `${alertText}\n\nПользователь: ${user.telegramId}`);
      }
    } catch (err) {
      console.error("Failed to send alert", err);
    }
  }
}

export function createBot() {
  const bot = new Bot(config.botToken);

  bot.command("start", (ctx) => handleStart(ctx));
  bot.command("app", (ctx) => ctx.reply("Открыть приложение", buildWebAppKeyboard()));
  bot.on("message:contact", (ctx) => handleContact(ctx));
  bot.on("message", (ctx) => handleGroupMessage(bot, ctx));

  return bot;
}
