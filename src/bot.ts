import { Bot, InlineKeyboard, Context } from "grammy";
import { config } from "./config";
import {
  getAll,
  upsertUser,
  updatePhone,
  updateGroups,
  updateKeywords,
} from "./leadSettingsRepo";

function buildWebAppKeyboard() {
  if (!config.webappBaseUrl) return null;
  const keyboard = new InlineKeyboard().webApp("Открыть приложение", config.webappBaseUrl);
  return { reply_markup: keyboard };
}

const knownGroups = new Set<string>(config.allowedGroups || []);
const selectionCache = new Map<string, Set<string>>();

async function hydrateKnownGroups() {
  try {
    const users = await getAll();
    users.forEach((u) => u.groups.forEach((g) => knownGroups.add(g)));
  } catch (err) {
    console.warn("Failed to hydrate known groups", err);
  }
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

  await ctx.reply(
    "Управление без WebApp:\n/groups — показать выбранные\n/setgroups <id1,id2> — задать группы\n/keywords — показать ключевые\n/setkeywords <слова через запятую> — задать ключи"
  );
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

function getAvailableGroups(): string[] {
  if (config.allowedGroups && config.allowedGroups.length) return [...config.allowedGroups];
  return Array.from(knownGroups);
}

function buildGroupsKeyboard(selected: Set<string>, available: string[]) {
  const kb = new InlineKeyboard();
  available.forEach((g, idx) => {
    const isOn = selected.has(g);
    kb.text(`${isOn ? "✅" : "⬜️"} ${g}`, `toggle_g:${g}`);
    if (idx % 2 === 1) kb.row();
  });
  kb.row().text("Сохранить", "save_groups");
  return kb;
}

async function handleGroupMessage(bot: Bot, ctx: Context) {
  if (!ctx.message || !ctx.chat) return;
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const chatId = ctx.chat.id.toString();
  knownGroups.add(chatId);

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

  bot.catch((err) => {
    console.error("Bot error", err.error || err);
  });

  hydrateKnownGroups();

  bot.command("groups", async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    const user = await upsertUser(telegramId);
    const allUsers = await getAll();
    allUsers.forEach((u) => u.groups.forEach((g) => knownGroups.add(g)));
    const available = Array.from(knownGroups);
    const current = user.groups;
    await ctx.reply(
      `Текущие группы: ${current.length ? current.join(", ") : "нет"}\nДоступные: ${
        available.length ? available.join(", ") : "пока нет"
      }\nЗадайте группы: /setgroups id1,id2\nДобавить из группы: напишите /savegroup внутри нужной группы`
    );
  });

  bot.command("setgroups", async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    const text = ctx.message?.text || "";
    const payload = text.split(/\s+/).slice(1).join(" ");
    const groups = payload
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    if (!groups.length) {
      await ctx.reply("Укажите chat_id через запятую: /setgroups -1001,-1002");
      return;
    }
    if (config.allowedGroups && config.allowedGroups.length) {
      const invalid = groups.filter((g) => !config.allowedGroups.includes(g));
      if (invalid.length) {
        await ctx.reply(
          `Некорректные chat_id: ${invalid.join(", ")}. Доступные: ${config.allowedGroups.join(
            ", "
          )}`
        );
        return;
      }
    }
    await updateGroups(telegramId, groups);
    const user = await upsertUser(telegramId);
    await ctx.reply(`Группы сохранены: ${user.groups.join(", ")}`);
  });

  bot.command("choosegroups", async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    const user = await upsertUser(telegramId);
    const available = getAvailableGroups();
    if (!available.length) {
      await ctx.reply("Нет доступных групп. Добавьте в MONITORED_GROUPS или сохраните через /savegroup.");
      return;
    }
    const selected = new Set<string>(user.groups);
    selectionCache.set(telegramId, selected);
    const kb = buildGroupsKeyboard(selected, available);
    await ctx.reply(
      `Выберите группы (тапайте для переключения), потом нажмите Сохранить.\nТекущие: ${
        user.groups.length ? user.groups.join(", ") : "нет"
      }`,
      { reply_markup: kb }
    );
  });

  bot.on("callback_query:data", async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    const data = ctx.callbackQuery.data;
    if (data.startsWith("toggle_g:")) {
      const groupId = data.replace("toggle_g:", "");
      const available = getAvailableGroups();
      if (!available.includes(groupId)) {
        await ctx.answerCallbackQuery({ text: "Эта группа недоступна", show_alert: true });
        return;
      }
      const selection = selectionCache.get(telegramId) ?? new Set<string>();
      if (selection.has(groupId)) selection.delete(groupId);
      else selection.add(groupId);
      selectionCache.set(telegramId, selection);
      const kb = buildGroupsKeyboard(selection, available);
      await ctx.editMessageText(
        `Выберите группы (тапайте для переключения), потом нажмите Сохранить.\nТекущие: ${
          selection.size ? Array.from(selection).join(", ") : "нет"
        }`,
        { reply_markup: kb }
      );
      await ctx.answerCallbackQuery();
      return;
    }
    if (data === "save_groups") {
      const selection = selectionCache.get(telegramId) ?? new Set<string>();
      await updateGroups(telegramId, Array.from(selection));
      const user = await upsertUser(telegramId);
      await ctx.editMessageText(`Группы сохранены: ${user.groups.join(", ") || "нет"}`);
      await ctx.answerCallbackQuery({ text: "Сохранено" });
      return;
    }
  });

  bot.command("groupid", async (ctx) => {
    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) {
      await ctx.reply("Выполните /groupid внутри группы, чтобы получить ее chat_id.");
      return;
    }
    const chatId = ctx.chat.id.toString();
    const title = ctx.chat.title || chatId;
    knownGroups.add(chatId);
    await ctx.reply(`Chat ID: ${chatId}\nНазвание: ${title}`);
  });

  bot.command("savegroup", async (ctx) => {
    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) {
      await ctx.reply("Выполните /savegroup внутри группы, чтобы добавить ее.");
      return;
    }
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    const chatId = ctx.chat.id.toString();
    knownGroups.add(chatId);
    const user = await upsertUser(telegramId);
    const updated = Array.from(new Set([...user.groups, chatId]));
    await updateGroups(telegramId, updated);
    await ctx.reply(`Группа ${chatId} добавлена. Текущие: ${updated.join(", ")}`);
  });

  bot.command("keywords", async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    const user = await upsertUser(telegramId);
    await ctx.reply(
      `Текущие ключевые слова: ${user.keywords.length ? user.keywords.join(", ") : "нет"}\nЗадайте: /setkeywords слово1,слово2`
    );
  });

  bot.command("setkeywords", async (ctx) => {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;
    const text = ctx.message?.text || "";
    const payload = text.split(/\s+/).slice(1).join(" ");
    const keywords = payload
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    if (!keywords.length) {
      await ctx.reply("Укажите ключевые слова через запятую: /setkeywords аренда,куплю");
      return;
    }
    await updateKeywords(telegramId, keywords);
    const user = await upsertUser(telegramId);
    await ctx.reply(`Ключевые слова сохранены: ${user.keywords.join(", ")}`);
  });

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
