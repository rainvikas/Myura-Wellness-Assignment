const database = require("../config/database");
const { AppError } = require("../utils/AppError");

async function createOrder(req, res) {
  const { customer_name, customer_email, customer_phone, shipping_address, items } =
    req.validated.body;
  const client = await database.getPool().connect();

  try {
    await client.query("BEGIN");

    const productIds = items.map((item) => item.product_id);
    const productPlaceholders = productIds
      .map((_, index) => `$${index + 1}`)
      .join(", ");
    const productResult = await client.query(
      `
        SELECT id, product_name, price, stock
        FROM products
        WHERE id IN (${productPlaceholders})
        ORDER BY id ASC
        FOR UPDATE
      `,
      productIds
    );

    const productsById = new Map(
      productResult.rows.map((product) => [
        Number(product.id),
        {
          ...product,
          id: Number(product.id),
          stock: Number(product.stock)
        }
      ])
    );
    const missingProductIds = productIds.filter(
      (id) => !productsById.has(Number(id))
    );

    if (missingProductIds.length > 0) {
      throw new AppError("One or more products were not found.", 404, {
        missing_product_ids: missingProductIds
      });
    }

    let totalAmountInCents = 0;
    const insufficientStock = [];

    const orderItems = items.map((item) => {
      const product = productsById.get(Number(item.product_id));
      const unitPriceInCents = Math.round(Number(product.price) * 100);

      if (product.stock < item.quantity) {
        insufficientStock.push({
          product_id: item.product_id,
          product_name: product.product_name,
          available_stock: product.stock,
          requested_quantity: item.quantity
        });
      }

      const lineTotalInCents = unitPriceInCents * item.quantity;
      totalAmountInCents += lineTotalInCents;

      return {
        product_id: item.product_id,
        product_name: product.product_name,
        quantity: item.quantity,
        unit_price: unitPriceInCents / 100,
        line_total: lineTotalInCents / 100
      };
    });

    if (insufficientStock.length > 0) {
      throw new AppError(
        "Insufficient stock for one or more products.",
        409,
        insufficientStock
      );
    }

    const orderResult = await client.query(
      `
        INSERT INTO orders (
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          total_amount
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          total_amount::float AS total_amount,
          created_at
      `,
      [
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        (totalAmountInCents / 100).toFixed(2)
      ]
    );

    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await client.query(
        `
          INSERT INTO order_items (order_id, product_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `,
        [order.id, item.product_id, item.quantity, item.unit_price.toFixed(2)]
      );

      await client.query(
        `
          UPDATE products
          SET stock = stock - $1::int, updated_at = NOW()
          WHERE id = $2::int
        `,
        [item.quantity, item.product_id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order placed successfully.",
      order: {
        ...order,
        items: orderItems
      }
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createOrder
};
