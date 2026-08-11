const Database = require("better-sqlite3");

const db = new Database("canteen.db");

db.pragma("journal_mode = WAL");

// Create menu table
db.exec(`
CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    available INTEGER DEFAULT 1
)
`);

// Create orders table
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentName TEXT NOT NULL,
    items TEXT NOT NULL,
    totalPrice INTEGER NOT NULL,
    pickupTime TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    createdAt TEXT NOT NULL
)
`);

// Menu items
const menuItems = [
    ["242-35-243", "Tehari", 100, 20, 1],
    ["242-35-296", "Porota", 10, 30, 1],
    ["242-35-001", "Dim Bhaji", 20, 25, 1],
    ["242-35-004", "Egg Sandwich", 50, 15, 1],
    ["242-35-006", "Vegetable Roll", 40, 15, 1],
    ["242-35-003", "Chicken", 70, 20, 1],
    ["242-35-005", "Singara", 10, 30, 1]
];

// Insert menu items
const insert = db.prepare(`
INSERT OR REPLACE INTO menu
(id, name, price, stock, available)
VALUES (?, ?, ?, ?, ?)
`);

for (const item of menuItems) {
    insert.run(
        item[0],
        item[1],
        item[2],
        item[3],
        item[4]
    );
}

console.log("Database connected successfully!");
console.log("Menu loaded successfully!");

module.exports = db;