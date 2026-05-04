import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { initiateSTKPush } from "./services/mpesa.js";

dotenv.config();

const app = express();

// --------------------------
// Middleware
// --------------------------
app.use(cors()); // Allow React frontend to fetch
app.use(express.json()); // Parse JSON bodies

// --------------------------
// MongoDB Connection
// --------------------------
mongoose
  .connect("mongodb://localhost:27017/pos_system")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ Could not connect to MongoDB", err));

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
    },
  ],
  subtotal: Number,
  tax: Number,
  total: Number,

  //payment fields
  paymentMethod: {
    type: String,
    enum: ["cash", "mpesa"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
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
    console.log("Seeding default menu items...");
    const defaultItems = [
      { name: "Fries", price: 80, category: "Food", available: true },
      { name: "Chicken", price: 300, category: "Food", available: true },
      {
        name: "Chicken Smokie",
        price: 40,
        category: "Snacks",
        available: true,
      },
      { name: "Steam", price: 50, category: "Drinks", available: true },
      { name: "500ml Soda", price: 60, category: "Drinks", available: true },
      { name: "300ml Soda", price: 40, category: "Drinks", available: true },
      { name: "Afya", price: 80, category: "Drinks", available: true },
    ];
    await MenuItem.insertMany(defaultItems);
    console.log("✅ Default menu has been seeded");
  }
}

// Run seeding once DB is open
mongoose.connection.once("open", seedMenu);

//daraja - mpesa
const getMpesaAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`,
  ).toString("base64");

  const res = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: { Authorization: `Basic ${auth}` },
    },
  );
  return res.data.access_token;
};

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

app.get("/api/orders/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

// POST a new order
app.post("/api/orders", async (req, res) => {
  try {
    console.log("Incoming order body:", req.body);

    const { items, subtotal, tax, total, paymentMethod } = req.body;

    if (!paymentMethod) {
      console.log("Order rejected: No payment method provided");
      return res.status(400).json({ error: "Payment method is required" });
    }

    if (!items || items.length === 0) {
      console.log("Order rejected: No items in order");
      return res
        .status(400)
        .json({ error: "Order must contain at least one item" });
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
    res.status(201).json({ orderId: order._id.toString() });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

//mpesa stk push route
app.post("/api/payments/mpesa/stk-push", async (req, res) => {
  try {
    const { orderId, phoneNumber } = req.body;

    if (!orderId || !phoneNumber) {
      return res
        .status(400)
        .json({ error: "orderId and phoneNumber required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Order already paid" });
    }

    if (order.mpesa?.checkoutRequestId) {
      return res.status(400).json({ error: "STK Push already initiated" });
    }

    const formatPhone = (phone) => {
      let p = phone.replace(/\D/g, ""); // Remove non-digits
      if (p.startsWith("0")) return "254" + p.slice(1);
      if (p.startsWith("7")) return "254" + p;
      if (p.startsWith("254")) return p;
      throw new Error("Invalid phone number format");
    };

    const formattedPhone = formatPhone(phoneNumber);

    const stkRes = await initiateSTKPush(
      phoneNumber,
      Math.round(order.total),
      order._id.toString(),
    );

    order.mpesa = {
      checkoutRequestId: stkRes.CheckoutRequestID,
      merchantRequestId: stkRes.MerchantRequestID,
    };

    await order.save();

    res.json({
      message: "STK Push sent",
      checkoutRequestId: stkRes.CheckoutRequestID,
    });
  } catch (error) {
    console.error("STK Push error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to initiate STK push",
      details: error.response?.data || error.message,
    });
  }
});

//mpesa callback route
// --------------------------
// M-Pesa Callback Route
// --------------------------
app.post("/api/payments/mpesa/callback", async (req, res) => {
  try {
    console.log(
      "📥 M-Pesa Callback Received:",
      JSON.stringify(req.body, null, 2),
    );

    const callback = req.body.Body?.stkCallback;

    if (!callback) {
      return res.status(400).json({ error: "Invalid callback payload" });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callback;

    // 1️⃣ Find order using CheckoutRequestID
    const order = await Order.findOne({
      "mpesa.checkoutRequestId": CheckoutRequestID,
    });

    if (!order) {
      console.error("❌ Order not found for callback:", CheckoutRequestID);
      return res.status(404).json({ error: "Order not found" });
    }

    // 2️⃣ Handle FAILED payments
    if (ResultCode !== 0) {
      order.paymentStatus = "failed";
      order.mpesa.resultCode = ResultCode;
      order.mpesa.resultDesc = ResultDesc;

      await order.save();

      return res.json({ message: "Payment failed recorded" });
    }

    // 3️⃣ Extract metadata values
    let mpesaReceiptNumber = null;

    CallbackMetadata.Item.forEach((item) => {
      if (item.Name === "MpesaReceiptNumber") {
        mpesaReceiptNumber = item.Value;
      }
    });

    // 4️⃣ Mark order as PAID
    order.paymentStatus = "paid";
    order.mpesa.mpesaReceiptNumber = mpesaReceiptNumber;
    order.mpesa.resultCode = ResultCode;
    order.mpesa.resultDesc = ResultDesc;

    await order.save();

    console.log("✅ Payment successful for order:", order._id);

    // 5️⃣ IMPORTANT: Acknowledge Safaricom
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error("❌ Callback processing error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});

// --------------------------
// Start Server
// --------------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
