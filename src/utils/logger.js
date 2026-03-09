const fs = require("fs");
const path = require("path");
const util = require("util");

const logDirectory = path.join(__dirname, "..", "..", "logs");
const errorLogPath = path.join(logDirectory, "error.log");

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] ${message}`;

  if (!meta) {
    return base;
  }

  return `${base}\n${util.format(meta)}`;
}

function write(level, message, meta) {
  const formatted = formatMessage(level, message, meta);
  const output =
    level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;

  output(formatted);

  if (level === "ERROR") {
    fs.appendFile(errorLogPath, `${formatted}\n`, () => {});
  }
}

const logger = {
  info(message, meta) {
    write("INFO", message, meta);
  },
  warn(message, meta) {
    write("WARN", message, meta);
  },
  error(message, meta) {
    write("ERROR", message, meta);
  },
  http(message) {
    write("HTTP", message);
  }
};

module.exports = {
  logger
};

