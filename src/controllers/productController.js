const { query } = require("../config/database");
const { AppError } = require("../utils/AppError");

const productColumns = `
  id,
  product_name,
  price::float AS price,
  category,
  stock,
  created_at,
  updated_at
`;

async function listProducts(req, res) {
  const result = await query(
    `SELECT ${productColumns} FROM products ORDER BY id ASC`
  );

  res.json({
    products: result.rows
  });
}

async function createProduct(req, res) {
  const { product_name, price, category, stock } = req.validated.body;

  const result = await query(
    `
      INSERT INTO products (product_name, price, category, stock)
      VALUES ($1, $2, $3, $4)
      RETURNING ${productColumns}
    `,
    [product_name, price, category, stock]
  );

  res.status(201).json({
    message: "Product created successfully.",
    product: result.rows[0]
  });
}

async function updateProductStock(req, res) {
  const { id } = req.validated.params;
  const { stock } = req.validated.body;

  const result = await query(
    `
      UPDATE products
      SET stock = $1::int, updated_at = NOW()
      WHERE id = $2::int
      RETURNING ${productColumns}
    `,
    [stock, id]
  );

  if (!result.rowCount) {
    throw new AppError("Product not found.", 404);
  }

  res.json({
    message: "Product stock updated successfully.",
    product: result.rows[0]
  });
}

module.exports = {
  listProducts,
  createProduct,
  updateProductStock
};
