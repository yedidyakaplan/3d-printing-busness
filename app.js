console.log("✅ app.js loaded");

// 🔥 Firebase (Auth only) - CDN imports (GOOD for GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ✅ Your Firebase config (from Firebase Console → Project Settings → Web App → Config)
const firebaseConfig = {
  apiKey: "AIzaSyCiOkeeKPQh7RUXWsVG0Gk5laDXzNrdr48",
  authDomain: "dprintinglogin.firebaseapp.com",
  projectId: "dprintinglogin",
  storageBucket: "dprintinglogin.firebasestorage.app",
  messagingSenderId: "285262720729",
  appId: "1:285262720729:web:5f9c2b330bdaa30aba58c8",
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

// ---------- CONFIG ----------
const ADMIN_EMAIL = "yedidyakap@gmail.com";
const CURRENCY = "ILS";

// ---------- HELPERS ----------
const el = (id) => document.getElementById(id);
const money = (n) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: CURRENCY }).format(n || 0);
const uid = () => "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);

function safeOn(id, event, fn) {
  const node = el(id);
  if (node) node.addEventListener(event, fn);
}

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
  },
};

// ---------- STATE ----------
const state = {
  products: store.get("products", []),
  cart: store.get("cart", []),
  selectedId: null,
  user: null,
};

if (!Array.isArray(state.products)) state.products = [];
if (!Array.isArray(state.cart)) state.cart = [];

function save() {
  store.set("products", state.products);
  store.set("cart", state.cart);
}

function isAdmin() {
  return !!state.user && state.user.email === ADMIN_EMAIL;
}

// ---------- NAV ----------
const pages = ["home", "shop", "admin"];

function showPage(page) {
  pages.forEach((p) => el(`page-${p}`)?.classList.add("hidden"));
  el(`page-${page}`)?.classList.remove("hidden");

  document.querySelectorAll(".navItem").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  renderAll();
}

document.querySelectorAll(".navItem").forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    if (page === "admin" && !isAdmin()) return;
    showPage(page);
  });
});

safeOn("ctaShop", "click", () => showPage("shop"));
safeOn("ctaFeatured", "click", () => el("featuredGrid")?.scrollIntoView({ behavior: "smooth" }));

// ---------- SEARCH ----------
safeOn("searchInput", "input", () => renderAll());
safeOn("searchClear", "click", () => {
  el("searchInput").value = "";
  renderAll();
});

// ---------- AUTH (LOGIN/SIGNUP MODAL) ----------
let authMode = "login"; // 'login' | 'signup'

function syncAuthUI() {
  const isLogin = authMode === "login";
  el("authTitle").textContent = isLogin ? "Log in" : "Sign up";
  el("authPrimaryBtn").textContent = isLogin ? "Log in" : "Create account";
  el("authSwitchBtn").textContent = isLogin ? "Sign up" : "Back to login";
  el("authSwitchText").textContent = isLogin ? "Don’t have an account?" : "Already have an account?";
}

function openAuthModal() {
  el("loginBackdrop").classList.remove("hidden");
  el("loginModal").classList.remove("hidden");
  el("authError").textContent = "";
  syncAuthUI();
}

function closeAuthModal() {
  el("loginBackdrop").classList.add("hidden");
  el("loginModal").classList.add("hidden");
}

async function doAuthPrimary() {
  const email = el("authEmail").value.trim();
  const pass = el("authPass").value;
  el("authError").textContent = "";

  if (!email || !pass) {
    el("authError").textContent = "Enter email + password.";
    return;
  }

  try {
    if (authMode === "signup") {
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
    closeAuthModal();
  } catch (err) {
    el("authError").textContent = err?.message || "Auth failed";
  }
}

safeOn("loginBtn", "click", openAuthModal);
safeOn("authCloseBtn", "click", closeAuthModal);
safeOn("loginBackdrop", "click", closeAuthModal);
safeOn("authPrimaryBtn", "click", doAuthPrimary);
safeOn("authSwitchBtn", "click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  syncAuthUI();
});
safeOn("logoutBtn", "click", () => signOut(auth));

// ✅ When auth changes, update UI + admin visibility
onAuthStateChanged(auth, (user) => {
  state.user = user || null;

  el("loginBtn")?.classList.toggle("hidden", !!user);
  el("logoutBtn")?.classList.toggle("hidden", !user);

  el("userEmail").textContent = user ? user.email : "Guest";
  el("accountLabel").textContent = user ? user.email.split("@")[0] : "Guest";

  // Admin tab
  el("navAdmin")?.classList.toggle("hidden", !isAdmin());

  // If you were on admin and you lost admin, go home
  const adminVisible = el("page-admin") && !el("page-admin").classList.contains("hidden");
  if (adminVisible && !isAdmin()) showPage("home");

  renderAll();
});

// ---------- PRODUCT RENDER ----------
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function productCard(p) {
  const div = document.createElement("div");
  div.className = "itemCard";
  div.innerHTML = `
    <div class="itemImg" style="background-image:url('${p.img || ""}')"></div>
    <div class="itemBody">
      <div class="itemName">${escapeHtml(p.name)}</div>
      <div class="itemDesc">${escapeHtml(p.desc || "")}</div>
      <div class="itemPrice">${money(p.price)}</div>
    </div>
  `;
  div.addEventListener("click", () => openProduct(p.id));
  return div;
}

function renderFeatured() {
  const grid = el("featuredGrid");
  grid.innerHTML = "";

  const list = state.products.slice(0, 6);
  if (list.length === 0) {
    grid.innerHTML = `<div class="muted">No products yet. Log in as admin and add items.</div>`;
    return;
  }

  list.forEach((p) => grid.appendChild(productCard(p)));
}

function renderShop() {
  const grid = el("shopGrid");
  grid.innerHTML = "";

  const q = el("searchInput").value.trim().toLowerCase();
  const list = state.products.filter((p) => {
    if (!q) return true;
    const hay = (p.name + " " + (p.desc || "")).toLowerCase();
    return hay.includes(q);
  });

  if (list.length === 0) {
    grid.innerHTML = `<div class="muted">No matching products.</div>`;
    return;
  }

  list.forEach((p) => grid.appendChild(productCard(p)));
}

// ---------- PRODUCT MODAL ----------
function openProduct(id) {
  state.selectedId = id;
  const p = state.products.find((x) => x.id === id);
  if (!p) return;

  el("pTitle").textContent = p.name;
  el("pDesc").textContent = p.desc || "";
  el("pPrice").textContent = money(p.price);
  el("pImage").style.backgroundImage = `url('${p.img || ""}')`;

  el("modalBackdrop").classList.remove("hidden");
  el("productModal").classList.remove("hidden");
}

function closeProduct() {
  el("modalBackdrop").classList.add("hidden");
  el("productModal").classList.add("hidden");
  state.selectedId = null;
}

safeOn("pClose", "click", closeProduct);
safeOn("modalBackdrop", "click", closeProduct);

safeOn("pAddCart", "click", () => {
  if (!state.selectedId) return;
  addToCart(state.selectedId, 1);
  closeProduct();
});

safeOn("pBuyNow", "click", () => {
  if (!state.selectedId) return;
  addToCart(state.selectedId, 1);
  closeProduct();
  openCheckout();
});

// ---------- CART ----------
function addToCart(id, qty) {
  const item = state.cart.find((x) => x.id === id);
  if (item) item.qty += qty;
  else state.cart.push({ id, qty });
  save();
  renderAll();
}

function removeFromCart(id) {
  state.cart = state.cart.filter((x) => x.id !== id);
  save();
  renderAll();
}

function setQty(id, qty) {
  const item = state.cart.find((x) => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  save();
  renderAll();
}

function cartCount() {
  return state.cart.reduce((a, b) => a + (b.qty || 0), 0);
}

function cartTotal() {
  let total = 0;
  for (const c of state.cart) {
    const p = state.products.find((x) => x.id === c.id);
    if (!p) continue;
    total += (p.price || 0) * (c.qty || 0);
  }
  return total;
}

function openCart() {
  el("cartBackdrop").classList.remove("hidden");
  el("cartDrawer").classList.remove("hidden");
  renderCart();
}

function closeCart() {
  el("cartBackdrop").classList.add("hidden");
  el("cartDrawer").classList.add("hidden");
}

safeOn("cartBtn", "click", openCart);
safeOn("closeCart", "click", closeCart);
safeOn("cartBackdrop", "click", closeCart);

function renderCart() {
  const wrap = el("cartItems");
  wrap.innerHTML = "";

  if (state.cart.length === 0) {
    wrap.innerHTML = `<div class="muted">Your cart is empty.</div>`;
    el("cartTotal").textContent = money(0);
    return;
  }

  state.cart.forEach((c) => {
    const p = state.products.find((x) => x.id === c.id);
    if (!p) return;

    const row = document.createElement("div");
    row.className = "cartRow";
    row.innerHTML = `
      <div class="left">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="muted">${money(p.price)} • Qty: ${c.qty}</div>
      </div>
      <div class="right row gap">
        <button class="smallBtn" data-action="minus">-</button>
        <button class="smallBtn" data-action="plus">+</button>
        <button class="smallBtn" data-action="remove">Remove</button>
      </div>
    `;

    row.querySelector('[data-action="minus"]').addEventListener("click", () => setQty(c.id, c.qty - 1));
    row.querySelector('[data-action="plus"]').addEventListener("click", () => setQty(c.id, c.qty + 1));
    row.querySelector('[data-action="remove"]').addEventListener("click", () => removeFromCart(c.id));

    wrap.appendChild(row);
  });

  el("cartTotal").textContent = money(cartTotal());
}

// ---------- CHECKOUT ----------
function openCheckout() {
  if (!state.user) {
    openAuthModal();
    return;
  }
  if (state.cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }
  el("checkoutBackdrop").classList.remove("hidden");
  el("checkoutModal").classList.remove("hidden");
}

function closeCheckout() {
  el("checkoutBackdrop").classList.add("hidden");
  el("checkoutModal").classList.add("hidden");
}

safeOn("checkoutBtn", "click", openCheckout);
safeOn("checkoutCancel", "click", closeCheckout);
safeOn("checkoutCancel2", "click", closeCheckout);
safeOn("checkoutBackdrop", "click", closeCheckout);

safeOn("placeOrderBtn", "click", () => {
  if (!state.user) {
    openAuthModal();
    return;
  }
  const phone = el("cPhone").value.trim();
  const addr = el("cAddress").value.trim();

  if (!phone || !addr) {
    alert("Please enter phone number and address.");
    return;
  }

  alert(
    `Order placed!\n\nEmail: ${state.user.email}\nPhone: ${phone}\nAddress: ${addr}\nTotal: ${money(cartTotal())}`
  );

  state.cart = [];
  save();
  renderAll();
  closeCheckout();
  closeCart();
});

// ---------- ADMIN ----------
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

safeOn("addItemBtn", "click", async () => {
  if (!isAdmin()) {
    alert("Admin only.");
    return;
  }

  const name = el("aName").value.trim();
  const desc = el("aDesc").value.trim();
  const price = Number(el("aPrice").value);
  const file = el("aImg").files?.[0];

  if (!name || !Number.isFinite(price)) {
    alert("Enter name + price.");
    return;
  }

  let img = "";
  if (file) img = await fileToDataUrl(file);

  state.products.unshift({ id: uid(), name, desc, price, img });

  el("aName").value = "";
  el("aDesc").value = "";
  el("aPrice").value = "";
  el("aImg").value = "";

  save();
  renderAll();
});

function renderAdmin() {
  const list = el("adminList");
  list.innerHTML = "";

  if (!isAdmin()) {
    list.innerHTML = `<div class="muted">Log in with admin email to manage products.</div>`;
    return;
  }

  if (state.products.length === 0) {
    list.innerHTML = `<div class="muted">No products yet.</div>`;
    return;
  }

  state.products.forEach((p) => {
    const row = document.createElement("div");
    row.className = "adminRow";
    row.innerHTML = `
      <div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="tiny muted">${money(p.price)}</div>
      </div>
      <div class="right">
        <button class="smallBtn">Delete</button>
      </div>
    `;
    row.querySelector("button").addEventListener("click", () => {
      if (!confirm(`Delete "${p.name}"?`)) return;
      state.products = state.products.filter((x) => x.id !== p.id);
      state.cart = state.cart.filter((x) => x.id !== p.id);
      save();
      renderAll();
    });
    list.appendChild(row);
  });
}

// ---------- RENDER ALL ----------
function renderAll() {
  el("cartCount").textContent = String(cartCount());
  renderFeatured();
  renderShop();
  renderCart();
  renderAdmin();
}

renderAll();
showPage("home");