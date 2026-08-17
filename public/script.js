// ============================================================================
// CANTEEN PREORDER SYSTEM - FRONTEND SCRIPT
// ============================================================================

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let menu = [];
let cart = [];
let activeCategory = "all";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Format number as Bengali Taka (৳) */
const money = value => `৳${Number(value).toLocaleString("en-US")}`;

/** Escape HTML special characters to prevent XSS attacks */
const esc = value => String(value).replace(/[&<>'"]/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;"
})[c]);

/** Icons for different food categories */
const icons = { 
  meal: "🍛", 
  snack: "🥟", 
  drink: "🥤" 
};

// LocalStorage key for saving last order
const LAST_ORDER_KEY = "canteenLastOrder";

/**
 * Get last order from localStorage
 */
const getSavedOrder = () => {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Save order to localStorage
 */
const saveLastOrder = order => {
  if (!order || !order.id) return;
  localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
};

/**
 * Make API calls with automatic JSON parsing and error handling
 */
async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) 
    throw new Error(data.error || "Request failed.");
  
  return data;
}

/**
 * Show toast notification message
 */
function toast(message) {
  const node = document.getElementById("toast");
  
  if (!node) 
    return alert(message);
  
  node.textContent = message;
  node.classList.add("show");
  
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
}

// ============================================================================
// MENU FUNCTIONS
// ============================================================================

/**
 * Load menu from server
 */
async function loadMenu() {
  if (!document.getElementById("menuGrid")) return;
  
  try {
    menu = await api("/api/menu");
    renderMenu();
  } catch (error) {
    document.getElementById("menuGrid").innerHTML = `<p>${esc(error.message)}</p>`;
  }
}

/**
 * Render menu items with search and category filtering
 */
function renderMenu() {
  const search = document.getElementById("search").value.toLowerCase();
  
  // Category buttons
  const categories = {
    all: "সবগুলো",
    meal: "🍛 Meals",
    snack: "🥟 Snacks",
    drink: "🥤 Drinks"
  };
  
  document.getElementById("categories").innerHTML = Object.entries(categories)
    .map(([id, label]) => 
      `<button class="chip ${id === activeCategory ? "active" : ""}" 
              onclick="setCategory('${id}')">${label}</button>`
    )
    .join("");
  
  // Filter items by category and search
  const list = menu.filter(item =>
    (activeCategory === "all" || item.category === activeCategory) &&
    item.name.toLowerCase().includes(search)
  );
  
  // Render food cards
  document.getElementById("menuGrid").innerHTML = list
    .map(item => {
      const usable = item.available && item.stock > 0;
      
      return `
        <article class="food-card ${item.category}">
          <div class="food-image">${item.emoji || icons[item.category] || "🍽️"}</div>
          <div class="food-body">
            <h3>${esc(item.name)}</h3>
            <p>${esc(item.description)}</p>
            <div class="food-footer">
              <div>
                <b>${money(item.price)}</b>
                <small class="${item.stock < 6 ? "low" : ""}">
                  ${usable ? `${item.stock} in stock` : "Unavailable"}
                </small>
              </div>
              <button class="add" 
                      ${usable ? "" : "disabled"} 
                      onclick="addToCart(${item.id})">
                ${usable ? "Add +" : "Sold out"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("") || "<p>কোনো খাবার পাওয়া যায়নি।</p>";
}

/**
 * Set active category for filtering
 */
function setCategory(category) {
  activeCategory = category;
  renderMenu();
}

// ============================================================================
// CART FUNCTIONS
// ============================================================================

/**
 * Add item to cart
 */
function addToCart(id) {
  const food = menu.find(item => item.id === id);
  const line = cart.find(item => item.id === id);
  
  if (!food || !food.available || food.stock < 1)
    return toast("এই খাবারটি পাওয়া যাচ্ছে না।");
  
  if (line && line.qty >= food.stock)
    return toast("স্টকে এর বেশি নেই।");
  
  if (line) 
    line.qty++;
  else 
    cart.push({ id, qty: 1 });
  
  renderCart();
  toast("Cart-এ যোগ হয়েছে।");
}

/**
 * Change quantity of item in cart
 */
function changeQty(id, delta) {
  const line = cart.find(item => item.id === id);
  const food = menu.find(item => item.id === id);
  
  if (!line || !food) return;
  
  if (delta > 0 && line.qty >= food.stock)
    return toast("স্টকে এর বেশি নেই।");
  
  line.qty += delta;
  cart = cart.filter(item => item.qty > 0);
  renderCart();
}

/**
 * Toggle cart drawer open/close
 */
function toggleCart() {
  document.getElementById("cartDrawer").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}

/**
 * Render cart items and total
 */
function renderCart() {
  if (!document.getElementById("cartItems")) return;
  
  const lines = cart
    .map(line => ({ ...line, food: menu.find(item => item.id === line.id) }))
    .filter(line => line.food);
  
  const total = lines.reduce((sum, line) => sum + line.food.price * line.qty, 0);
  
  // Render cart items
  document.getElementById("cartItems").innerHTML = lines
    .map(line => `
      <div class="cart-item">
        <div>
          <b>${esc(line.food.name)}</b>
          <small>${money(line.food.price)} each</small>
        </div>
        <div class="qty">
          <button onclick="changeQty(${line.id}, -1)">−</button>
          <span>${line.qty}</span>
          <button onclick="changeQty(${line.id}, 1)">+</button>
        </div>
      </div>
    `)
    .join("");
  
  // Update cart summary
  document.getElementById("cartCount").textContent = 
    lines.reduce((sum, line) => sum + line.qty, 0);
  document.getElementById("totalPrice").textContent = money(total);
  document.getElementById("emptyCart").hidden = Boolean(lines.length);
  document.getElementById("checkout").hidden = !lines.length;
}

// ============================================================================
// ORDER PLACEMENT & TRACKING
// ============================================================================

/**
 * Place order from cart
 */
async function placeOrder() {
  const studentName = document.getElementById("studentName").value.trim();
  const studentId = document.getElementById("studentId").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const pickupTime = document.getElementById("pickupTime").value;
  
  // Validate input
  if (!studentName || !studentId || !/^01\d{9}$/.test(phone) || !pickupTime)
    return toast("নাম, ID, ১১ ডিজিটের ফোন ও pickup time দিন।");
  
  try {
    // Send order to server
    const order = await api("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName,
        studentId,
        phone,
        pickupTime,
        paymentMethod: document.getElementById("payment").value,
        items: cart
      })
    });
    
    // Clear cart and reload
    cart = [];
    renderCart();
    await loadMenu();
    toggleCart();
    
    // Clear form
    ["studentName", "studentId", "phone", "pickupTime"]
      .forEach(id => document.getElementById(id).value = "");
    
    // Show receipt
    showReceipt(order);
    
  } catch (error) {
    toast(error.message);
  }
}

/**
 * Show order receipt
 */
function showReceipt(order) {
  saveLastOrder(order);
  renderSavedOrder();
  toast(`Order #${order.id} confirmed. Total: ${money(order.totalPrice)}`);
}

/**
 * Render saved order info
 */
function renderSavedOrder() {
  const box = document.getElementById("savedOrderInfo");
  if (!box) return;
  
  const saved = getSavedOrder();
  
  if (!saved) {
    box.innerHTML = "<p>কোনো saved order নেই।</p>";
    return;
  }
  
  box.innerHTML = `
    <div class="saved-order-card">
      <strong>Saved Order</strong>
      <p>Order #${saved.id}</p>
      <small>
        ${esc(saved.studentName || "-")} · 
        ${esc(saved.phone || "-")} · 
        ${esc(saved.status || "Pending")}
      </small>
      <button class="secondary" onclick="trackSavedOrder()">Track This Order</button>
    </div>
  `;
}

/**
 * Track saved order
 */
function trackSavedOrder() {
  const saved = getSavedOrder();
  
  if (!saved) {
    toast("কোনো saved order নেই।");
    return;
  }
  
  document.getElementById("trackOrderId").value = saved.id || "";
  document.getElementById("trackPhone").value = saved.phone || "";
  document.getElementById("trackingResults").innerHTML = orderCard(saved);
}

/**
 * Search orders by ID or phone
 */
async function trackOrders() {
  const orderId = document.getElementById("trackOrderId").value.trim();
  const phone = document.getElementById("trackPhone").value.trim();
  
  const hasValidId = orderId.length > 0;
  const hasValidPhone = /^01\d{9}$/.test(phone);
  
  if (!hasValidId && !hasValidPhone)
    return toast("Order ID বা সঠিক ফোন নম্বর দিন।");
  
  try {
    const query = new URLSearchParams();
    if (hasValidId) query.set("id", orderId);
    if (hasValidPhone) query.set("phone", phone);
    
    const all = await api(`/api/orders?${query.toString()}`);
    
    document.getElementById("trackingResults").innerHTML = all.length
      ? all.map(orderCard).join("")
      : "<p>কোনো order পাওয়া যায়নি।</p>";
      
  } catch (error) {
    toast(error.message);
  }
}

/**
 * Generate HTML for an order card
 */
function orderCard(order, admin = false) {
  return `
    <article class="order-card">
      <div class="order-top">
        <div>
          <b>${esc(order.studentName)}</b> <small>#${order.id}</small>
          <br>
          <small>
            ${esc(order.studentId || "-")} · ${esc(order.phone || "-")}
          </small>
        </div>
        <span class="status ${order.status}">${order.status}</span>
      </div>
      <p>${order.items.map(item => `${esc(item.name)} × ${item.qty}`).join(" · ")}</p>
      <div class="order-meta">
        <span>Pickup: <b>${esc(order.pickupTime)}</b></span>
        <span>${money(order.totalPrice)}</span>
      </div>
      ${admin ? `
        <select onchange="updateStatus('${order.id}', this.value)">
          ${["Pending", "Preparing", "Ready", "Collected", "Cancelled"]
            .map(status => 
              `<option ${order.status === status ? "selected" : ""}>${status}</option>`
            )
            .join("")}
        </select>
      ` : ""}
    </article>
  `;
}

// ============================================================================
// ADMIN PANEL FUNCTIONS
// ============================================================================

/**
 * Admin login with password
 */
function loginAdmin() {
  if (document.getElementById("adminPassword").value !== "admin123")
    return toast("Password সঠিক নয়।");
  
  sessionStorage.setItem("canteenAdmin", "yes");
  renderAdmin();
}

/**
 * Admin logout
 */
function logoutAdmin() {
  sessionStorage.removeItem("canteenAdmin");
  renderAdmin();
}

/**
 * Render admin dashboard
 */
async function renderAdmin() {
  if (!document.getElementById("loginBox")) return;
  
  const logged = sessionStorage.getItem("canteenAdmin") === "yes";
  
  document.getElementById("loginBox").hidden = logged;
  document.getElementById("dashboard").hidden = !logged;
  
  if (!logged) return;
  
  try {
    // Load menu and orders
    const [foods, allOrders] = await Promise.all([
      api("/api/menu"),
      api("/api/orders")
    ]);
    
    // Calculate statistics
    const sales = allOrders
      .filter(order => order.status !== "Cancelled")
      .reduce((sum, order) => sum + order.totalPrice, 0);
    
    // Render statistics
    document.getElementById("stats").innerHTML = [
      [allOrders.length, "Total Orders"],
      [money(sales), "Total Sales"],
      [allOrders.filter(order => order.status === "Ready").length, "Ready"],
      [foods.reduce((sum, item) => sum + item.stock, 0), "Food in Stock"]
    ]
      .map(([value, label]) => `
        <div class="stat">
          <b>${value}</b>
          <span>${label}</span>
        </div>
      `)
      .join("");
    
    // Render menu management
    document.getElementById("adminMenu").innerHTML = foods
      .map(item => `
        <div class="admin-line">
          <span>
            <b>${esc(item.name)}</b>
            <br>
            <small>
              ${money(item.price)} · Stock: ${item.stock} · 
              ${item.available ? "Available" : "Hidden"}
            </small>
          </span>
          <div>
            <input class="stock-input" type="number" min="0" 
                   value="${item.stock}" 
                   onchange="updateStock(${item.id}, this.value)">
            <button class="secondary" 
                    onclick="toggleFood(${item.id}, ${!item.available})">
              ${item.available ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      `)
      .join("");
    
    // Render orders list
    document.getElementById("ordersList").innerHTML = allOrders.length
      ? allOrders.map(order => orderCard(order, true)).join("")
      : "<p>এখনো কোনো order নেই।</p>";
      
  } catch (error) {
    toast(error.message);
  }
}

/**
 * Add new food item
 */
async function addFood() {
  const name = document.getElementById("foodName").value.trim();
  const price = Number(document.getElementById("foodPrice").value);
  const stock = Number(document.getElementById("foodStock").value);
  const category = document.getElementById("foodCategory").value;
  const description = document.getElementById("foodDescription").value.trim();
  
  try {
    await api("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, price, stock, category, description,
        emoji: icons[category]
      })
    });
    
    // Clear form
    ["foodName", "foodPrice", "foodStock", "foodDescription"]
      .forEach(id => document.getElementById(id).value = "");
    
    renderAdmin();
    toast("নতুন food item যোগ হয়েছে।");
    
  } catch (error) {
    toast(error.message);
  }
}

/**
 * Toggle food item availability
 */
async function toggleFood(id, available) {
  try {
    await api(`/api/menu/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available })
    });
    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

/**
 * Update food stock
 */
async function updateStock(id, stock) {
  try {
    await api(`/api/menu/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: Number(stock) })
    });
    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

/**
 * Update order status
 */
async function updateStatus(id, status) {
  try {
    await api(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

// ============================================================================
// INITIALIZE ON PAGE LOAD
// ============================================================================

loadMenu();
renderCart();
renderAdmin();
renderSavedOrder();
