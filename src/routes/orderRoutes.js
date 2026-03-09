const express = require("express");

const { createOrder } = require("../controllers/orderController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validate } = require("../middleware/validate");
const { validateCreateOrder } = require("../validators/orderValidators");

const router = express.Router();

router.post("/", validate(validateCreateOrder), asyncHandler(createOrder));

module.exports = router;

