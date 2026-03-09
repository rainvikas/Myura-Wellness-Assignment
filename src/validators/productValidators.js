const { AppError } = require("../utils/AppError");

function addError(errors, field, message) {
  errors.push({ field, message });
}

function sanitizeString(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function readRequiredString(body, field, errors, maxLength) {
  if (body[field] === undefined || body[field] === null) {
    addError(errors, field, `${field} is required.`);
    return "";
  }

  const value = sanitizeString(body[field]);

  if (!value) {
    addError(errors, field, `${field} cannot be empty.`);
  } else if (value.length > maxLength) {
    addError(errors, field, `${field} must be ${maxLength} characters or fewer.`);
  }

  return value;
}

function readNonNegativeNumber(value, field, errors) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    addError(errors, field, `${field} must be a non-negative number.`);
    return null;
  }

  return Number(parsed.toFixed(2));
}

function readNonNegativeInteger(value, field, errors) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    addError(errors, field, `${field} must be a non-negative integer.`);
    return null;
  }

  return parsed;
}

function readPositiveInteger(value, field, errors) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    addError(errors, field, `${field} must be a positive integer.`);
    return null;
  }

  return parsed;
}

function validateCreateProduct(req) {
  const body = req.body || {};
  const errors = [];

  const product_name = readRequiredString(body, "product_name", errors, 120);
  const category = readRequiredString(body, "category", errors, 80);
  const price = readNonNegativeNumber(body.price, "price", errors);
  const stock = readNonNegativeInteger(body.stock, "stock", errors);

  if (errors.length > 0) {
    throw new AppError("Validation failed.", 400, errors);
  }

  return {
    body: {
      product_name,
      category,
      price,
      stock
    }
  };
}

function validateUpdateStock(req) {
  const errors = [];
  const id = readPositiveInteger(req.params.id, "id", errors);
  const stock = readNonNegativeInteger((req.body || {}).stock, "stock", errors);

  if (errors.length > 0) {
    throw new AppError("Validation failed.", 400, errors);
  }

  return {
    params: {
      id
    },
    body: {
      stock
    }
  };
}

module.exports = {
  validateCreateProduct,
  validateUpdateStock
};

