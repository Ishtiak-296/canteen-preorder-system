// ============================================
// FRONTEND SCRIPT - Backend er sathe kotha bole (fetch API diye)
// ============================================

let cart = {}; // { itemId: { name, price, qty } }

// ---------- STUDENT PAGE: Menu load kora ----------
async function loadMenu() {
  const menuGrid = document.getElementById("menuGrid");
  if (!menuGrid) return; // admin page e ei function lagbe na

  const res = await fetch("/api/menu");
  const menu = await res.json();

  menuGrid.innerHTML = "";
  menu
    .filter((item) => item.available)
    .forEach((item) => {
      const div = document.createElement("div");
      div.className = "menu-item";
      div.innerHTML = `
        <h3>${item.name}</h3>
        <span class="price">৳${item.price}</span>
        <div class="qty-controls">
          <button onclick="changeQty(${item.id}, '${item.name}', ${item.price}, -1)">-</button>
          <span id="qty-${item.id}">0</span>
          <button onclick="changeQty(${item.id}, '${item.name}', ${item.price}, 1)">+</button>
        </div>
      `;
      menuGrid.appendChild(div);
    });
}

function changeQty(id, name, price, delta) {
  if (!cart[id]) cart[id] = { name, price, qty: 0 };
  cart[id].qty = Math.max(0, cart[id].qty + delta);

  document.getElementById(`qty-${id}`).innerText = cart[id].qty;
  updateCartSummary();
}

function updateCartSummary() {
  const cartItemsDiv = document.getElementById("cartItems");
  let total = 0;
  let html = "";

  Object.values(cart).forEach((item) => {
    if (item.qty > 0) {
      total += item.price * item.qty;
      html += `<div class="order-row"><span>${item.name} x${item.qty}</span><span>৳${item.price * item.qty}</span></div>`;
    }
  });

  cartItemsDiv.innerHTML = html || "<p>Kono item select kora hoyni.</p>";
  document.getElementById("totalPrice").innerText = total;
}

async function placeOrder() {
  const studentName = document.getElementById("studentName").value.trim();
  const pickupTime = document.getElementById("pickupTime").value;
  const items = Object.values(cart).filter((item) => item.qty > 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (!studentName) return alert("Tomar naam likho!");
  if (items.length === 0) return alert("Kono item select koro age!");
  if (!pickupTime) return alert("Pickup time select koro!");

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentName, items, totalPrice, pickupTime }),
  });

  if (res.ok) {
    alert("Order place hoyeche! Pickup time e canteen e giye collect koro.");
    cart = {};
    loadMenu();
    document.getElementById("cartItems").innerHTML = "";
    document.getElementById("totalPrice").innerText = "0";
    document.getElementById("studentName").value = "";
  }
}

// ---------- ADMIN PAGE: Menu item add kora ----------
async function addMenuItem() {
  const name = document.getElementById("newItemName").value.trim();
  const price = Number(document.getElementById("newItemPrice").value);

  if (!name || !price) return alert("Name ar price thik moto dao!");

  await fetch("/api/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price }),
  });

  document.getElementById("newItemName").value = "";
  document.getElementById("newItemPrice").value = "";
  alert("Menu item add hoyeche!");
}

// ---------- ADMIN PAGE: Orders dekhano ----------
async function loadOrders() {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return; // student page e ei function lagbe na

  const res = await fetch("/api/orders");
  const orders = await res.json();

  if (orders.length === 0) {
    ordersList.innerHTML = "<p>Ekhono kono order ashe ni.</p>";
    return;
  }

  ordersList.innerHTML = orders
    .reverse()
    .map(
      (order) => `
      <div class="order-row" style="flex-direction:column; align-items:flex-start; gap:6px;">
        <div style="display:flex; justify-content:space-between; width:100%;">
          <strong>${order.studentName}</strong>
          <span class="status-badge status-${order.status}">${order.status}</span>
        </div>
        <div>${order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}</div>
        <div>Total: ৳${order.totalPrice} | Pickup: ${order.pickupTime}</div>
        <select class="status-select" onchange="updateStatus(${order.id}, this.value)">
          <option ${order.status === "Pending" ? "selected" : ""}>Pending</option>
          <option ${order.status === "Preparing" ? "selected" : ""}>Preparing</option>
          <option ${order.status === "Ready" ? "selected" : ""}>Ready</option>
          <option ${order.status === "Collected" ? "selected" : ""}>Collected</option>
        </select>
      </div>
    `
    )
    .join("");
}

async function updateStatus(orderId, status) {
  await fetch(`/api/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  loadOrders();
}

// ---------- Page load hole shuru hobe ----------
loadMenu();
loadOrders();
if (document.getElementById("ordersList")) {
  setInterval(loadOrders, 5000); // admin page e proti 5 sec e auto refresh
}
