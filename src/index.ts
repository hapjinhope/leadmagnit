import { config } from "./config";
import { createWebAppServer } from "./webapp/server";
import { createBot } from "./bot";

async function bootstrap() {
  const app = createWebAppServer();
  app.listen(config.port, () => {
    console.log(`WebApp server started on port ${config.port}`);
  });

  const bot = createBot();
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
  } catch (err) {
    console.warn("Failed to delete webhook before start", err);
  }
  bot.start();
  console.log(`Bot started`);
}

bootstrap().catch((err) => {
  console.error("Failed to start application", err);
  process.exit(1);
});
