import express from "express";
import path from "path";
import { verifyInitData } from "./auth";
import { config } from "../config";
import {
  getByTelegramId,
  getAll,
  upsertUser,
  updateGroups,
  updateKeywords,
} from "../leadSettingsRepo";

declare global {
  namespace Express {
    interface Request {
      userTelegramId?: string;
    }
  }
}

export function createWebAppServer() {
  const app = express();

  app.use(express.json());
  app.use("/webapp", express.static(path.join(process.cwd(), "public/webapp")));
  app.get("/", (_req, res) => res.redirect("/webapp/"));

  app.use("/api", async (req, res, next) => {
    const initData = req.header("x-telegram-init-data");
    if (!initData) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const verified = verifyInitData(initData, config.botToken);
    if (!verified) {
      return res.status(401).json({ error: "unauthorized" });
    }
    req.userTelegramId = verified.telegramId;
    await upsertUser(verified.telegramId);
    next();
  });

  app.get("/api/user/settings", async (req, res) => {
    const telegramId = req.userTelegramId as string;
    const settings = (await getByTelegramId(telegramId)) ?? (await upsertUser(telegramId));
    res.json({ groups: settings.groups, keywords: settings.keywords });
  });

  app.get("/api/groups/available", async (req, res) => {
    const all = await getAll();
    const telegramId = req.userTelegramId as string;
    const user = all.find((u) => u.telegramId === telegramId);

    const unique = new Set<string>();
    all.forEach((u) => u.groups.forEach((g) => unique.add(g)));
    (user?.groups || []).forEach((g) => unique.add(g));

    const groups = Array.from(unique).map((id) => ({ id, title: `Группа ${id}` }));
    res.json({ groups });
  });

  app.post("/api/user/groups", async (req, res) => {
    const telegramId = req.userTelegramId as string;
    const groups = Array.isArray(req.body?.groups) ? req.body.groups.map(String) : [];
    await updateGroups(telegramId, groups);
    const settings = (await getByTelegramId(telegramId)) ?? (await upsertUser(telegramId));
    res.json({ groups: settings.groups, keywords: settings.keywords });
  });

  app.post("/api/user/keywords", async (req, res) => {
    const telegramId = req.userTelegramId as string;
    const keywords = Array.isArray(req.body?.keywords) ? req.body.keywords.map(String) : [];
    await updateKeywords(telegramId, keywords);
    const settings = (await getByTelegramId(telegramId)) ?? (await upsertUser(telegramId));
    res.json({ groups: settings.groups, keywords: settings.keywords });
  });

  return app;
}
