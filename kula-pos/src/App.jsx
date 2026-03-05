import React, { useState } from "react";
import './App.css'

function App() {
  const menu =[
    {id: 1, name: "Fries", price: 80},
    {id: 2, name: "Chicken", price: 300},
    {id: 3, name: "Chicken Smokie", price: 40},
    {id: 4, name: "Steam", price: 50},
    {id: 5, name: "500ml Soda", price: 60},
    {id: 6, name: "300ml Soda", price: 40},
    {id: 7, name: "Afya", price: 80},
  ];
  const [order, setOrder] = useState([]);
  const addToOrder = (item) => {
    setOrder([...order, item]);
  };
  const total = order.reduce((sum, item)=> sum + item.price, 0);

  return (
    <div className="pos-container">
      
      <div className="menu">
        <h2>Menu</h2>
        {menu.map((item) => (
          <button
            key={item.id}
            className="menu-item"
            onClick={() => addToOrder(item)}
          >
            {item.name} - KSh {item.price}
          </button>
        ))}
      </div>

      <div className="order">
        <h2>Current Order</h2>

        {order.map((item, index) => (
          <div key={index} className="order-item">
            {item.name} - KSh {item.price}
          </div>
        ))}

        <h3>Total: KSh {total}</h3>
      </div>

    </div>
  );
  
}

export default App;
