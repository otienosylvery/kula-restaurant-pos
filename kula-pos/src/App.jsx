import React, { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";

function App() {
  const menu = [
    { id: 1, name: "Fries", price: 80, category: "Food" },
    { id: 2, name: "Chicken", price: 300, category:"Food" },
    { id: 3, name: "Chicken Smokie", price: 40, category:"Snacks" },
    { id: 4, name: "Steam", price: 50, category: "Drinks" },
    { id: 5, name: "500ml Soda", price: 60, category: "Drinks" },
    { id: 6, name: "300ml Soda", price: 40, category: "Drinks" },
    { id: 7, name: "Afya", price: 80, category: "Drinks" },
  ];

  const categories = ["All", "Food", "Drinks"];
  const[selectedCategory, setSelectedCategory] = useState("All");
  const [order, setOrder] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState([]);
  const [receiptMeta, setReceiptMeta] = useState({
    orderNumber: "",
    date: "",
    time: "",
  });

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

  const removeFromOrder = (id) => {
    setOrder(order.filter((o) => o.id !== id));
  };

  const increaseQuantity = (id) => {
    setOrder(
      order.map((o) =>
        o.id === id ? { ...o, quantity: o.quantity + 1 } : o
      )
    );
  };

  const decreaseQuantity = (id) => {
    setOrder(
      order
        .map((o) =>
          o.id === id ? { ...o, quantity: o.quantity - 1 } : o
        )
        .filter((o) => o.quantity > 0)
    );
  };

  const clearOrder = () => setOrder([]);

  const checkout = () => {
    if (order.length === 0) return;
    const completedOrder = [...order];
    const now = new Date();
    const orderNum = Math.floor(100000 + Math.random() * 900000);
    const totalAmount = (completedOrder.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.16).toFixed(2);
    
    setLastOrder(completedOrder);
    setReceiptMeta({
      orderNumber: orderNum,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    });
    setShowReceipt(true);
    setOrder([]);
    
    // Show success toast
    toast.success(`Order #${orderNum} completed! Total: KSh. ${totalAmount}`, {
      duration: 1500,
      position: 'top-right',
      style: {
        background: '#2c8f4e',
        color: '#fff',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: 'bold',
      },
    });
  };

  const printReceipt = () => window.print();

  const subtotal = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const receiptSubtotal = lastOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const receiptTax = receiptSubtotal * 0.16;
  const receiptTotal = receiptSubtotal + receiptTax;

  return (
    <div className="pos-container">
      <Toaster />
      
      {/* MENU PANEL */}
      <div className="menu-panel">
        <h2>Menu</h2>
        <div className="category-tabs">
          {
            categories.map(cat =>(
              <button
                key={cat}
                className={`category-tab ${selectedCategory ===cat ? "active" : ""}`}
                onClick={()=> setSelectedCategory(cat)}
                >
                  {cat}
              </button>
            ))
          }
        </div>
        <div className="menu-grid">
          {menu
          .filter(item => selectedCategory === "All" || item.category === selectedCategory)
          .map((item) => (
            <button key={item.id} className="menu-item-grid" onClick={() => addToOrder(item)}>
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