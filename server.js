// ============================================
// CANTEEN FOOD PREORDER SYSTEM - Backend Server
// ============================================
// Ei file ta backend er "brain". Eikhane shob API route define kora ache.
// API route mane holo, frontend theke ei address gulate request pathale
// backend ki response debe.

const express = require("express");
const fs = require("fs"); // file read/write korar jonno (json data store)
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware: frontend theke asha JSON data bujhte help kore
app.use(express.json());

// public folder er shob file (html, css, js) directly serve hobe
app.use(express.static(path.join(__dirname, "public")));

// data file er path
const MENU_FILE = path.join(__dirname, "data", "menu.json");
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");

// ---------- Helper functions: JSON file read/write ----------
function readJSON(filePath) {
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// =========================================================
// MENU ROUTES
// =========================================================

// GET /api/menu -> shob menu item dekhabe (student side use kore)
app.get("/api/menu", (req, res) => {
  const menu = readJSON(MENU_FILE);
  res.json(menu);
});

// POST /api/menu -> notun menu item add korbe (admin side use kore)
app.post("/api/menu", (req, res) => {
  const menu = readJSON(MENU_FILE);
  const newItem = {
    id: Date.now(), // simple unique id
    name: req.body.name,
    price: req.body.price,
    available: true,
  };
  menu.push(newItem);
  writeJSON(MENU_FILE, menu);
  res.status(201).json(newItem);
});

// PUT /api/menu/:id -> item available/unavailable toggle korbe (admin)
app.put("/api/menu/:id", (req, res) => {
  const menu = readJSON(MENU_FILE);
  const item = menu.find((m) => m.id == req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  item.available = req.body.available;
  writeJSON(MENU_FILE, menu);
  res.json(item);
});

// =========================================================
// ORDER ROUTES
// =========================================================

// GET /api/orders -> shob order dekhabe (admin dashboard er jonno)
app.get("/api/orders", (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  res.json(orders);
});

// POST /api/orders -> notun order place korbe (student side)
app.post("/api/orders", (req, res) => {
  const orders = readJSON(ORDERS_FILE);

  const newOrder = {
    id: Date.now(),
    studentName: req.body.studentName,
    items: req.body.items, // array of { name, price, qty }
    totalPrice: req.body.totalPrice,
    pickupTime: req.body.pickupTime,
    status: "Pending", // Pending -> Preparing -> Ready -> Collected
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  writeJSON(ORDERS_FILE, orders);
  res.status(201).json(newOrder);
});

// PUT /api/orders/:id -> order status update korbe (admin: Pending -> Ready etc.)
app.put("/api/orders/:id", (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  const order = orders.find((o) => o.id == req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = req.body.status;
  writeJSON(ORDERS_FILE, orders);
  res.json(order);
});

// DELETE /api/orders/:id -> order cancel korbe
app.delete("/api/orders/:id", (req, res) => {
  let orders = readJSON(ORDERS_FILE);
  orders = orders.filter((o) => o.id != req.params.id);
  writeJSON(ORDERS_FILE, orders);
  res.json({ message: "Order deleted" });
});

// =========================================================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
