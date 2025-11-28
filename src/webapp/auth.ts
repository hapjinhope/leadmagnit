import crypto from "crypto";

export function verifyInitData(initData: string, botToken: string): { telegramId: string } | null {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join("\n");

    const secretKey = crypto.createHash("sha256").update(botToken).digest();
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (signature !== hash) return null;

    const userRaw = params.get("user");
    if (!userRaw) return null;

    const user = JSON.parse(userRaw);
    if (!user?.id) return null;

    return { telegramId: String(user.id) };
  } catch (err) {
    return null;
  }
}
