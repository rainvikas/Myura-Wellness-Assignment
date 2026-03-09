const { Pool } = require("pg");

const { logger } = require("../utils/logger");

const poolErrorListener = (error) => {
  logger.error("Unexpected PostgreSQL client error.", error);
};

function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    logger.warn("DATABASE_URL is not set. Database-backed requests will fail until it is configured.");
  }

  const nextPool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false
          }
        : false
  });

  if (typeof nextPool.on === "function") {
    nextPool.on("error", poolErrorListener);
  }

  return nextPool;
}

let activePool = createPool();

function getPool() {
  return activePool;
}

function setPool(pool) {
  activePool = pool;

  if (typeof activePool.on === "function") {
    activePool.on("error", poolErrorListener);
  }
}

async function closePool() {
  if (activePool && typeof activePool.end === "function") {
    await activePool.end();
  }
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = {
  closePool,
  createPool,
  getPool,
  query,
  setPool
};
