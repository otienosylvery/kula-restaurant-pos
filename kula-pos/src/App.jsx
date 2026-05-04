import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";
// import { set } from "mongoose";

const API_BASE_URL = "http://localhost:5000";

async function createOrder(payload) {
  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("✅ Order creation response:", data);

  if (!res.ok) {
    throw new Error(data.error || "Failed to create order");
  }


  // ✅ IMPORTANT
  return data.orderId;
}
async function initiateMpesaPayment(orderId, phoneNumber) {
  console.log(orderId, phoneNumber);
  if (!orderId || !phoneNumber) {
    throw new Error("orderId and phoneNumber are required to initiate M-Pesa payment");
  }
  const res = await fetch(`${API_BASE_URL}/api/payments/mpesa/stk-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, phoneNumber }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function fetchOrderStatus(orderId) {
  const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const App = () => {

  //Phone Number state for M-Pesa
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

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
    paymentMethod: "",
    paymentStatus: "",
  });
  const [paymentMethod, setPaymentMethod] = useState(null); // Default to null so the user can selectby themselves

  // Add / remove / quantity functions
  const addToOrder = (item) => {
    const existing = order.find((o) => o.id === item.id);
    if (existing) {
      setOrder(
        order.map((o) =>
          o.id === item.id ? { ...o, quantity: o.quantity + 1 } : o,
        ),
      );
    } else {
      setOrder([...order, { ...item, quantity: 1 }]);
    }
  };

  const removeFromOrder = (id) => setOrder(order.filter((o) => o.id !== id));
  const increaseQuantity = (id) =>
    setOrder(
      order.map((o) => (o.id === id ? { ...o, quantity: o.quantity + 1 } : o)),
    );
  const decreaseQuantity = (id) =>
    setOrder(
      order
        .map((o) => (o.id === id ? { ...o, quantity: o.quantity - 1 } : o))
        .filter((o) => o.quantity > 0),
    );

  const clearOrder = () => setOrder([]);

  // Totals
  const subtotal = order.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const receiptSubtotal = lastOrder.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const receiptTax = receiptSubtotal * 0.16;
  const receiptTotal = receiptSubtotal + receiptTax;

    const finalizedReceipt = (orderData, paymentStatus) => {
      const now = new Date();

      setLastOrder(order);
      setReceiptMeta({
        orderNumber: orderData._id || orderData.orderId || Math.floor(100000 + Math.random() * 900000),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        paymentMethod,
        paymentStatus: paymentStatus,
      });

      setOrder([]);
      setShowReceipt(true);
      setProcessingPayment(false);
      setPaymentMethod(null);
      setPhoneNumber("");
    };

  // Checkout function with backend POST
  const checkout = async () => {
    if (order.length === 0 || !paymentMethod ) return;

    if (paymentMethod === "mpesa" && phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number for M-Pesa");
      return;
    }

    setProcessingPayment(true);

    try{
      const orderPayload ={
        items: order.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        tax,
        total,
        paymentMethod,
        // paymentStatus: paymentMethod === "cash" ? "paid" : "pending",
        // createdAt: new Date().toISOString(),
      };

      //create order in backend
      const orderId= await createOrder(orderPayload);
      // const orderId = createdOrder;
      console.log("✅ Order created with ID:", orderId);

      if(paymentMethod === "mpesa"){
        //initiate mpesa payment
        await initiateMpesaPayment(orderId, phoneNumber);
        console.log("📱 M-Pesa payment initiated for order ID:", orderId);
        toast.success("M-Pesa payment initiated! Check your phone to complete the transaction.", {
          duration: 5000,
          position: "top-right",
        });

        //poll for payment status
        const poll = setInterval(async () => {
          const updated= await fetchOrderStatus(orderId);
          console.log("🔄 Polled order status:", updated);

          if(updated.paymentStatus === "paid"){
            clearInterval(poll);
            finalizedReceipt(updated, "paid");
          }
          if (updated.paymentStatus === "failed"){
            clearInterval(poll);
            toast.error("M-Pesa payment failed. Please try again.");
            setProcessingPayment(false);
          }
        }, 3000);
        return; // Exit early since receipt will be handled after payment confirmation
      }

      // For cash payments, finalize receipt immediately
      finalizedReceipt({items: order}, "paid");
    } catch (err) {
      console.error("🔥 Checkout error:", err);
      toast.error("Checkout failed: " + err.message); 
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
            .filter(
              (item) =>
                selectedCategory === "All" ||
                item.category === selectedCategory,
            )
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
              <span className="item-price">
                KSh. {item.price * item.quantity}
              </span>
            </div>
            <div className="quantity-controls">
              <button onClick={() => decreaseQuantity(item.id)}>-</button>
              <span className="quantity">{item.quantity}</span>
              <button onClick={() => increaseQuantity(item.id)}>+</button>
            </div>
            <button
              className="remove-btn"
              onClick={() => removeFromOrder(item.id)}
            >
              ✕
            </button>
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
        {order.length > 0 && (
          <div className="payment-selector">
            <button
              className={`payment-card ${paymentMethod === "cash" ? "active" : ""}`}
              onClick={() => setPaymentMethod("cash")}
            >
              <span className="payment-icon">💵</span>
              <span className="payment-label">Cash</span>
            </button>

            <button
              className={`payment-card ${paymentMethod === "mpesa" ? "active" : ""}`}
              onClick={() => setPaymentMethod("mpesa")}
            >
              <span className="payment-icon">📱</span>
              <span className="payment-label">M-Pesa</span>
            </button>
          </div>
          
        )}
        {paymentMethod === "mpesa" && (
  <div className="mpesa-phone-wrapper">
    <input
      type="tel"
      className="mpesa-input"
      placeholder="07XXXXXXXX"
      value={phoneNumber}
      onChange={(e) => setPhoneNumber(e.target.value)}
    />
  </div>
)}

        {/* ACTION BAR */}
        {order.length > 0 && !paymentMethod && (
          <div className="payment-warning">
            Select a payment method to continue
          </div>
        )}
        <div className="action-bar">
          <button className="clear-btn" onClick={clearOrder}>
            Clear Order
          </button>
          <button
            className="checkout-btn"
            onClick={() => {
              checkout();
              // setPaymentMethod(null);
            }}
            disabled={processingPayment ||order.length === 0 || !paymentMethod}
          >
            {processingPayment ? "Processing..." : "Checkout"}
          </button>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {showReceipt && (
        <div className="receipt-overlay">
          <div className="receipt-modal">
            <h2>Receipt</h2>
            <div className="receipt-header">
              <div className="business-name">Yola Bites Eatery</div>
              <div className="business-address">
                Stadium Road, Nyandiwa, Kenya.
              </div>
              <div>Order #: {receiptMeta.orderNumber}</div>
              <div className="receipt-payment">
                Payment:
                <span className={`payment-badge ${receiptMeta.paymentStatus}`}>
                  {receiptMeta.paymentMethod.toUpperCase()} -{" "}
                  {receiptMeta.paymentStatus.toUpperCase()}
                </span>
              </div>
              <div>{receiptMeta.date}</div>
              <div>{receiptMeta.time}</div>
            </div>
            <hr />

            {lastOrder.map((item) => (
              <div key={item.id} className="receipt-item">
                <span>
                  {item.name} x {item.quantity}
                </span>
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
              <button className="print-btn" onClick={printReceipt}>
                Print Receipt
              </button>
              <button
                className="new-order-btn"
                onClick={() => {
                  setShowReceipt(false);
                  setLastOrder([]);
                  setReceiptMeta({
                    orderNumber: "",
                    date: "",
                    time: "",
                  });
                }}
              >
                New Order
              </button>
            </div>
            <div className="receipt-footer">
              <p>
                <span style={{ fontStyle: "italic", fontWeight: "bold" }}>
                  Sip. Bite. Smile.
                </span>
              </p>
              <p>Thank you for dining with us!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
