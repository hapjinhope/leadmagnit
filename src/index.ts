import { config } from "./config";
import { createWebAppServer } from "./webapp/server";
import { createBot } from "./bot";

async function bootstrap() {
  const app = createWebAppServer();
  app.listen(config.port, () => {
    console.log(`WebApp server started on port ${config.port}`);
  });

  const bot = createBot();
  bot.start();
  console.log(`Bot started`);
}

bootstrap().catch((err) => {
  console.error("Failed to start application", err);
  process.exit(1);
});
