const express = require("express");

const {
  createProduct,
  listProducts,
  updateProductStock
} = require("../controllers/productController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validate } = require("../middleware/validate");
const {
  validateCreateProduct,
  validateUpdateStock
} = require("../validators/productValidators");

const router = express.Router();

router.get("/", asyncHandler(listProducts));
router.post("/", validate(validateCreateProduct), asyncHandler(createProduct));
router.put(
  "/:id/stock",
  validate(validateUpdateStock),
  asyncHandler(updateProductStock)
);

module.exports = router;

