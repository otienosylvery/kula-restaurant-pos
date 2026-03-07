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
    //check if item already exists in the order
    const existing = order.find((o)=>o.id===item.id);
    if (existing){
      setOrder(
        order.map((o)=>
        o.id === item.id ? {...o, quantity: o.quantity + 1}: o
      )
      );
    }else{
      setOrder([...order, {...item, quantity:1}]);
    }
    
  };
  //remove item from order
  const removeFromOrder = (id)=>{
    setOrder(order.filter((o)=>o.id !==id));
  };
  //increase order quantity
  const increaseQuantity = (id)=> {
    setOrder(
      order.map((o)=>
      o.id === id ? {...o, quantity: o.quantity + 1}: o
    )
    );
  };
  //decrease quantity
  const decreaseQuantity = (id)=>{
    setOrder(
      order.map((o)=>
      o.id === id ? {...o,quantity: o.quantity -1}: o
    )
    .filter((o)=>o.quantity>0) //remove if quantity drops to zero
    );
  }
  //calculate total
  const total = order.reduce((sum, item)=> sum + item.price * item.quantity, 0);

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
            {item.name} - KSh. {item.price}
          </button>
        ))}
      </div>

      <div className="order">
        <h2>Current Order</h2>
        {order.length === 0 && <p> No items yet</p>}
        {order.map((item) => (
          <div key={item.id} className="order-item">
            {/* {item.name} x {item.quantity} - KSh. {item.price * item.quantity}
              <div style={{ display: "inline-block", marginLeft: "50px" }}>
                <button style ={{marginLeft: "20px"}} className="qty-btn" onClick={() => increaseQuantity(item.id)}>+</button>
                <button className="qty-btn" onClick={() => decreaseQuantity(item.id)}>-</button>
                <button onClick={() => removeFromOrder(item.id)}>Remove</button> */}
                <div className="item-info">
      <span className="item-name">{item.name}</span>
      <span className="item-price">KSh. {item.price * item.quantity}</span>
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

        <h3>Total: KSh. {total}</h3>
      </div>

    </div>
  );
  
}

export default App;
