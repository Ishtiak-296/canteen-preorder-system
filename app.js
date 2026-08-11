let menu = [];
let cart = [];


// ==============================
// LOAD MENU
// ==============================

async function loadMenu() {

    const status = document.getElementById("menuStatus");
    const container = document.getElementById("menuContainer");

    try {

        const response = await fetch("/api/menu");

        if (!response.ok) {
            throw new Error("Could not load menu");
        }

        menu = await response.json();

        console.log("MENU:", menu);

        displayMenu(menu);

        status.hidden = true;

    } catch (error) {

        console.error(error);

        status.hidden = false;
        status.textContent = "❌ Could not load menu";

    }
}


// ==============================
// DISPLAY MENU
// ==============================

function displayMenu(items) {

    const container = document.getElementById("menuContainer");

    container.innerHTML = "";

    if (items.length === 0) {

        container.innerHTML = "<p>No food available.</p>";

        return;
    }

    items.forEach(function(item) {

        const card = document.createElement("div");

        card.className = "menu-card";

        const unavailable =
            item.stock <= 0 || item.available === 0;

        card.innerHTML = `

            <div class="food-content">

                <h3>${item.name}</h3>

                <p class="food-description">
                    Fresh food available from canteen.
                </p>

                <p>
                    Stock:
                    <strong>${item.stock}</strong>
                </p>

                <div class="food-bottom">

                    <span class="food-price">
                        ৳${item.price}
                    </span>

                    <button
                        class="add-btn"
                        onclick="addToCart('${item.id}')"
                        ${unavailable ? "disabled" : ""}
                    >
                        ${unavailable ? "Unavailable" : "Add to Cart"}
                    </button>

                </div>

            </div>
        `;

        container.appendChild(card);

    });
}


// ==============================
// ADD TO CART
// ==============================

function addToCart(foodId) {

    const food = menu.find(function(item) {
        return item.id === foodId;
    });

    if (!food) {
        alert("Food not found.");
        return;
    }

    if (food.stock <= 0 || food.available === 0) {
        alert("This food is not available.");
        return;
    }

    const existing = cart.find(function(item) {
        return item.id === foodId;
    });

    if (existing) {

        if (existing.quantity >= food.stock) {
            alert("Not enough stock.");
            return;
        }

        existing.quantity++;

    } else {

        cart.push({
            id: food.id,
            name: food.name,
            price: food.price,
            quantity: 1
        });

    }

    updateCart();

    showCart();
}


// ==============================
// UPDATE CART
// ==============================

function updateCart() {

    let count = 0;

    cart.forEach(function(item) {
        count += item.quantity;
    });

    document.getElementById("cartCount").textContent = count;

    displayCart();
}


// ==============================
// DISPLAY CART
// ==============================

function displayCart() {

    const cartItems =
        document.getElementById("cartItems");

    const cartEmpty =
        document.getElementById("cartEmpty");

    const footer =
        document.getElementById("cartFooterFields");

    const totalRow =
        document.getElementById("cartTotalRow");

    const placeButton =
        document.getElementById("placeOrderBtn");

    const totalElement =
        document.getElementById("totalPrice");

    cartItems.innerHTML = "";

    if (cart.length === 0) {

        cartEmpty.hidden = false;
        footer.hidden = true;
        totalRow.hidden = true;
        placeButton.hidden = true;

        totalElement.textContent = "0";

        return;
    }

    cartEmpty.hidden = true;
    footer.hidden = false;
    totalRow.hidden = false;
    placeButton.hidden = false;

    let total = 0;

    cart.forEach(function(item, index) {

        const itemTotal =
            item.price * item.quantity;

        total += itemTotal;

        const div =
            document.createElement("div");

        div.className = "cart-item";

        div.innerHTML = `

            <div>
                <strong>${item.name}</strong>

                <p>
                    ৳${item.price} × ${item.quantity}
                </p>
            </div>

            <div class="quantity-controls">

                <button
                    class="quantity-btn"
                    onclick="decreaseQuantity(${index})">
                    −
                </button>

                <span class="quantity">
                    ${item.quantity}
                </span>

                <button
                    class="quantity-btn"
                    onclick="increaseQuantity(${index})">
                    +
                </button>

            </div>
        `;

        cartItems.appendChild(div);

    });

    totalElement.textContent = total;
}


// ==============================
// INCREASE QUANTITY
// ==============================

function increaseQuantity(index) {

    const cartItem = cart[index];

    const food = menu.find(function(item) {
        return item.id === cartItem.id;
    });

    if (!food) {
        return;
    }

    if (cartItem.quantity >= food.stock) {

        alert("Not enough stock.");

        return;
    }

    cartItem.quantity++;

    updateCart();
}


// ==============================
// DECREASE QUANTITY
// ==============================

function decreaseQuantity(index) {

    if (cart[index].quantity > 1) {

        cart[index].quantity--;

    } else {

        cart.splice(index, 1);

    }

    updateCart();
}


// ==============================
// SHOW CART
// ==============================

function showCart() {

    document.getElementById("cartBox").style.display = "block";

}


// ==============================
// CLOSE CART
// ==============================

function closeCart() {

    document.getElementById("cartBox").style.display = "none";

}


// ==============================
// SEARCH
// ==============================

function searchMenu() {

    const text =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase();

    const filtered =
        menu.filter(function(item) {

            return item.name
                .toLowerCase()
                .includes(text);

        });

    displayMenu(filtered);
}


// ==============================
// CATEGORY
// ==============================

function filterCategory(category, button) {

    document
        .querySelectorAll(".category-btn")
        .forEach(function(btn) {

            btn.classList.remove("active");

        });

    button.classList.add("active");

    // Database-এ category নেই,
    // তাই সব food দেখানো হচ্ছে।

    displayMenu(menu);
}


// ==============================
// PLACE ORDER
// ==============================

async function placeOrder() {

    if (cart.length === 0) {

        alert("Your cart is empty.");

        return;
    }

    const studentName =
        document
            .getElementById("customerName")
            .value
            .trim();

    if (!studentName) {

        alert("Please enter your name.");

        return;
    }

    const table =
        document
            .getElementById("customerTable")
            .value
            .trim();

    if (!table) {

        alert("Please enter table or roll number.");

        return;
    }

    const orderMsg =
        document.getElementById("orderMsg");

    try {

        for (const item of cart) {

            const response =
                await fetch("/api/orders", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        studentName: studentName,

                        foodId: item.id,

                        quantity: item.quantity,

                        pickupTime: table

                    })

                });

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error || "Order failed"
                );

            }

        }

        orderMsg.hidden = false;

        orderMsg.textContent =
            "✅ Order placed successfully!";

        cart = [];

        updateCart();

        await loadMenu();

    } catch (error) {

        console.error(error);

        orderMsg.hidden = false;

        orderMsg.textContent =
            "❌ " + error.message;

    }
}


// ==============================
// START
// ==============================

loadMenu();