const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const request = require("supertest");
const { newDb } = require("pg-mem");

const app = require("../src/app");
const database = require("../src/config/database");

const schemaPath = path.join(__dirname, "..", "src", "db", "schema.sql");
const rawSchema = fs.readFileSync(schemaPath, "utf8");
const schemaForTests = rawSchema
  .replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql;\s*/m, "")
  .replace(/DROP TRIGGER IF EXISTS[\s\S]*?EXECUTE FUNCTION set_updated_at\(\);\s*/m, "");

function createInMemoryPool() {
  const db = newDb({
    autoCreateForeignKeyIndices: true
  });
  const adapter = db.adapters.createPg();
  return new adapter.Pool();
}

async function resetDatabase() {
  await database.closePool();
  const pool = createInMemoryPool();
  database.setPool(pool);
  await database.query(schemaForTests);
}

test.beforeEach(async () => {
  await resetDatabase();
});

test.after(async () => {
  await database.closePool();
});

test("GET /api/health returns service status", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("POST /api/products creates a product and GET /api/products returns it", async () => {
  const createResponse = await request(app).post("/api/products").send({
    product_name: "Ashwagandha Capsules",
    price: 799,
    category: "Supplements",
    stock: 25
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.product.product_name, "Ashwagandha Capsules");

  const listResponse = await request(app).get("/api/products");

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.products.length, 1);
  assert.equal(listResponse.body.products[0].stock, 25);
});

test("PUT /api/products/:id/stock updates stock", async () => {
  const createResponse = await request(app).post("/api/products").send({
    product_name: "Turmeric Extract",
    price: 499,
    category: "Supplements",
    stock: 18
  });

  const updateResponse = await request(app)
    .put(`/api/products/${createResponse.body.product.id}/stock`)
    .send({ stock: 12 });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.product.stock, 12);
});

test("POST /api/orders creates an order and reduces stock", async () => {
  const firstProduct = await request(app).post("/api/products").send({
    product_name: "Ashwagandha Capsules",
    price: 799,
    category: "Supplements",
    stock: 10
  });
  const secondProduct = await request(app).post("/api/products").send({
    product_name: "Turmeric Extract",
    price: 499,
    category: "Supplements",
    stock: 5
  });

  const orderResponse = await request(app).post("/api/orders").send({
    customer_name: "Riya Sharma",
    customer_email: "riya@example.com",
    customer_phone: "+91 98765 43210",
    shipping_address: "12 MG Road, Bengaluru, Karnataka 560001",
    items: [
      {
        product_id: firstProduct.body.product.id,
        quantity: 2
      },
      {
        product_id: secondProduct.body.product.id,
        quantity: 1
      }
    ]
  });

  assert.equal(orderResponse.status, 201);
  assert.equal(orderResponse.body.order.items.length, 2);
  assert.equal(orderResponse.body.order.total_amount, 2097);

  const listResponse = await request(app).get("/api/products");
  const updatedProducts = listResponse.body.products;

  assert.equal(updatedProducts[0].stock, 8);
  assert.equal(updatedProducts[1].stock, 4);
});

test("POST /api/orders blocks orders when stock is insufficient", async () => {
  const productResponse = await request(app).post("/api/products").send({
    product_name: "Neem Oil",
    price: 299,
    category: "Personal Care",
    stock: 1
  });

  const orderResponse = await request(app).post("/api/orders").send({
    customer_name: "Aarav Mehta",
    customer_email: "aarav@example.com",
    shipping_address: "44 Park Street, Kolkata 700016",
    items: [
      {
        product_id: productResponse.body.product.id,
        quantity: 2
      }
    ]
  });

  assert.equal(orderResponse.status, 409);
  assert.equal(
    orderResponse.body.message,
    "Insufficient stock for one or more products."
  );
  assert.equal(orderResponse.body.details[0].available_stock, 1);

  const listResponse = await request(app).get("/api/products");
  assert.equal(listResponse.body.products[0].stock, 1);
});

test("validation errors return 400 for invalid product payloads", async () => {
  const response = await request(app).post("/api/products").send({
    product_name: "",
    price: -5,
    category: "",
    stock: -1
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Validation failed.");
  assert.ok(Array.isArray(response.body.details));
  assert.ok(response.body.details.length >= 4);
});

test("parameterized queries prevent SQL injection payloads from breaking the products table", async () => {
  const injectionName = "Oil'); DROP TABLE products; --";

  const createResponse = await request(app).post("/api/products").send({
    product_name: injectionName,
    price: 399,
    category: "Wellness",
    stock: 7
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.product.product_name, injectionName);

  const listResponse = await request(app).get("/api/products");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.products.length, 1);
});
