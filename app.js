let menu = [];
let cart = [];


// =========================
// LOAD MENU
// =========================

async function loadMenu() {
    const status = document.getElementById("menuStatus");
    const container = document.getElementById("menuContainer");

    try {
        const response = await fetch("http://localhost:4000/api/menu");

        if (!response.ok) {
            throw new Error("Failed to load menu");
        }

        menu = await response.json();

        status.hidden = true;
        container.hidden = false;

        displayMenu();

    } catch (error) {
        console.error(error);

        status.hidden = false;

        status.innerHTML = `
            ❌ Failed to load menu.
            <br>
            Make sure the server is running.
        `;
    }
}


// =========================
// DISPLAY MENU
// =========================

function displayMenu() {

    const container =
        document.getElementById("menuContainer");

    if (menu.length === 0) {
        container.innerHTML = `
            <div class="menu-status">
                No food available.
            </div>
        `;
        return;
    }

    container.innerHTML = menu.map(item => {

        const outOfStock =
            item.stock <= 0 || item.available !== 1;

        return `
            <div class="menu-card">

                <div class="food-content">

                    <h3>${item.name}</h3>

                    <p class="food-description">
                        Fresh and delicious ${item.name}
                    </p>

                    <p>
                        Stock: ${item.stock}
                    </p>

                    <div class="food-bottom">

                        <span class="food-price">
                            ৳${item.price}
                        </span>

                        ${
                            outOfStock
                            ? `
                                <button
                                    class="add-btn"
                                    disabled>
                                    Out of Stock
                                </button>
                            `
                            : `
                                <button
                                    class="add-btn"
                                    onclick="addToCart('${item.id}')">
                                    + Add
                                </button>
                            `
                        }

                    </div>

                </div>

            </div>
        `;

    }).join("");
}


// =========================
// ADD TO CART
// =========================

function addToCart(id) {

    const item = menu.find(
        food => String(food.id) === String(id)
    );

    if (!item) {
        alert("Food item not found.");
        return;
    }

    const existing = cart.find(
        food => String(food.id) === String(id)
    );

    if (existing) {

        if (existing.quantity < item.stock) {
            existing.quantity++;
        } else {
            alert("Maximum available stock reached.");
        }

    } else {

        cart.push({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            stock: Number(item.stock),
            quantity: 1
        });
    }

    updateCart();
    showCart();
}


// =========================
// UPDATE CART
// =========================

function updateCart() {

    const cartCount =
        document.getElementById("cartCount");

    const cartItems =
        document.getElementById("cartItems");

    const cartEmpty =
        document.getElementById("cartEmpty");

    const footerFields =
        document.getElementById("cartFooterFields");

    const totalRow =
        document.getElementById("cartTotalRow");

    const placeOrderBtn =
        document.getElementById("placeOrderBtn");


    const totalQuantity = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    cartCount.textContent = totalQuantity;


    if (cart.length === 0) {

        cartEmpty.hidden = false;
        footerFields.hidden = true;
        totalRow.hidden = true;
        placeOrderBtn.hidden = true;

        cartItems.innerHTML = "";

        return;
    }


    cartEmpty.hidden = true;
    footerFields.hidden = false;
    totalRow.hidden = false;
    placeOrderBtn.hidden = false;


    cartItems.innerHTML = cart.map((item, index) => {

        return `
            <div class="cart-item">

                <div class="cart-item-info">

                    <h4>${item.name}</h4>

                    <p>
                        ৳${item.price} × ${item.quantity}
                    </p>

                </div>


                <div class="quantity-controls">

                    <button
                        class="quantity-btn"
                        onclick="changeQuantity(${index}, -1)">
                        −
                    </button>

                    <span class="quantity">
                        ${item.quantity}
                    </span>

                    <button
                        class="quantity-btn"
                        onclick="changeQuantity(${index}, 1)">
                        +
                    </button>

                </div>

            </div>
        `;

    }).join("");

    calculateTotal();
}


// =========================
// CHANGE QUANTITY
// =========================

function changeQuantity(index, change) {

    const item = cart[index];

    if (change > 0 && item.quantity >= item.stock) {
        alert("Maximum available stock reached.");
        return;
    }

    item.quantity += change;

    if (item.quantity <= 0) {
        cart.splice(index, 1);
    }

    updateCart();
}


// =========================
// CALCULATE TOTAL
// =========================

function calculateTotal() {

    const total = cart.reduce(
        (sum, item) =>
            sum + item.price * item.quantity,
        0
    );

    document.getElementById("totalPrice").textContent = total;
}


// =========================
// SHOW CART
// =========================

function showCart() {

    const cartBox =
        document.getElementById("cartBox");

    cartBox.classList.add("show");

    cartBox.scrollIntoView({
        behavior: "smooth"
    });
}


// =========================
// CLOSE CART
// =========================

function closeCart() {

    document
        .getElementById("cartBox")
        .classList.remove("show");
}


// =========================
// PLACE ORDER
// =========================

async function placeOrder() {

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const name =
        document.getElementById("customerName")
        .value.trim();

    const table =
        document.getElementById("customerTable")
        .value.trim();


    if (!name) {
        alert("Please enter your name.");
        return;
    }

    if (!table) {
        alert("Please enter your table or roll number.");
        return;
    }


    const orderData = {
        customerName: name,
        customerTable: table,

        items: cart.map(item => ({
            menu_id: item.id,
            quantity: item.quantity,
            price: item.price
        })),

        total: cart.reduce(
            (sum, item) =>
                sum + item.price * item.quantity,
            0
        )
    };


    try {

        const response = await fetch(
            "http://localhost:4000/api/orders",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(orderData)
            }
        );


        const result = await response.json();


        if (!response.ok) {
            throw new Error(
                result.message || "Order failed"
            );
        }


        document.getElementById("orderMsg").hidden = false;

        document.getElementById("orderMsg").innerHTML = `
            ✅ Order placed successfully!
            <br>
            Order ID:
            <strong>#${result.orderId || result.id || ""}</strong>
        `;


        cart = [];

        updateCart();

        document.getElementById("customerName").value = "";
        document.getElementById("customerTable").value = "";


    } catch (error) {

        console.error(error);

        alert(
            "❌ Failed to place order.\n" +
            error.message
        );
    }
}


// =========================
// START
// =========================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadMenu();
        updateCart();
    }
);