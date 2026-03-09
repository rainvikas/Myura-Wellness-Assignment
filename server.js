require("dotenv").config();

const app = require("./src/app");
const database = require("./src/config/database");
const { logger } = require("./src/utils/logger");

const port = Number(process.env.PORT) || 5000;
let isShuttingDown = false;

const server = app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.warn(`Received ${signal}. Starting graceful shutdown.`);

  server.close(async () => {
    try {
      await database.closePool();
      logger.info("Database pool closed.");
    } catch (error) {
      logger.error("Error while closing database pool.", error);
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 5000).unref();
}

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    shutdown(signal);
  });
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection.", error);
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception.", error);
  shutdown("uncaughtException");
});
