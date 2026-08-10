const express = require("express");
const path = require("path");

const app = express();
const PORT = 4000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log("Canteen Preorder Server is running!");
    console.log(`http://localhost:${PORT}`);
});