import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const TELEGRAM_BOT_TOKEN = requireEnv("TELEGRAM_BOT_TOKEN");
const WEBAPP_BASE_URL = process.env.WEBAPP_BASE_URL?.trim();
const ALERT_FIXED_CHAT_ID = process.env.ALERT_FIXED_CHAT_ID?.trim() || null;
const PORT = Number(process.env.PORT || "3000");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_KEY = requireEnv("SUPABASE_KEY");
const MONITORED_GROUPS = parseList(process.env.MONITORED_GROUPS);

export const config = {
  botToken: TELEGRAM_BOT_TOKEN,
  webappBaseUrl:
    WEBAPP_BASE_URL && WEBAPP_BASE_URL.length > 0
      ? WEBAPP_BASE_URL.endsWith("/")
        ? WEBAPP_BASE_URL
        : `${WEBAPP_BASE_URL}/`
      : null,
  alertFixedChatId: ALERT_FIXED_CHAT_ID,
  port: PORT,
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  allowedGroups: MONITORED_GROUPS,
};
