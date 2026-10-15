
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getStockMovements,
  recordStockMovement,
} from "./api";
import type { Product, StockMovement } from "./api";

interface Props {
  product: Product;
  onUpdated: () => Promise<void>;
  onClose: () => void;
}

export default function StockMovementPanel({
  product,
  onUpdated,
  onClose,
}: Props) {
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadHistory() {
    try {
      setHistory(await getStockMovements(product.id));
    } catch {
      setMessage("Could not load movement history.");
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [product.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(quantity);

    if (!Number.isInteger(amount) || amount <= 0) {
      setMessage("Enter a positive whole-number quantity.");
      return;
    }

    if (type === "OUT" && amount > product.quantity) {
      setMessage(`Only ${product.quantity} units are available.`);
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await recordStockMovement(product.id, {
        movement_type: type,
        quantity: amount,
        note: note.trim() || undefined,
      });

      setMessage("Stock movement recorded successfully.");
      setQuantity("1");
      setNote("");
      await loadHistory();
      await onUpdated();
    } catch (error) {
      const detail =
        typeof error === "object" &&
          error !== null &&
          "response" in error
          ? (error as { response?: { data?: { detail?: string } } })
            .response?.data?.detail
          : undefined;

      setMessage(detail || "Could not record the stock movement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <h2>Stock movement</h2>
            <p>{product.name} · SKU {product.sku}</p>
            <p>Current stock: <strong>{product.quantity}</strong> units</p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form className="product-form" onSubmit={submit}>
          <label>
            Movement type
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as "IN" | "OUT")
              }
            >
              <option value="IN">Stock In — receive units</option>
              <option value="OUT">Stock Out — issue units</option>
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>

          <label>
            Note (optional)
            <input
              maxLength={250}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Supplier delivery"
            />
          </label>

          {message && <p role="status">{message}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
            >
              {busy ? "Saving..." : "Record movement"}
            </button>
          </div>
        </form>

        <div className="movement-history">
          <h3>Recent movements</h3>
          {history.length === 0 ? (
            <p>No movement history yet.</p>
          ) : (
            <ul>
              {history.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.movement_type === "IN" ? "+" : "−"}
                    {item.quantity} units
                  </strong>
                  {" · "}
                  {item.note || (item.movement_type === "IN" ? "Stock received" : "Stock issued")}
                  <small>
                    {new Date(item.created_at).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
