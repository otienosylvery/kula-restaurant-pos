import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// connect to MongoDB
mongoose.connect("mongodb://localhost:27017/pos_system")
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Could not connect to MongoDB", err));

// schema
const menuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  available: Boolean,
});

// specify collection name
const MenuItem = mongoose.model("MenuItem", menuSchema, "menu_items");

// seed default menu items if none exist
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
    console.log('Default menu has been seeded');
  }
}

// run seeding after connection
mongoose.connection.once('open', seedMenu);


// API endpoint
app.get("/api/menu", async (req, res) => {
  try {
    const items = await MenuItem.find({ available: true });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});