// ============================================================================
// CANTEEN PREORDER SYSTEM - BACKEND SERVER
// ============================================================================

const express = require("express");
const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIGURATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000;
const MENU_FILE = path.join(__dirname, "data", "menu.json");
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");

// Order statuses workflow
const STATUSES = ["Pending", "Preparing", "Ready", "Collected", "Cancelled"];

// Default categories for fallback
const categoryDefaults = ["meal", "meal", "snack", "snack", "drink"];

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Accept JSON request bodies
app.use(express.json());

// Disable caching for API responses
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, max-age=0");
  next();
});

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Read JSON file safely
 * Returns empty array if file doesn't exist or has error
 */
const readJson = file => {
  try {
    if (!fs.existsSync(file)) 
      return file.includes("orders") ? [] : [];
    
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content) || (file.includes("orders") ? [] : []);
  } catch (error) {
    console.error(`Error reading ${file}:`, error.message);
    return file.includes("orders") ? [] : [];
  }
};

/**
 * Write data to JSON file
 * Creates directory if it doesn't exist
 */
const writeJson = (file, value) => {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) 
      fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  } catch (error) {
    console.error(`Error writing ${file}:`, error.message);
  }
};

/**
 * Validate that a string is a valid name
 * Must be 2-60 characters
 */
const validName = value => 
  typeof value === "string" && 
  value.trim().length >= 2 && 
  value.trim().length <= 60;

/**
 * Format menu item for response
 * Adds defaults for missing fields
 */
const menuView = item => ({
  ...item,
  stock: Number.isInteger(item.stock) ? item.stock : 20,
  category: item.category || 
    categoryDefaults[(Number(item.id) - 1) % categoryDefaults.length] || "meal",
  description: item.description || "Freshly prepared today",
  emoji: item.emoji || "🍽️"
});

// ============================================================================
// API ROUTES - MENU
// ============================================================================

/**
 * GET /api/menu
 * Return all menu items
 */
app.get("/api/menu", (req, res) => 
  res.json(readJson(MENU_FILE).map(menuView))
);

/**
 * POST /api/menu
 * Add new food item to menu
 */
app.post("/api/menu", (req, res) => {
  const { 
    name, 
    price, 
    stock = 20, 
    category = "meal", 
    description = "Freshly prepared today", 
    emoji = "🍽️" 
  } = req.body;
  
  const numericPrice = Number(price);
  const numericStock = Number(stock);
  
  // Validate input
  if (!validName(name) || 
      !Number.isInteger(numericPrice) || 
      numericPrice < 1 || 
      !Number.isInteger(numericStock) || 
      numericStock < 0 || 
      !["meal", "snack", "drink"].includes(category)) {
    return res.status(400).json({ error: "Please enter valid food details." });
  }
  
  const menu = readJson(MENU_FILE);
  
  // Generate new ID (max existing ID + 1)
  const id = menu.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  
  // Create new item
  const item = {
    id,
    name: name.trim(),
    price: numericPrice,
    stock: numericStock,
    category,
    description: String(description).slice(0, 100),
    emoji: String(emoji).slice(0, 4),
    available: true
  };
  
  menu.push(item);
  writeJson(MENU_FILE, menu);
  res.status(201).json(item);
});

/**
 * PUT /api/menu/:id
 * Update food item (stock and/or availability)
 */
app.put("/api/menu/:id", (req, res) => {
  const menu = readJson(MENU_FILE);
  const item = menu.find(entry => String(entry.id) === req.params.id);
  
  if (!item) 
    return res.status(404).json({ error: "Menu item not found." });
  
  // Validate availability field
  if ("available" in req.body && typeof req.body.available !== "boolean")
    return res.status(400).json({ error: "Availability must be true or false." });
  
  // Validate stock field
  if ("stock" in req.body && 
      (!Number.isInteger(Number(req.body.stock)) || Number(req.body.stock) < 0))
    return res.status(400).json({ error: "Stock must be zero or more." });
  
  // Update fields
  if ("available" in req.body) 
    item.available = req.body.available;
  
  if ("stock" in req.body) 
    item.stock = Number(req.body.stock);
  
  writeJson(MENU_FILE, menu);
  res.json(menuView(item));
});

// ============================================================================
// API ROUTES - ORDERS
// ============================================================================

/**
 * GET /api/orders
 * Get all orders, optionally filtered by ID or phone
 */
app.get("/api/orders", (req, res) => {
  let allOrders = readJson(ORDERS_FILE);
  
  // Filter by order ID if provided
  if (req.query.id) 
    allOrders = allOrders.filter(order => String(order.id) === String(req.query.id));
  
  // Filter by phone number if provided
  if (req.query.phone) 
    allOrders = allOrders.filter(order => order.phone === req.query.phone);
  
  // Sort by newest first
  res.json(allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

/**
 * POST /api/orders
 * Create new order
 * Validates all input and checks stock availability
 */
app.post("/api/orders", (req, res) => {
  const { 
    studentName, 
    studentId, 
    phone, 
    pickupTime, 
    paymentMethod = "Cash on pickup", 
    items 
  } = req.body;
  
  // Validate basic order information
  if (!validName(studentName) || 
      !validName(studentId) || 
      !/^01\d{9}$/.test(phone || "") || 
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime || "") || 
      !Array.isArray(items) || 
      !items.length) {
    return res.status(400).json({ error: "Please provide valid customer and order information." });
  }
  
  const menu = readJson(MENU_FILE);
  const requested = new Map();
  
  // Validate and consolidate item quantities
  for (const entry of items) {
    const id = Number(entry.id);
    const qty = Number(entry.qty);
    
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 20) 
      return res.status(400).json({ error: "Invalid item quantity." });
    
    requested.set(id, (requested.get(id) || 0) + qty);
  }
  
  // Check stock availability and build order items
  const orderItems = [];
  for (const [id, qty] of requested) {
    const item = menu.find(entry => Number(entry.id) === id);
    const view = item && menuView(item);
    
    if (!item || !item.available || view.stock < qty) 
      return res.status(400).json({ error: "One selected food item is unavailable or out of stock." });
    
    // Reduce stock
    item.stock = view.stock - qty;
    orderItems.push({ id: item.id, name: item.name, price: item.price, qty });
  }
  
  // Create order
  const order = {
    id: Date.now(),
    studentName: studentName.trim(),
    studentId: studentId.trim(),
    phone,
    pickupTime,
    paymentMethod,
    items: orderItems,
    totalPrice: orderItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  
  // Save order and update menu
  const allOrders = readJson(ORDERS_FILE);
  allOrders.push(order);
  writeJson(MENU_FILE, menu);
  writeJson(ORDERS_FILE, allOrders);
  res.status(201).json(order);
});

/**
 * PUT /api/orders/:id
 * Update order status
 * If cancelled, restore stock to menu
 */
app.put("/api/orders/:id", (req, res) => {
  const { status } = req.body;
  
  if (!STATUSES.includes(status)) 
    return res.status(400).json({ error: "Invalid order status." });
  
  const allOrders = readJson(ORDERS_FILE);
  const order = allOrders.find(entry => String(entry.id) === req.params.id);
  
  if (!order) 
    return res.status(404).json({ error: "Order not found." });
  
  // If cancelling, restore stock to menu
  if (status === "Cancelled" && order.status !== "Cancelled") {
    const menu = readJson(MENU_FILE);
    order.items.forEach(line => {
      const item = menu.find(entry => String(entry.id) === String(line.id));
      if (item) 
        item.stock = (Number(item.stock) || 20) + line.qty;
    });
    writeJson(MENU_FILE, menu);
  }
  
  order.status = status;
  writeJson(ORDERS_FILE, allOrders);
  res.json(order);
});

// ============================================================================
// ERROR HANDLING & SERVER STARTUP
// ============================================================================

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Server error. Please try again." });
});

/**
 * Start server
 */
app.listen(PORT, () => 
  console.log(`Canteen Preorder running at http://localhost:${PORT}`)
);
