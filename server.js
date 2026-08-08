const express = require("express");

const app = express();
const PORT = 4000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Canteen Preorder Server is running!");
});

app.get("/api/menu", (req, res) => {
    res.json([
        {
            id: "242-35-243",
            name: "Tehari",
            price: 100,
            available: true
        },
        {
            id: "242-35-296",
            name: "Porota",
            price: 10,
            available: true
        },
        {
            id: "242-35-001",
            name: "Dim Bhaji",
            price: 20,
            available: true
        },
        {
            id: "242-35-004",
            name: "Egg Sandwich",
            price: 50,
            available: true
        },
        {
            id: "242-35-006",
            name: "Vegetable Roll",
            price: 40,
            available: true
        },
        {
            id: "242-35-003",
            name: "Chicken",
            price: 70,
            available: true
        },
        {
            id: "242-35-005",
            name: "Singara",
            price: 10,
            available: true
        }
    ]);
});

app.listen(PORT, () => {
    console.log("Canteen Preorder Server Started");
    console.log("http://localhost:" + PORT);
});