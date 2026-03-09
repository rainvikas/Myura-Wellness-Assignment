const { useEffect, useState } = React;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function buildErrorMessage(payload) {
  if (!payload) {
    return "The request could not be completed.";
  }

  if (Array.isArray(payload.details) && payload.details.length > 0) {
    const detailMessage = payload.details
      .map((detail) => {
        if (detail.field && detail.message) {
          return `${detail.field}: ${detail.message}`;
        }

        if (detail.product_name) {
          return `${detail.product_name}: requested ${detail.requested_quantity}, available ${detail.available_stock}`;
        }

        return JSON.stringify(detail);
      })
      .join(" | ");

    return `${payload.message} ${detailMessage}`;
  }

  if (payload.details && payload.details.missing_product_ids) {
    return `${payload.message} Missing IDs: ${payload.details.missing_product_ids.join(", ")}`;
  }

  return payload.message || "The request could not be completed.";
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(buildErrorMessage(payload));
  }

  return payload;
}

function App() {
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productForm, setProductForm] = useState({
    product_name: "",
    price: "",
    category: "",
    stock: ""
  });
  const [orderForm, setOrderForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    quantities: {}
  });
  const [productFeedback, setProductFeedback] = useState({
    type: "",
    message: ""
  });
  const [orderFeedback, setOrderFeedback] = useState({
    type: "",
    message: ""
  });
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  async function loadProducts() {
    setIsLoadingProducts(true);

    try {
      const data = await apiRequest("/api/products");
      setProducts(data.products || []);
    } catch (error) {
      setOrderFeedback({
        type: "error",
        message: `Failed to load products. ${error.message}`
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function handleProductFieldChange(event) {
    const { name, value } = event.target;

    setProductForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleOrderFieldChange(event) {
    const { name, value } = event.target;

    setOrderForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleQuantityChange(productId, value) {
    setOrderForm((current) => ({
      ...current,
      quantities: {
        ...current.quantities,
        [productId]: value
      }
    }));
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    setIsSubmittingProduct(true);
    setProductFeedback({ type: "", message: "" });

    try {
      const payload = {
        product_name: productForm.product_name,
        category: productForm.category,
        price: Number(productForm.price),
        stock: Number(productForm.stock)
      };

      const data = await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setProductFeedback({
        type: "success",
        message: `${data.product.product_name} was added successfully.`
      });
      setProductForm({
        product_name: "",
        price: "",
        category: "",
        stock: ""
      });

      await loadProducts();
    } catch (error) {
      setProductFeedback({
        type: "error",
        message: error.message
      });
    } finally {
      setIsSubmittingProduct(false);
    }
  }

  const selectedItems = products
    .map((product) => {
      const quantity = Number(orderForm.quantities[product.id] || 0);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return null;
      }

      return {
        product_id: product.id,
        product_name: product.product_name,
        quantity,
        unit_price: Number(product.price),
        line_total: Number(product.price) * quantity
      };
    })
    .filter(Boolean);

  const orderTotal = selectedItems.reduce(
    (sum, item) => sum + item.line_total,
    0
  );

  async function handleOrderSubmit(event) {
    event.preventDefault();
    setIsSubmittingOrder(true);
    setOrderFeedback({ type: "", message: "" });

    if (selectedItems.length === 0) {
      setOrderFeedback({
        type: "error",
        message: "Select at least one product quantity before placing an order."
      });
      setIsSubmittingOrder(false);
      return;
    }

    try {
      const payload = {
        customer_name: orderForm.customer_name,
        customer_email: orderForm.customer_email,
        customer_phone: orderForm.customer_phone,
        shipping_address: orderForm.shipping_address,
        items: selectedItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      };

      const data = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setOrderFeedback({
        type: "success",
        message: `Order #${data.order.id} placed successfully for ${formatCurrency(
          data.order.total_amount
        )}.`
      });
      setOrderForm({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        shipping_address: "",
        quantities: {}
      });

      await loadProducts();
    } catch (error) {
      setOrderFeedback({
        type: "error",
        message: error.message
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Backend Developer Practical Assignment</p>
          <h1>Myura Wellness Inventory and Order Console</h1>
          <p className="hero-copy">
            Products are stored in PostgreSQL, stock updates happen through the
            API, and orders are blocked automatically when inventory is
            insufficient.
          </p>
        </div>
        <button className="secondary-button" onClick={loadProducts} type="button">
          Refresh Products
        </button>
      </header>

      <main className="layout">
        <section className="panel inventory-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Task 1</p>
              <h2>Product List</h2>
            </div>
            <span className="badge">{products.length} products</span>
          </div>

          {isLoadingProducts ? (
            <div className="empty-state">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              No products available yet. Add your first product from the form.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.product_name}</strong>
                      </td>
                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <span
                          className={
                            product.stock > 0 ? "stock-pill" : "stock-pill low"
                          }
                        >
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Task 1</p>
              <h2>Add a Product</h2>
            </div>
          </div>

          <form className="stack" onSubmit={handleProductSubmit}>
            <label>
              <span>Product name</span>
              <input
                name="product_name"
                value={productForm.product_name}
                onChange={handleProductFieldChange}
                placeholder="Ashwagandha Capsules"
                required
              />
            </label>

            <label>
              <span>Category</span>
              <input
                name="category"
                value={productForm.category}
                onChange={handleProductFieldChange}
                placeholder="Supplements"
                required
              />
            </label>

            <div className="two-column">
              <label>
                <span>Price</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={handleProductFieldChange}
                  placeholder="799"
                  required
                />
              </label>

              <label>
                <span>Stock</span>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.stock}
                  onChange={handleProductFieldChange}
                  placeholder="25"
                  required
                />
              </label>
            </div>

            <button className="primary-button" disabled={isSubmittingProduct}>
              {isSubmittingProduct ? "Saving..." : "Add Product"}
            </button>
          </form>

          {productFeedback.message ? (
            <p className={`feedback ${productFeedback.type}`}>
              {productFeedback.message}
            </p>
          ) : null}
        </section>

        <section className="panel order-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Task 2</p>
              <h2>Place an Order</h2>
            </div>
            <span className="order-total">{formatCurrency(orderTotal)}</span>
          </div>

          <form className="order-layout" onSubmit={handleOrderSubmit}>
            <div className="stack">
              <label>
                <span>Customer name</span>
                <input
                  name="customer_name"
                  value={orderForm.customer_name}
                  onChange={handleOrderFieldChange}
                  placeholder="Riya Sharma"
                  required
                />
              </label>

              <div className="two-column">
                <label>
                  <span>Email</span>
                  <input
                    name="customer_email"
                    type="email"
                    value={orderForm.customer_email}
                    onChange={handleOrderFieldChange}
                    placeholder="riya@example.com"
                    required
                  />
                </label>

                <label>
                  <span>Phone</span>
                  <input
                    name="customer_phone"
                    value={orderForm.customer_phone}
                    onChange={handleOrderFieldChange}
                    placeholder="+91 98765 43210"
                  />
                </label>
              </div>

              <label>
                <span>Shipping address</span>
                <textarea
                  name="shipping_address"
                  value={orderForm.shipping_address}
                  onChange={handleOrderFieldChange}
                  placeholder="House no, street, city, state, postal code"
                  required
                />
              </label>
            </div>

            <div className="selector-panel">
              <h3>Choose quantities</h3>
              {products.length === 0 ? (
                <div className="empty-state">
                  Add products before trying to place an order.
                </div>
              ) : (
                <div className="selector-list">
                  {products.map((product) => (
                    <div className="selector-item" key={product.id}>
                      <div>
                        <strong>{product.product_name}</strong>
                        <p>
                          {product.category} | {formatCurrency(product.price)} |{" "}
                          {product.stock} in stock
                        </p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={product.stock}
                        step="1"
                        value={orderForm.quantities[product.id] || ""}
                        onChange={(event) =>
                          handleQuantityChange(product.id, event.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="order-summary">
                <h3>Order summary</h3>
                {selectedItems.length === 0 ? (
                  <p className="muted">
                    No line items selected yet. Enter quantities to build the
                    order.
                  </p>
                ) : (
                  <ul>
                    {selectedItems.map((item) => (
                      <li key={item.product_id}>
                        <span>
                          {item.product_name} x {item.quantity}
                        </span>
                        <strong>{formatCurrency(item.line_total)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button className="primary-button" disabled={isSubmittingOrder}>
                {isSubmittingOrder ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </form>

          {orderFeedback.message ? (
            <p className={`feedback ${orderFeedback.type}`}>
              {orderFeedback.message}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
