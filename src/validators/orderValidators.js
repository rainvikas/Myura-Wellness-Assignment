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

function readOptionalString(body, field, errors, maxLength) {
  if (body[field] === undefined || body[field] === null || body[field] === "") {
    return null;
  }

  const value = sanitizeString(body[field]);

  if (value.length > maxLength) {
    addError(errors, field, `${field} must be ${maxLength} characters or fewer.`);
  }

  return value || null;
}

function readPositiveInteger(value, field, errors) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    addError(errors, field, `${field} must be a positive integer.`);
    return null;
  }

  return parsed;
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateCreateOrder(req) {
  const body = req.body || {};
  const errors = [];

  const customer_name = readRequiredString(body, "customer_name", errors, 120);
  const customer_email = readRequiredString(body, "customer_email", errors, 160).toLowerCase();
  const customer_phone = readOptionalString(body, "customer_phone", errors, 30);
  const shipping_address = readRequiredString(body, "shipping_address", errors, 500);

  if (customer_email && !validateEmail(customer_email)) {
    addError(errors, "customer_email", "customer_email must be a valid email address.");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    addError(errors, "items", "items must be a non-empty array.");
  }

  const consolidatedItems = [];
  const itemQuantities = new Map();

  if (Array.isArray(body.items)) {
    body.items.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        addError(errors, `items[${index}]`, "Each item must be an object.");
        return;
      }

      const productId = readPositiveInteger(
        item.product_id,
        `items[${index}].product_id`,
        errors
      );
      const quantity = readPositiveInteger(
        item.quantity,
        `items[${index}].quantity`,
        errors
      );

      if (productId && quantity) {
        itemQuantities.set(productId, (itemQuantities.get(productId) || 0) + quantity);
      }
    });
  }

  itemQuantities.forEach((quantity, product_id) => {
    consolidatedItems.push({ product_id, quantity });
  });

  if (errors.length > 0) {
    throw new AppError("Validation failed.", 400, errors);
  }

  return {
    body: {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      items: consolidatedItems
    }
  };
}

module.exports = {
  validateCreateOrder
};

