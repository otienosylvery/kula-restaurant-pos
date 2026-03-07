import React, { useState } from "react";
import "./App.css";

function App() {
  const menu = [
    { id: 1, name: "Fries", price: 80 },
    { id: 2, name: "Chicken", price: 300 },
    { id: 3, name: "Chicken Smokie", price: 40 },
    { id: 4, name: "Steam", price: 50 },
    { id: 5, name: "500ml Soda", price: 60 },
    { id: 6, name: "300ml Soda", price: 40 },
    { id: 7, name: "Afya", price: 80 },
  ];

  const [order, setOrder] = useState([]);

  // Add item to order
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

  // Remove item completely
  const removeFromOrder = (id) => {
    setOrder(order.filter((o) => o.id !== id));
  };

  // Increase quantity
  const increaseQuantity = (id) => {
    setOrder(
      order.map((o) =>
        o.id === id ? { ...o, quantity: o.quantity + 1 } : o
      )
    );
  };

  // Decrease quantity
  const decreaseQuantity = (id) => {
    setOrder(
      order
        .map((o) =>
          o.id === id ? { ...o, quantity: o.quantity - 1 } : o
        )
        .filter((o) => o.quantity > 0)
    );
  };

  // Calculations
  const subtotal = order.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const taxRate = 0.16;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div className="pos-container">
      
      {/* MENU PANEL */}
      <div className="menu">
        <h2>Menu</h2>

        {menu.map((item) => (
          <button
            key={item.id}
            className="menu-item"
            onClick={() => addToOrder(item)}
          >
            {item.name} - KSh. {item.price}
          </button>
        ))}
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

        {/* TOTALS SECTION */}
        <div className="totals">
          <div className="total-row">
            <span>Subtotal </span>
            <span>KSh. {subtotal.toFixed(2)}</span>
          </div>

          <div className="total-row">
            <span>Tax (16%) </span>
            <span>KSh. {tax.toFixed(2)}</span>
          </div>

          <div className="total-row total-final">
            <span>Total </span>
            <span>KSh. {total.toFixed(2)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;