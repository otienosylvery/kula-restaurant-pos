import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// --------------------------
// Middleware
// --------------------------
app.use(cors());           // Allow React frontend to fetch
app.use(express.json());   // Parse JSON bodies

// --------------------------
// MongoDB Connection
// --------------------------
mongoose.connect("mongodb://localhost:27017/pos_system")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ Could not connect to MongoDB", err));

// --------------------------
// Schemas & Models
// --------------------------

// Menu schema
const menuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  available: Boolean,
});

//Order Schema


// Menu model with explicit collection
const MenuItem = mongoose.model("MenuItem", menuSchema, "menu_items");

// Order schema
const orderSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
    }
  ],
  subtotal: Number,
  tax: Number,
  total: Number,

  //payment fields
  paymentMethod:{
    type: String,
    enum:["cash", "mpesa"],
    required: true,
  },
  paymentStatus:{
    type: String,
    enum:["pending", "paid", "failed"],
    default: "pending",
  },
  mpesa: {
    checkoutRequestId: String,
    merchantRequestId: String,
     mpesaReceiptNumber: String,
     resultCode: Number,
     resultDesc: String,
  },
  createdAt: { type: Date, default: Date.now },
});

// Order model
const Order = mongoose.model("Order", orderSchema, "orders");

// --------------------------
// Seed default menu items
// --------------------------
async function seedMenu() {
  const count = await MenuItem.countDocuments();
  if (count === 0) {
    console.log('Seeding default menu items...');
    const defaultItems = [
      { name: 'Fries', price: 80, category: 'Food', available: true },
      { name: 'Chicken', price: 300, category: 'Food', available: true },
      { name: 'Chicken Smokie', price: 40, category: 'Snacks', available: true },
      { name: 'Steam', price: 50, category: 'Drinks', available: true },
      { name: '500ml Soda', price: 60, category: 'Drinks', available: true },
      { name: '300ml Soda', price: 40, category: 'Drinks', available: true },
      { name: 'Afya', price: 80, category: 'Drinks', available: true },
    ];
    await MenuItem.insertMany(defaultItems);
    console.log('✅ Default menu has been seeded');
  }
}

// Run seeding once DB is open
mongoose.connection.once('open', seedMenu);

// GET menu items
app.get("/api/menu", async (req, res) => {
  try {
    const items = await MenuItem.find({ available: true });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// POST a new order
app.post("/api/orders", async (req, res) => {
  try {
    console.log("Incoming order body:", req.body);

    const { items, subtotal, tax, total, paymentMethod,} = req.body;

    if(!paymentMethod){
      console.log("Order rejected: No payment method provided");
      return res.status(400).json({ error: "Payment method is required" });
    }

    if (!items || items.length === 0) {
      console.log("Order rejected: No items in order");
      return res.status(400).json({ error: "Order must contain at least one item" });
    }

    const paymentStatus = paymentMethod === "cash" ? "paid" : "pending";

    const order = new Order({
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentStatus,
    });

    await order.save();

    console.log("✅ Order saved:", order._id);
    res.status(201).json({
      message: "Order saved successfully",
      orderId: order._id,
    });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// --------------------------
// Start Server
// --------------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});