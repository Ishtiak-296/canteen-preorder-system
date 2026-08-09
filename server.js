const express = require("express");
const db = require("./database");

const app = express();
const PORT = 4000;

app.use(express.json());

// Home
app.get("/", (req, res) => {
    res.send("Canteen Preorder Server is running!");
});

// Get menu from database
app.get("/api/menu", (req, res) => {
    try {
        const menu = db.prepare("SELECT * FROM menu").all();
        res.json(menu);
    } catch (error) {
        res.status(500).json({
            error: "Could not get menu"
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log("Canteen Preorder Server Started");
    console.log("http://localhost:" + PORT);
});