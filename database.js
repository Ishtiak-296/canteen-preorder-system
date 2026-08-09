const Database = require("better-sqlite3");

// ==============================
// 1. Database Connection
// ==============================
const db = new Database("canteen.db");
db.pragma("journal_mode = WAL");

// ==============================
// 2. Menu Table
// ==============================
db.prepare(`
  CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    available INTEGER DEFAULT 1
  )
`).run();

// If upgrading from an older version of this DB that didn't have "stock",
// add the column safely without losing existing data.
const menuColumns = db.prepare("PRAGMA table_info(menu)").all();
const hasStockColumn = menuColumns.some((col) => col.name === "stock");
if (!hasStockColumn) {
  db.prepare("ALTER TABLE menu ADD COLUMN stock INTEGER NOT NULL DEFAULT 0").run();
  console.log("🔧 Added missing 'stock' column to menu table");
}

// ==============================
// 3. Orders Table
// ==============================
db.prepare(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentName TEXT NOT NULL,
    items TEXT NOT NULL,
    totalPrice INTEGER NOT NULL,
    pickupTime TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    createdAt TEXT NOT NULL
  )
`).run();

// ==============================
// 4. Seed Menu Items (only runs if menu table is empty)
// ==============================
const existingCount = db.prepare("SELECT COUNT(*) AS count FROM menu").get().count;

if (existingCount === 0) {
  const menuItems = [
    // id,             name,             price, stock, available
    ["242-35-243", "Tehari", 100, 20, 1],
    ["242-35-296", "Porota", 10, 30, 1],
    ["242-35-001", "Dim Bhaji", 20, 25, 1],
    ["242-35-004", "Egg Sandwich", 50, 15, 1],
    ["242-35-006", "Vegetable Roll", 40, 15, 1],
    ["242-35-003", "Chicken", 70, 20, 1],
    ["242-35-005", "Singara", 10, 30, 1],
  ];

  const insertMenu = db.prepare(`
    INSERT OR IGNORE INTO menu (id, name, price, stock, available)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const item of menuItems) {
    insertMenu.run(item);
  }

  console.log("✅ Menu items seeded successfully!");
}

// ==============================
// 5. Confirmation Log
// ==============================
console.log("✅ Database connected successfully!");

// ==============================
// 6. Export
// ==============================
module.exports = db;