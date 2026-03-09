const path = require("path");

const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");

const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const { notFoundHandler } = require("./middleware/notFoundHandler");
const { logger } = require("./utils/logger");

const app = express();
const publicDirectory = path.join(__dirname, "..", "public");
const rateWindow = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const rateMax = Number(process.env.RATE_LIMIT_MAX) || 100;
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    }
  })
);

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins
  })
);

app.use(
  rateLimit({
    windowMs: rateWindow,
    max: rateMax,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(
  morgan("combined", {
    stream: {
      write: (message) => {
        logger.http(message.trim());
      }
    }
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use(express.static(publicDirectory));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(path.join(publicDirectory, "index.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
