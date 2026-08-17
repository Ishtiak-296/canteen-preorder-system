# Canteen Preorder System - Project Guide

## Project purpose

This project lets students preorder canteen food and lets a canteen administrator manage menu items and orders.

## Technology

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express.js
- Storage: JSON files (`data/menu.json` and `data/orders.json`)

## Demonstration flow

1. Run `npm start` and open `http://localhost:3000`.
2. Search or filter the menu, add food to the cart, then enter student details and a pickup time.
3. Confirm the order. The server calculates the total and reduces stock. A printable receipt appears.
4. Use **My Orders** with the same phone number to track the order.
5. Open `http://localhost:3000/admin.html`, log in using `admin123`, then update an order to `Preparing` or `Ready`.
6. Show that the student tracking page displays the changed status.

## Important implementation details

- The browser sends only item ID and quantity. The server uses the original menu price and validates stock before saving an order.
- Cancelling an order restores its stock.
- The admin panel has a demo password. For a real production system, passwords must be stored securely and server-side authentication must be used.
- bKash and Nagad are displayed as payment-method choices only; this project does not process actual payments.

## Deploying

This is a full-stack Node.js project. GitHub can store the code, but GitHub Pages cannot run `server.js` or save shared orders. To deploy it publicly, deploy the backend to a Node.js hosting service such as Render or Railway, then configure the frontend to use that backend URL.
