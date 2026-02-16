// ========= CONFIG =========
const ADMIN_EMAIL = "you@email.com"; // <-- CHANGE THIS to your admin email
const CURRENCY = "ILS";

// ========= STORAGE =========
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

let state = {
  user: store.get("user", null), // { email }
  cart: store.get("cart", []),   // [{id, qty}]
  products: store.get("products", []), // [{id,name,desc,price,imgDataUrl}]
  search: ""
};

// Remove all demo items: start empty unless you already added items.
if (!Array.isArray(state.products)) state.products = [];
store.set("products", state.products);

// ========= HELPERS =========
const money = (n) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: CURRENCY }).format(n || 0);

const uid = () => "p_" + Math.random().toString(16).slice(2) + Date.now().toString(16);

function isAdmin() {
  return !!state.user?.email && state.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function saveAll() {
  store.set("user", state.user);
  store.set("cart", state.cart);
  store.set("products", state.products);
}

// ========= DOM =========
const pages = {
  home: document.getElementById("page-home"),
  shop: document.getElementById("page-shop"),
  admin: document.getElementById("page-admin"),
};
const navItems = [...document.querySelectorAll(".navItem")];

const featuredGrid = document.getElementById("featuredGrid");
const shopGrid = document.getElementById("shopGrid");

const adminTab = document.getElementById("adminTab");
const adminList = document.getElementById("adminList");
const addItemBtn = document.getElementById("addItemBtn");
const aName = document.getElementById("aName");
const aDesc = document.getElementById("aDesc");
const aPrice = document.getElementById("aPrice");
const aImg = document.getElementById("aImg");

const accountBtn = document.getElementById("accountBtn");
const accountLabel = document.getElementById("accountLabel");
const loginBtnSidebar = document.getElementById("loginBtnSidebar");
const logoutBtnSidebar = document.getElementById("logoutBtnSidebar");

const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartBackdrop = document.getElementById("cartBackdrop");
const cartDrawer = document.getElementById("cartDrawer");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

const modalBackdrop = document.getElementById("modalBackdrop");
const loginModal = document.getElementById("loginModal");
const loginEmail = document.getElementById("loginEmail");
const loginSubmit = document.getElementById("loginSubmit");
const loginCancel = document.getElementById("loginCancel");

const productModal = document.getElementById("productModal");
const pTitle = document.getElementById("pTitle");
const pImage = document.getElementById("pImage");
const pPrice = document.getElementById("pPrice");
const pDesc = document.getElementById("pDesc");
const pClose = document.getElementById("pClose");
const pBuyNow = document.getElementById("pBuyNow");
const pAddCart = document.getElementById("pAddCart");

const checkoutModal = document.getElementById("checkoutModal");
const cPhone = document.getElementById("cPhone");
const cAddress = document.getElementById("cAddress");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const checkoutCancel = document.getElementById("checkoutCancel");

const ctaShop = document.getElementById("ctaShop");
const ctaFeatured = document.getElementById("ctaFeatured");

// ========= NAV =========
function setPage(page) {
  Object.values(pages).forEach(p => p.classList.add("hidden"));
  pages[page].classList.remove("hidden");
  navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));
}

navItems.forEach(btn => btn.addEventListener("click", () => setPage(btn.dataset.page)));
ctaShop.addEventListener("click", () => setPage("shop"));
ctaFeatured.addEventListener("click", () => window.scrollTo({ top: 500, behavior: "smooth" }));

// ========= MODALS =========
function openModal(which) {
  modalBackdrop.classList.remove("hidden");
  which.classList.remove("hidden");
}
function closeModals() {
  modalBackdrop.classList.add("hidden");
  loginModal.classList.add("hidden");
  productModal.classList.add("hidden");
  checkoutModal.classList.add("hidden");
}
modalBackdrop.addEventListener("click", closeModals);
loginCancel.addEventListener("click", closeModals);
pClose.addEventListener("click", closeModals);
checkoutCancel.addEventListener("click", closeModals);

// ========= LOGIN =========
function renderUser() {
  const email = state.user?.email;
  accountLabel.textContent = email ? email : "Guest";

  if (email) {
    loginBtnSidebar.classList.add("hidden");
    logoutBtnSidebar.classList.remove("hidden");
  } else {
    loginBtnSidebar.classList.remove("hidden");
    logoutBtnSidebar.classList.add("hidden");
  }

  if (isAdmin()) adminTab.classList.remove("hidden");
  else adminTab.classList.add("hidden");
}

loginBtnSidebar.addEventListener("click", () => {
  loginEmail.value = "";
  openModal(loginModal);
  loginEmail.focus();
});

accountBtn.addEventListener("click", () => {
  if (!state.user?.email) {
    openModal(loginModal);
    loginEmail.focus();
    return;
  }
  // quick info for now
  alert(`Logged in as: ${state.user.email}${isAdmin() ? "\n(Admin)" : ""}`);
});

loginSubmit.addEventListener("click", () => {
  const email = (loginEmail.value || "").trim();
  if (!email || !email.includes("@")) return alert("Enter a valid email.");
  state.user = { email };
  saveAll();
  closeModals();
  renderUser();
  renderAdmin();
});

logoutBtnSidebar.addEventListener("click", () => {
  state.user = null;
  saveAll();
  renderUser();
  renderAdmin();
});

// ========= SEARCH =========
searchInput.addEventListener("input", () => {
  state.search = searchInput.value.trim().toLowerCase();
  renderProducts();
});
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  state.search = "";
  renderProducts();
});

function matchesSearch(p) {
  if (!state.search) return true;
  const blob = `${p.name} ${p.desc}`.toLowerCase();
  return blob.includes(state.search);
}

// ========= PRODUCTS UI =========
function productCard(p) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div class="thumb">${p.imgDataUrl ? `<img alt="${p.name}" src="${p.imgDataUrl}">` : "📦"}</div>
    <div class="titleRow">
      <h3>${p.name}</h3>
      <div class="price">${money(p.price)}</div>
    </div>
    <p class="desc">${p.desc || ""}</p>
    <button class="ghostBtn" data-open="${p.id}">View</button>
  `;
  div.querySelector("[data-open]").addEventListener("click", () => openProduct(p.id));
  return div;
}

function renderProducts() {
  const filtered = state.products.filter(matchesSearch);

  featuredGrid.innerHTML = "";
  shopGrid.innerHTML = "";

  filtered.slice(0, 4).forEach(p => featuredGrid.appendChild(productCard(p)));
  filtered.forEach(p => shopGrid.appendChild(productCard(p)));

  if (state.products.length === 0) {
    featuredGrid.innerHTML = `<div class="muted">No products yet. Log in as admin and add items.</div>`;
    shopGrid.innerHTML = `<div class="muted">No products yet. Log in as admin and add items.</div>`;
  }
}

// ========= PRODUCT MODAL =========
let currentProductId = null;

function openProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  currentProductId = id;

  pTitle.textContent = p.name;
  pDesc.textContent = p.desc || "";
  pPrice.textContent = money(p.price);

  pImage.innerHTML = p.imgDataUrl ? `<img alt="${p.name}" src="${p.imgDataUrl}">` : "📦";

  openModal(productModal);
}

pAddCart.addEventListener("click", () => {
  if (!currentProductId) return;
  addToCart(currentProductId);
  closeModals();
});

pBuyNow.addEventListener("click", () => {
  if (!currentProductId) return;
  addToCart(currentProductId);
  closeModals();
  openCheckout();
});

// ========= CART =========
function cartQtyFor(id) {
  const item = state.cart.find(x => x.id === id);
  return item ? item.qty : 0;
}
function addToCart(id) {
  const item = state.cart.find(x => x.id === id);
  if (item) item.qty += 1;
  else state.cart.push({ id, qty: 1 });
  saveAll();
  renderCart();
}
function removeFromCart(id) {
  state.cart = state.cart.filter(x => x.id !== id);
  saveAll();
  renderCart();
}
function changeQty(id, delta) {
  const item = state.cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  saveAll();
  renderCart();
}
function calcTotal() {
  let total = 0;
  for (const item of state.cart) {
    const p = state.products.find(pp => pp.id === item.id);
    if (!p) continue;
    total += (p.price || 0) * item.qty;
  }
  return total;
}
function renderCart() {
  const count = state.cart.reduce((sum, x) => sum + x.qty, 0);
  cartCount.textContent = count;

  cartItems.innerHTML = "";
  if (state.cart.length === 0) {
    cartItems.innerHTML = `<div class="muted">Your cart is empty.</div>`;
    cartTotal.textContent = money(0);
    return;
  }

  for (const item of state.cart) {
    const p = state.products.find(pp => pp.id === item.id);
    if (!p) continue;

    const div = document.createElement("div");
    div.className = "cartItem";
    div.innerHTML = `
      <div class="cartRow">
        <div><strong>${p.name}</strong></div>
        <button class="ghostBtn" data-remove="${p.id}">Remove</button>
      </div>
      <div class="cartRow">
        <div class="muted">${money(p.price)} each</div>
        <div class="cartRow">
          <button class="ghostBtn" data-dec="${p.id}">−</button>
          <strong>${item.qty}</strong>
          <button class="ghostBtn" data-inc="${p.id}">+</button>
        </div>
      </div>
    `;
    cartItems.appendChild(div);
  }

  cartItems.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => removeFromCart(b.dataset.remove)));
  cartItems.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.inc, +1)));
  cartItems.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.dec, -1)));

  cartTotal.textContent = money(calcTotal());
}

// drawer
function openCart() {
  cartBackdrop.classList.remove("hidden");
  cartDrawer.classList.remove("hidden");
}
function closeCartDrawer() {
  cartBackdrop.classList.add("hidden");
  cartDrawer.classList.add("hidden");
}
cartBtn.addEventListener("click", openCart);
closeCart.addEventListener("click", closeCartDrawer);
cartBackdrop.addEventListener("click", closeCartDrawer);

// ========= CHECKOUT =========
function openCheckout() {
  if (!state.user?.email) {
    alert("You must be logged in to buy.");
    openModal(loginModal);
    return;
  }
  if (state.cart.length === 0) return alert("Your cart is empty.");
  cPhone.value = "";
  cAddress.value = "";
  openModal(checkoutModal);
}

checkoutBtn.addEventListener("click", openCheckout);

placeOrderBtn.addEventListener("click", () => {
  const phone = (cPhone.value || "").trim();
  const address = (cAddress.value || "").trim();
  if (!phone) return alert("Enter your phone number.");
  if (!address) return alert("Enter your address.");

  // Placeholder order
  const total = money(calcTotal());
  alert(
    `Order created (demo) ✅\n\nEmail: ${state.user.email}\nPhone: ${phone}\nAddress: ${address}\nTotal: ${total}\n\nNext step: real payment (Stripe).`
  );

  // clear cart after demo order
  state.cart = [];
  saveAll();
  renderCart();
  closeModals();
  closeCartDrawer();
});

// ========= ADMIN =========
function renderAdmin() {
  if (!isAdmin()) {
    adminList.innerHTML = `<div class="muted">Log in as admin (${ADMIN_EMAIL}) to manage items.</div>`;
    return;
  }

  adminList.innerHTML = "";
  if (state.products.length === 0) {
    adminList.innerHTML = `<div class="muted">No items yet. Add your first one.</div>`;
    return;
  }

  state.products.forEach(p => {
    const row = document.createElement("div");
    row.className = "adminRow";
    row.innerHTML = `
      <div>
        <strong>${p.name}</strong>
        <div class="tiny muted">${money(p.price)}</div>
      </div>
      <button class="dangerBtn" data-del="${p.id}">Delete</button>
    `;
    row.querySelector("[data-del]").addEventListener("click", () => {
      if (!confirm(`Delete "${p.name}"?`)) return;
      state.products = state.products.filter(x => x.id !== p.id);
      // also remove from cart
      state.cart = state.cart.filter(x => x.id !== p.id);
      saveAll();
      renderProducts();
      renderCart();
      renderAdmin();
    });
    adminList.appendChild(row);
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

addItemBtn.addEventListener("click", async () => {
  if (!isAdmin()) return alert("Admin only.");

  const name = (aName.value || "").trim();
  const desc = (aDesc.value || "").trim();
  const price = Number(aPrice.value);

  if (!name) return alert("Add a name.");
  if (!Number.isFinite(price) || price < 0) return alert("Add a valid price in ₪.");

  let imgDataUrl = "";
  if (aImg.files && aImg.files[0]) {
    const file = aImg.files[0];
    imgDataUrl = await fileToDataUrl(file);
  }

  state.products.unshift({ id: uid(), name, desc, price, imgDataUrl });
  saveAll();

  aName.value = "";
  aDesc.value = "";
  aPrice.value = "";
  aImg.value = "";

  renderProducts();
  renderAdmin();
  alert("Item added ✅");
});

// ========= INIT =========
renderUser();
renderProducts();
renderCart();
renderAdmin();
setPage("home");
