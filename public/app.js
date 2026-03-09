(() => {
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
      const detailMessage = payload.details.map((detail) => {
        if (detail.field && detail.message) {
          return `${detail.field}: ${detail.message}`;
        }
        if (detail.product_name) {
          return `${detail.product_name}: requested ${detail.requested_quantity}, available ${detail.available_stock}`;
        }
        return JSON.stringify(detail);
      }).join(" | ");
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
        ...options.headers || {}
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
    const [placedOrder, setPlacedOrder] = useState(null);
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
    const selectedItems = products.map((product) => {
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
    }).filter(Boolean);
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
        setPlacedOrder(data.order);
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
    return /* @__PURE__ */ React.createElement("div", { className: "page-shell" }, /* @__PURE__ */ React.createElement("header", { className: "hero" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "eyebrow" }, "Backend Developer Practical Assignment"), /* @__PURE__ */ React.createElement("h1", null, "Myura Wellness Inventory and Order Console"), /* @__PURE__ */ React.createElement("p", { className: "hero-copy" }, "Products are stored in PostgreSQL, stock updates happen through the API, and orders are blocked automatically when inventory is insufficient.")), /* @__PURE__ */ React.createElement("button", { className: "secondary-button", onClick: loadProducts, type: "button" }, "Refresh Products")), /* @__PURE__ */ React.createElement("main", { className: "layout" }, /* @__PURE__ */ React.createElement("section", { className: "panel inventory-panel" }, /* @__PURE__ */ React.createElement("div", { className: "panel-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "section-kicker" }, "Task 1"), /* @__PURE__ */ React.createElement("h2", null, "Product List")), /* @__PURE__ */ React.createElement("span", { className: "badge" }, products.length, " products")), isLoadingProducts ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, "Loading products...") : products.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, "No products available yet. Add your first product from the form.") : /* @__PURE__ */ React.createElement("div", { className: "table-wrap" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Product"), /* @__PURE__ */ React.createElement("th", null, "Category"), /* @__PURE__ */ React.createElement("th", null, "Price"), /* @__PURE__ */ React.createElement("th", null, "Stock"))), /* @__PURE__ */ React.createElement("tbody", null, products.map((product) => /* @__PURE__ */ React.createElement("tr", { key: product.id }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, product.product_name)), /* @__PURE__ */ React.createElement("td", null, product.category), /* @__PURE__ */ React.createElement("td", null, formatCurrency(product.price)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: product.stock > 0 ? "stock-pill" : "stock-pill low"
      },
      product.stock
    )))))))), /* @__PURE__ */ React.createElement("section", { className: "panel form-panel" }, /* @__PURE__ */ React.createElement("div", { className: "panel-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "section-kicker" }, "Task 1"), /* @__PURE__ */ React.createElement("h2", null, "Add a Product"))), /* @__PURE__ */ React.createElement("form", { className: "stack", onSubmit: handleProductSubmit }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Product name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "product_name",
        value: productForm.product_name,
        onChange: handleProductFieldChange,
        placeholder: "Ashwagandha Capsules",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Category"), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "category",
        value: productForm.category,
        onChange: handleProductFieldChange,
        placeholder: "Supplements",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "two-column" }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Price"), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "price",
        type: "number",
        min: "0",
        step: "0.01",
        value: productForm.price,
        onChange: handleProductFieldChange,
        placeholder: "799",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Stock"), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "stock",
        type: "number",
        min: "0",
        step: "1",
        value: productForm.stock,
        onChange: handleProductFieldChange,
        placeholder: "25",
        required: true
      }
    ))), /* @__PURE__ */ React.createElement("button", { className: "primary-button", disabled: isSubmittingProduct }, isSubmittingProduct ? "Saving..." : "Add Product")), productFeedback.message ? /* @__PURE__ */ React.createElement("p", { className: `feedback ${productFeedback.type}` }, productFeedback.message) : null), /* @__PURE__ */ React.createElement("section", { className: "panel order-panel" }, /* @__PURE__ */ React.createElement("div", { className: "panel-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "section-kicker" }, "Task 2"), /* @__PURE__ */ React.createElement("h2", null, "Place an Order")), /* @__PURE__ */ React.createElement("span", { className: "order-total" }, formatCurrency(orderTotal))), /* @__PURE__ */ React.createElement("form", { className: "order-layout", onSubmit: handleOrderSubmit }, /* @__PURE__ */ React.createElement("div", { className: "stack" }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Customer name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "customer_name",
        value: orderForm.customer_name,
        onChange: handleOrderFieldChange,
        placeholder: "Riya Sharma",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "two-column" }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Email"), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "customer_email",
        type: "email",
        value: orderForm.customer_email,
        onChange: handleOrderFieldChange,
        placeholder: "riya@example.com",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Phone"), /* @__PURE__ */ React.createElement(
      "input",
      {
        name: "customer_phone",
        value: orderForm.customer_phone,
        onChange: handleOrderFieldChange,
        placeholder: "+91 98765 43210"
      }
    ))), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, "Shipping address"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        name: "shipping_address",
        value: orderForm.shipping_address,
        onChange: handleOrderFieldChange,
        placeholder: "House no, street, city, state, postal code",
        required: true
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "selector-panel" }, /* @__PURE__ */ React.createElement("h3", null, "Choose quantities"), products.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, "Add products before trying to place an order.") : /* @__PURE__ */ React.createElement("div", { className: "selector-list" }, products.map((product) => /* @__PURE__ */ React.createElement("div", { className: "selector-item", key: product.id }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, product.product_name), /* @__PURE__ */ React.createElement("p", null, product.category, " | ", formatCurrency(product.price), " |", " ", product.stock, " in stock")), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "0",
        max: product.stock,
        step: "1",
        value: orderForm.quantities[product.id] || "",
        onChange: (event) => handleQuantityChange(product.id, event.target.value),
        placeholder: "0"
      }
    )))), /* @__PURE__ */ React.createElement("div", { className: "order-summary" }, /* @__PURE__ */ React.createElement("h3", null, "Order summary"), selectedItems.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "muted" }, "No line items selected yet. Enter quantities to build the order.") : /* @__PURE__ */ React.createElement("ul", null, selectedItems.map((item) => /* @__PURE__ */ React.createElement("li", { key: item.product_id }, /* @__PURE__ */ React.createElement("span", null, item.product_name, " x ", item.quantity), /* @__PURE__ */ React.createElement("strong", null, formatCurrency(item.line_total)))))), /* @__PURE__ */ React.createElement("button", { className: "primary-button", disabled: isSubmittingOrder }, isSubmittingOrder ? "Placing order..." : "Place Order"))), orderFeedback.message ? /* @__PURE__ */ React.createElement("p", { className: `feedback ${orderFeedback.type}` }, orderFeedback.message) : null, placedOrder ? /* @__PURE__ */ React.createElement("section", { className: "order-result" }, /* @__PURE__ */ React.createElement("div", { className: "panel-header" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "section-kicker" }, "Latest Order"), /* @__PURE__ */ React.createElement("h3", null, "Order #", placedOrder.id)), /* @__PURE__ */ React.createElement("span", { className: "order-total" }, formatCurrency(placedOrder.total_amount))), /* @__PURE__ */ React.createElement("div", { className: "order-meta" }, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Customer:"), " ", placedOrder.customer_name), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Email:"), " ", placedOrder.customer_email), placedOrder.customer_phone ? /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Phone:"), " ", placedOrder.customer_phone) : null, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Address:"), " ", placedOrder.shipping_address)), /* @__PURE__ */ React.createElement("div", { className: "order-summary placed-order-summary" }, /* @__PURE__ */ React.createElement("h3", null, "Placed items"), /* @__PURE__ */ React.createElement("ul", null, placedOrder.items.map((item) => /* @__PURE__ */ React.createElement("li", { key: `${placedOrder.id}-${item.product_id}` }, /* @__PURE__ */ React.createElement("span", null, item.product_name, " x ", item.quantity), /* @__PURE__ */ React.createElement("strong", null, formatCurrency(item.line_total))))))) : null)));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
