const Database = require("better-sqlite3");

// Create or open database
const db = new Database("canteen.db");

// Create menu table
db.prepare(`
    CREATE TABLE IF NOT EXISTS menu (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        stock INTEGER DEFAULT 0
    )
`).run();

// Create orders table
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

// Menu items
const menuItems = [
    ["242-35-243", "Tehari", 100, 3],
    ["242-35-296", "Porota", 10, 2],
    ["242-35-001", "Dim Bhaji", 20, 0],
    ["242-35-004", "Egg Sandwich", 50, 3],
    ["242-35-006", "Vegetable Roll", 40, 1],
    ["242-35-003", "Chicken", 70, 0],
    ["242-35-005", "Singara", 10, 2]
];

// Insert menu items
const insertMenu = db.prepare(`
    INSERT OR IGNORE INTO menu
    (id, name, price, stock)
    VALUES (?, ?, ?, ?)
`);

// Add menu items
for (const item of menuItems) {
    insertMenu.run(item);
}

console.log("Database connected successfully!");
console.log("Menu items added successfully!");

module.exports = db;