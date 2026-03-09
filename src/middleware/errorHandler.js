const { AppError } = require("../utils/AppError");
const { logger } = require("../utils/logger");

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return new AppError("Invalid JSON body.", 400);
  }

  if (error.code === "23503") {
    return new AppError("Referenced resource was not found.", 400);
  }

  if (error.code === "23505") {
    return new AppError("Duplicate resource detected.", 409);
  }

  if (error.code === "22P02") {
    return new AppError("Invalid identifier or numeric value.", 400);
  }

  return new AppError("Internal server error.", 500);
}

function errorHandler(error, req, res, next) {
  const normalizedError = normalizeError(error);

  if (normalizedError.statusCode >= 500) {
    logger.error(
      `${req.method} ${req.originalUrl} failed with ${normalizedError.statusCode}.`,
      error
    );
  } else {
    logger.warn(
      `${req.method} ${req.originalUrl} failed with ${normalizedError.statusCode}: ${normalizedError.message}`
    );
  }

  const payload = {
    message: normalizedError.message
  };

  if (normalizedError.details) {
    payload.details = normalizedError.details;
  }

  res.status(normalizedError.statusCode).json(payload);
}

module.exports = {
  errorHandler
};

