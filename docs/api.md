# API Documentation

Base URL:

```text
http://localhost:5000
```

## Health Check

### `GET /api/health`

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-08T10:00:00.000Z"
}
```

## Products

### `GET /api/products`

Returns all products.

Success response:

```json
{
  "products": [
    {
      "id": 1,
      "product_name": "Ashwagandha Capsules",
      "price": 799,
      "category": "Supplements",
      "stock": 25,
      "created_at": "2026-03-08T10:00:00.000Z",
      "updated_at": "2026-03-08T10:00:00.000Z"
    }
  ]
}
```

### `POST /api/products`

Creates a new product.

Request body:

```json
{
  "product_name": "Turmeric Extract",
  "price": 499,
  "category": "Supplements",
  "stock": 18
}
```

Success response:

```json
{
  "message": "Product created successfully.",
  "product": {
    "id": 2,
    "product_name": "Turmeric Extract",
    "price": 499,
    "category": "Supplements",
    "stock": 18,
    "created_at": "2026-03-08T10:00:00.000Z",
    "updated_at": "2026-03-08T10:00:00.000Z"
  }
}
```

Validation errors:

- `400 Bad Request` for invalid payload

### `PUT /api/products/:id/stock`

Sets the product stock to a new absolute value.

Request body:

```json
{
  "stock": 12
}
```

Success response:

```json
{
  "message": "Product stock updated successfully.",
  "product": {
    "id": 2,
    "product_name": "Turmeric Extract",
    "price": 499,
    "category": "Supplements",
    "stock": 12,
    "created_at": "2026-03-08T10:00:00.000Z",
    "updated_at": "2026-03-08T10:05:00.000Z"
  }
}
```

Possible errors:

- `400 Bad Request` for invalid `id` or `stock`
- `404 Not Found` if the product does not exist

## Orders

### `POST /api/orders`

Creates an order, inserts order items, and decrements stock in the same database transaction.

Request body:

```json
{
  "customer_name": "Riya Sharma",
  "customer_email": "riya@example.com",
  "customer_phone": "+91 98765 43210",
  "shipping_address": "12 MG Road, Bengaluru, Karnataka 560001",
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    },
    {
      "product_id": 2,
      "quantity": 1
    }
  ]
}
```

Success response:

```json
{
  "message": "Order placed successfully.",
  "order": {
    "id": 1,
    "customer_name": "Riya Sharma",
    "customer_email": "riya@example.com",
    "customer_phone": "+91 98765 43210",
    "shipping_address": "12 MG Road, Bengaluru, Karnataka 560001",
    "total_amount": 2097,
    "created_at": "2026-03-08T10:10:00.000Z",
    "items": [
      {
        "product_id": 1,
        "product_name": "Ashwagandha Capsules",
        "quantity": 2,
        "unit_price": 799,
        "line_total": 1598
      },
      {
        "product_id": 2,
        "product_name": "Turmeric Extract",
        "quantity": 1,
        "unit_price": 499,
        "line_total": 499
      }
    ]
  }
}
```

Possible errors:

- `400 Bad Request` for invalid customer fields or invalid items
- `404 Not Found` if one or more products do not exist
- `409 Conflict` if requested quantity exceeds available stock
- `500 Internal Server Error` for unexpected server failures

Example insufficient stock response:

```json
{
  "message": "Insufficient stock for one or more products.",
  "details": [
    {
      "product_id": 1,
      "product_name": "Ashwagandha Capsules",
      "available_stock": 1,
      "requested_quantity": 2
    }
  ]
}
```
