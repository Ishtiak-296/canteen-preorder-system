const express = require("express");
const db = require("./database");
const path = require("path");

const app = express();
const PORT = 4000;

// ==============================
// Middleware
// ==============================
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// Simple Admin Protection
// ==============================
const ADMIN_KEY = "canteen-secret-123";

function requireAdmin(req, res, next) {
    const key = req.headers["x-admin-key"];

    if (key !== ADMIN_KEY) {
        return res.status(401).json({
            error: "Unauthorized: invalid or missing admin key"
        });
    }

    next();
}

// ==============================
// HOME ROUTE
// ==============================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// MENU ROUTES
// ==============================

// Get all menu items
app.get("/api/menu", (req, res) => {
    try {
        const menu = db.prepare("SELECT * FROM menu").all();
        res.json(menu);
    } catch (error) {
        console.error("GET MENU ERROR:", error);
        res.status(500).json({
            error: "Could not get menu"
        });
    }
});

// Get single menu item
app.get("/api/menu/:id", (req, res) => {
    try {
        const item = db
            .prepare("SELECT * FROM menu WHERE id = ?")
            .get(req.params.id);

        if (!item) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        res.json(item);
    } catch (error) {
        console.error("GET MENU ITEM ERROR:", error);
        res.status(500).json({
            error: "Could not get item"
        });
    }
});

// Add menu item
app.post("/api/menu", requireAdmin, (req, res) => {
    try {
        const { id, name, price, stock, available } = req.body;

        if (!id || !name || price === undefined) {
            return res.status(400).json({
                error: "id, name and price are required"
            });
        }

        db.prepare(`
            INSERT INTO menu (id, name, price, stock, available)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            id,
            name,
            price,
            stock ?? 0,
            available === undefined ? 1 : (available ? 1 : 0)
        );

        const item = db
            .prepare("SELECT * FROM menu WHERE id = ?")
            .get(id);

        res.status(201).json(item);

    } catch (error) {
        console.error("MENU POST ERROR:", error.message);

        res.status(500).json({
            error: error.message
        });
    }
});

// Update menu item
app.put("/api/menu/:id", requireAdmin, (req, res) => {
    try {
        const { id } = req.params;

        const existing = db
            .prepare("SELECT * FROM menu WHERE id = ?")
            .get(id);

        if (!existing) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        const name = req.body.name ?? existing.name;
        const price = req.body.price ?? existing.price;
        const stock = req.body.stock ?? existing.stock;

        const available =
            req.body.available === undefined
                ? existing.available
                : (req.body.available ? 1 : 0);

        db.prepare(`
            UPDATE menu
            SET name = ?, price = ?, stock = ?, available = ?
            WHERE id = ?
        `).run(
            name,
            price,
            stock,
            available,
            id
        );

        const updated = db
            .prepare("SELECT * FROM menu WHERE id = ?")
            .get(id);

        res.json(updated);

    } catch (error) {
        console.error("MENU UPDATE ERROR:", error);

        res.status(500).json({
            error: "Could not update item"
        });
    }
});

// Delete menu item
app.delete("/api/menu/:id", requireAdmin, (req, res) => {
    try {
        const result = db
            .prepare("DELETE FROM menu WHERE id = ?")
            .run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        res.json({
            message: "Item deleted successfully"
        });

    } catch (error) {
        console.error("MENU DELETE ERROR:", error);

        res.status(500).json({
            error: "Could not delete item"
        });
    }
});

// ==============================
// ORDER ROUTES
// ==============================

// Create order
app.post("/api/orders", (req, res) => {
    try {
        const {
            studentName,
            foodId,
            quantity,
            pickupTime
        } = req.body;

        if (!studentName || !foodId || !quantity || !pickupTime) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                error: "Quantity must be greater than 0"
            });
        }

        const food = db
            .prepare("SELECT * FROM menu WHERE id = ?")
            .get(foodId);

        if (!food) {
            return res.status(404).json({
                error: "Food not found"
            });
        }

        if (!food.available) {
            return res.status(400).json({
                error: "This item is currently unavailable"
            });
        }

        if (quantity > food.stock) {
            return res.status(400).json({
                error: "Not enough stock available"
            });
        }

        const totalPrice = food.price * quantity;

        const result = db.prepare(`
            INSERT INTO orders
            (studentName, items, totalPrice, pickupTime, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            studentName,
            `${food.name} x ${quantity}`,
            totalPrice,
            pickupTime,
            "Pending",
            new Date().toISOString()
        );

        db.prepare(`
            UPDATE menu
            SET
                stock = stock - ?,
                available = CASE
                    WHEN stock - ? <= 0 THEN 0
                    ELSE available
                END
            WHERE id = ?
        `).run(
            quantity,
            quantity,
            foodId
        );

        res.status(201).json({
            message: "Order placed successfully!",
            orderId: result.lastInsertRowid,
            studentName,
            food: food.name,
            quantity,
            totalPrice,
            pickupTime,
            status: "Pending"
        });

    } catch (error) {
        console.error("ORDER POST ERROR:", error);

        res.status(500).json({
            error: "Could not place order"
        });
    }
});

// Get all orders
app.get("/api/orders", requireAdmin, (req, res) => {
    try {
        const orders = db
            .prepare("SELECT * FROM orders ORDER BY id DESC")
            .all();

        res.json(orders);

    } catch (error) {
        console.error("GET ORDERS ERROR:", error);

        res.status(500).json({
            error: "Could not get orders"
        });
    }
});

// Get single order
app.get("/api/orders/:id", requireAdmin, (req, res) => {
    try {
        const order = db
            .prepare("SELECT * FROM orders WHERE id = ?")
            .get(req.params.id);

        if (!order) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        res.json(order);

    } catch (error) {
        console.error("GET ORDER ERROR:", error);

        res.status(500).json({
            error: "Could not get order"
        });
    }
});

// Update order status
app.put("/api/orders/:id/status", requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = [
            "Pending",
            "Preparing",
            "Ready",
            "Completed",
            "Cancelled"
        ];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Status must be one of: ${validStatuses.join(", ")}`
            });
        }

        const result = db
            .prepare("UPDATE orders SET status = ? WHERE id = ?")
            .run(status, id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        res.json({
            message: "Order status updated successfully",
            orderId: id,
            status: status
        });

    } catch (error) {
        console.error("ORDER STATUS ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

// Delete order
app.delete("/api/orders/:id", requireAdmin, (req, res) => {
    try {
        const { id } = req.params;

        const order = db
            .prepare("SELECT * FROM orders WHERE id = ?")
            .get(id);

        if (!order) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        db.prepare("DELETE FROM orders WHERE id = ?").run(id);

        res.json({
            message: "Order deleted successfully",
            orderId: id
        });

    } catch (error) {
        console.error("ORDER DELETE ERROR:", error);

        res.status(500).json({
            error: "Could not delete order"
        });
    }
});

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
    console.log("=================================");
    console.log("Canteen Preorder Server Started");
    console.log(`http://localhost:${PORT}`);
    console.log(`Admin key: ${ADMIN_KEY}`);
    console.log("=================================");
});