import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";

function App() {
  // Menu state
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);

  // Fetch menu from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/menu")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch menu");
        return res.json();
      })
      .then((data) => {
        const formatted = data.map((item) => ({
          id: item._id,
          name: item.name,
          price: item.price,
          category: item.category,
        }));
        setMenu(formatted);
        setMenuLoading(false);
      })
      .catch((err) => {
        setMenuError(err.message);
        setMenuLoading(false);
      });
  }, []);

  // POS states
  const categories = ["All", "Food", "Drinks"];
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [order, setOrder] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState([]);
  const [receiptMeta, setReceiptMeta] = useState({
    orderNumber: "",
    date: "",
    time: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cash"); // Default to cash

  // Add / remove / quantity functions
  const addToOrder = (item) => {
    const existing = order.find((o) => o.id === item.id);
    if (existing) {
      setOrder(
        order.map((o) =>
          o.id === item.id ? { ...o, quantity: o.quantity + 1 } : o
        )
      );
    } else {
      setOrder([...order, { ...item, quantity: 1 }]);
    }
  };

  const removeFromOrder = (id) => setOrder(order.filter((o) => o.id !== id));
  const increaseQuantity = (id) =>
    setOrder(
      order.map((o) =>
        o.id === id ? { ...o, quantity: o.quantity + 1 } : o
      )
    );
  const decreaseQuantity = (id) =>
    setOrder(
      order
        .map((o) =>
          o.id === id ? { ...o, quantity: o.quantity - 1 } : o
        )
        .filter((o) => o.quantity > 0)
    );

  const clearOrder = () => setOrder([]);

  // Totals
  const subtotal = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const receiptSubtotal = lastOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const receiptTax = receiptSubtotal * 0.16;
  const receiptTotal = receiptSubtotal + receiptTax;

  // Checkout function with backend POST
  const checkout = async () => {
  if (order.length === 0) return;

  // 🔒 Freeze order BEFORE clearing state
  const orderSnapshot = [...order];

  const now = new Date();
  const orderNum = Math.floor(100000 + Math.random() * 900000);

  const subtotal = orderSnapshot.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  console.log("🧾 Sending order to backend:", {
    items: orderSnapshot,
    subtotal,
    tax,
    total,
  });

  try {
    const res = await fetch("http://localhost:5000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: orderSnapshot.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        tax,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === "cash" ? "paid" : "pending",
        createdAt: now.toISOString(),
      }),
    });

    console.log("📡 Backend response status:", res.status);

    const responseText = await res.text();
    console.log("📩 Backend response body:", responseText);

    if (!res.ok) {
      throw new Error(responseText || "Backend error");
    }

    // ✅ Only show receipt AFTER backend success
    setLastOrder(orderSnapshot);
    setReceiptMeta({
      orderNumber: orderNum,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    });

    setShowReceipt(true);
    setOrder([]);

    toast.success(`Order #${orderNum} completed!`, {
      duration: 1500,
      position: "top-right",
    });

  } catch (err) {
    console.error("🔥 Checkout error:", err);
    toast.error("Failed to save order");
  }
};

  const printReceipt = () => window.print();

  // Loading / error handling
  if (menuLoading) return <p>Loading menu...</p>;
  if (menuError) return <p>Error loading menu: {menuError}</p>;

  return (
    <div className="pos-container">
      <Toaster />

      {/* MENU PANEL */}
      <div className="menu-panel">
        <h2>Menu</h2>
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="menu-grid">
          {menu
            .filter((item) => selectedCategory === "All" || item.category === selectedCategory)
            .map((item) => (
              <button
                key={item.id}
                className="menu-item-grid"
                onClick={() => addToOrder(item)}
              >
                <div>{item.name}</div>
                <div className="price">KSh. {item.price}</div>
              </button>
            ))}
        </div>
      </div>

      {/* ORDER PANEL */}
      <div className="order">
        <h2>Current Order</h2>
        {order.length === 0 && <p>No items yet</p>}
        {order.map((item) => (
          <div key={item.id} className="order-item">
            <div className="item-info">
              <span className="item-name">{item.name}</span>
              <span className="item-price">KSh. {item.price * item.quantity}</span>
            </div>
            <div className="quantity-controls">
              <button onClick={() => decreaseQuantity(item.id)}>-</button>
              <span className="quantity">{item.quantity}</span>
              <button onClick={() => increaseQuantity(item.id)}>+</button>
            </div>
            <button className="remove-btn" onClick={() => removeFromOrder(item.id)}>✕</button>
          </div>
        ))}

        {/* TOTALS */}
        <div className="totals">
          <div className="total-row">
            <span>Subtotal</span>
            <span>KSh. {subtotal.toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>Tax (16%)</span>
            <span>KSh. {tax.toFixed(2)}</span>
          </div>
          <div className="total-row total-final">
            <span>Total</span>
            <span>KSh. {total.toFixed(2)}</span>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="action-bar">
          <button className="clear-btn" onClick={clearOrder}>Clear Order</button>
          <div className="payment-method">
            <label>
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              Cash
            </label>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                value="mpesa"
                checked={paymentMethod === "mpesa"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              M-Pesa
            </label>
          </div>
          <button className="checkout-btn" onClick={checkout} disabled={order.length === 0}>Checkout</button>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {showReceipt && (
        <div className="receipt-overlay">
          <div className="receipt-modal">
            <h2>Receipt</h2>
            <div className="receipt-header">
              <div className="business-name">Yola Bites Eatery</div>
              <div className="business-address">Stadium Road, Nyandiwa, Kenya.</div>
              <div>Order #: {receiptMeta.orderNumber}</div>
              <div>{receiptMeta.date}</div>
              <div>{receiptMeta.time}</div>
            </div>
            <hr />
            {lastOrder.map((item) => (
              <div key={item.id} className="receipt-item">
                <span>{item.name} x {item.quantity}</span>
                <span>KSh. {item.price * item.quantity}</span>
              </div>
            ))}
            <hr />
            <div className="receipt-row">
              <span>Subtotal</span>
              <span>KSh. {receiptSubtotal.toFixed(2)}</span>
            </div>
            <div className="receipt-row">
              <span>Tax (16%)</span>
              <span>KSh. {receiptTax.toFixed(2)}</span>
            </div>
            <div className="receipt-row receipt-final">
              <span>Total</span>
              <span>KSh. {receiptTotal.toFixed(2)}</span>
            </div>
            <div className="receipt-actions">
              <button className="print-btn" onClick={printReceipt}>Print Receipt</button>
              <button className="new-order-btn" onClick={() => setShowReceipt(false)}>New Order</button>
            </div>
            <div className="receipt-footer">
              <p><span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>Sip. Bite. Smile.</span></p>
              <p>Thank you for dining with us!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;