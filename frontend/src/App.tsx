import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "./api";
import type { Product, ProductCreate } from "./api";
import StockMovementPanel from "./StockMovementPanel";
import "./App.css";


type Category = "Electronics" | "Stationery" | "Furniture";
type ProductForm = {
  name: string;
  sku: string;
  category: Category;
  price: string;
  quantity: string;
  threshold: string;
};
type StockFilter = "All stock" | "In stock" | "Low stock";
type Page = "dashboard" | "inventory" | "low-stock";

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  category: "Electronics",
  price: "",
  quantity: "",
  threshold: "5",
};

const money = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

function errorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as {
      response?: { data?: { detail?: unknown } };
    }).response;
    const detail = response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All stock");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
      setNotice("");
    } catch (error) {
      setNotice(`Could not load inventory: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const toNumber = (value: string | number) => Number(value);

  const lowStock = products.filter(
    (product) => product.quantity <= product.low_stock_threshold,
  ).length;

  const totalUnits = products.reduce(
    (sum, product) => sum + product.quantity,
    0,
  );

  const inventoryValue = products.reduce(
    (sum, product) => sum + toNumber(product.price) * product.quantity,
    0,
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        `${product.name} ${product.sku}`.toLowerCase().includes(query);
      const matchesCategory =
        category === "All categories" || product.category === category;
      const isLow = product.quantity <= product.low_stock_threshold;
      const effectiveStockFilter: StockFilter =
        activePage === "low-stock" ? "Low stock" : stockFilter;
      const matchesStock =
        effectiveStockFilter === "All stock" ||
        (effectiveStockFilter === "Low stock" && isLow) ||
        (effectiveStockFilter === "In stock" && !isLow);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, category, stockFilter, activePage]);

  function updateField(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function openAddProduct() {
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setNotice("");
    setShowForm(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: (product.category as Category) || "Electronics",
      price: String(product.price),
      quantity: String(product.quantity),
      threshold: String(product.low_stock_threshold),
    });
    setNotice("");
    setShowForm(true);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const sku = form.sku.trim();
    const price = Number(form.price);
    const quantity = Number(form.quantity);
    const threshold = Number(form.threshold);

    if (!name || !sku) {
      setNotice("Product name and SKU are required.");
      return;
    }

    if (
      products.some(
        (product) =>
          product.id !== editingProduct?.id &&
          product.sku.toLowerCase() === sku.toLowerCase(),
      )
    ) {
      setNotice("This SKU already exists. Please use a unique SKU.");
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !Number.isInteger(threshold) ||
      threshold < 0
    ) {
      setNotice("Enter a valid price, quantity, and stock threshold.");
      return;
    }

    const payload: ProductCreate = {
      name,
      sku,
      category: form.category,
      price: price.toFixed(2),
      quantity,
      low_stock_threshold: threshold,
    };

    setSaving(true);
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload);
        setProducts((previous) =>
          previous.map((product) => product.id === updated.id ? updated : product),
        );
        setNotice(`${updated.name} updated successfully.`);
      } else {
        const created = await createProduct(payload);
        setProducts((previous) => [created, ...previous]);
        setNotice("Product added and saved to the database.");
      }
      setForm({ ...emptyForm });
      setEditingProduct(null);
      setShowForm(false);
    } catch (error) {
      setNotice(
        `${editingProduct ? "Could not update product" : "Could not add product"}: ${errorMessage(error)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: number) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (!window.confirm(`Delete ${product.name}?`)) return;

    try {
      await deleteProduct(id);
      setProducts((previous) => previous.filter((item) => item.id !== id));
      setNotice(`${product.name} deleted from inventory.`);
    } catch (error) {
      setNotice(`Could not delete product: ${errorMessage(error)}`);
    }
  }

  function exportProducts() {
    const headers = ["SKU", "Name", "Category", "Price", "Quantity", "Threshold"];
    const rows = products.map((product) => [
      product.sku,
      product.name,
      product.category,
      product.price,
      product.quantity,
      product.low_stock_threshold,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stockpilot-inventory.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Inventory CSV exported.");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard">
          <span className="brand-icon">S</span>
          <span>
            stock<span className="brand-light">pilot</span>
          </span>
        </a>

        <p className="nav-label">WORKSPACE</p>
        <button
          className={`nav-item nav-button ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => {
            setActivePage("dashboard");
            setStockFilter("All stock");
            setSearch("");
            setCategory("All categories");
          }}
        >
          <span>▦</span> Dashboard
        </button>
        <button
          className={`nav-item nav-button ${activePage === "inventory" ? "active" : ""}`}
          onClick={() => {
            setActivePage("inventory");
            setStockFilter("All stock");
          }}
        >
          <span>▤</span> Inventory
        </button>
        <button
          className={`nav-item nav-button ${activePage === "low-stock" ? "active" : ""}`}
          onClick={() => {
            setActivePage("low-stock");
            setStockFilter("Low stock");
          }}
        >
          <span>⚠</span> Low stock
          {lowStock > 0 && <span className="nav-count">{lowStock}</span>}
        </button>

        <div className="sidebar-bottom">
          <div className="project-chip">
            <span className="status-dot" />
            <div>
              <strong>Live inventory</strong>
              <small>Connected to StockPilot API</small>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">SP</div>
            <div>
              <strong>StockPilot Admin</strong>
              <small>Inventory manager</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {activePage === "dashboard" ? "Overview" : activePage === "inventory" ? "Inventory" : "Low stock"}
          </div>
          <div className="topbar-right">
            <span className="live-indicator">
              <span /> API connected
            </span>
            <div className="avatar">SP</div>
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{activePage === "dashboard" ? "INVENTORY OVERVIEW" : activePage === "inventory" ? "PRODUCT MANAGEMENT" : "STOCK ALERTS"}</p>
              <h1>
                {activePage === "dashboard" ? <>Good to see you <span>👋</span></> : activePage === "inventory" ? "Inventory" : "Low-stock items"}
              </h1>
              <p className="subtitle">
                {activePage === "dashboard"
                  ? "Here’s what’s happening with your inventory today."
                  : activePage === "inventory"
                    ? "Add, edit, search, and manage all your products."
                    : "Products at or below their configured stock threshold."}
              </p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary" onClick={exportProducts}>
                ↓ Export CSV
              </button>
              {activePage !== "low-stock" && (
                <button className="button button-primary" onClick={openAddProduct}>
                  + Add product
                </button>
              )}
            </div>
          </div>

          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss notification">
                ×
              </button>
            </div>
          )}

          {activePage === "dashboard" && <section className="stats-grid">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Total products</span>
                <span className="stat-icon purple">▤</span>
              </div>
              <strong className="stat-number">{products.length}</strong>
              <p className="stat-foot">Unique product listings</p>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Units in stock</span>
                <span className="stat-icon blue">▦</span>
              </div>
              <strong className="stat-number">
                {totalUnits.toLocaleString("en-IN")}
              </strong>
              <p className="stat-foot">Across all products</p>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Inventory value</span>
                <span className="stat-icon green">₹</span>
              </div>
              <strong className="stat-number">{money(inventoryValue)}</strong>
              <p className="stat-foot">Based on current quantities</p>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Low-stock items</span>
                <span className="stat-icon orange">⚠</span>
              </div>
              <strong className="stat-number">{lowStock}</strong>
              <p className="stat-foot">
                {lowStock ? "Need attention soon" : "All stock levels look good"}
              </p>
            </article>
          </section>}

          <section className="inventory-panel" id="inventory">
            <div className="panel-heading">
              <div>
                <h2>{activePage === "low-stock" ? "Low-stock inventory" : activePage === "inventory" ? "All products" : "Product inventory"}</h2>
                <p>{activePage === "low-stock" ? "Review products that need replenishment." : "Manage and monitor your available stock."}</p>
              </div>
              <span className="product-count">
                {filteredProducts.length} products
              </span>
            </div>

            <div className="filters">
              <label className="search-box">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Search by product or SKU..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
              >
                <option>All categories</option>
                <option>Electronics</option>
                <option>Stationery</option>
                <option>Furniture</option>
              </select>
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as StockFilter)}
                aria-label="Filter by stock level"
              >
                <option>All stock</option>
                <option>In stock</option>
                <option>Low stock</option>
              </select>
              <button
                className="button button-secondary"
                onClick={() => void loadProducts()}
                disabled={loading || saving}
              >
                {loading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>SKU</th>
                    <th>CATEGORY</th>
                    <th>UNIT PRICE</th>
                    <th>QUANTITY</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="empty-state">Loading inventory…</td>
                    </tr>
                  ) : filteredProducts.map((product) => {
                    const isLow = product.quantity <= product.low_stock_threshold;
                    const avatarCategory = String(product.category).toLowerCase();
                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="product-cell">
                            <span className={`product-avatar avatar-${avatarCategory}`}>
                              {product.name.charAt(0).toUpperCase()}
                            </span>
                            <strong>{product.name}</strong>
                          </div>
                        </td>
                        <td className="sku">{product.sku}</td>
                        <td>
                          <span className="category-pill">{product.category}</span>
                        </td>
                        <td>{money(toNumber(product.price))}</td>
                        <td>
                          <strong>{product.quantity}</strong>{" "}
                          <span className="muted">units</span>
                          <button
                            className="text-action"
                            onClick={() => openEditProduct(product)}
                            disabled={saving}
                            title="Edit product details"
                          >
                            Edit
                          </button>
                          <button
                            className="text-action"
                            onClick={() => setMovementProduct(product)}
                            disabled={saving}
                            title="Record stock in or stock out"
                          >
                            Stock in/out
                          </button>
                        </td>
                        <td>
                          <span className={`stock-badge ${isLow ? "stock-low" : "stock-good"}`}>
                            <span />
                            {isLow ? "Low stock" : "In stock"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            title={`Delete ${product.name}`}
                            aria-label={`Delete ${product.name}`}
                            onClick={() => void removeProduct(product.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        No products match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Showing {filteredProducts.length} of {products.length} products
              </span>
              <span>
                StockPilot <span className="footer-dot">•</span> Inventory management
              </span>
            </div>
          </section>

          <footer className="page-footer">
            <span>© 2026 StockPilot</span>
            <span>Built for smarter inventory management.</span>
          </footer>
        </section>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) { setShowForm(false); setEditingProduct(null); }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="modal-title">{editingProduct ? "Edit product" : "Add a product"}</h2>
                <p>{editingProduct ? "Update the product details below." : "Enter the details for a new inventory item."}</p>
              </div>
              <button
                className="close-button"
                onClick={() => { setShowForm(false); setEditingProduct(null); }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form className="product-form" onSubmit={saveProduct}>
              <label>
                Product name
                <input
                  name="name"
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. Wireless Headphones"
                />
              </label>
              <label>
                SKU
                <input
                  name="sku"
                  required
                  maxLength={50}
                  value={form.sku}
                  onChange={updateField}
                  placeholder="e.g. WH-1007"
                />
              </label>
              <label>
                Category
                <select name="category" value={form.category} onChange={updateField}>
                  <option value="Electronics">Electronics</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Furniture">Furniture</option>
                </select>
              </label>
              <div className="form-row">
                <label>
                  Unit price (₹)
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={updateField}
                  />
                </label>
                <label>
                  Quantity
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.quantity}
                    onChange={updateField}
                  />
                </label>
              </div>
              <label>
                Low-stock threshold
                <input
                  name="threshold"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.threshold}
                  onChange={updateField}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => { setShowForm(false); setEditingProduct(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? "Saving..." : editingProduct ? "Save changes" : "Add product"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {movementProduct && (
        <StockMovementPanel
          product={movementProduct}
          onUpdated={async () => {
            await loadProducts();
            setMovementProduct(null);
          }}
          onClose={() => setMovementProduct(null)}
        />
      )}
    </div>
  );
}

export default App;
