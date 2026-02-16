// app.js
console.log("✅ app.js loaded");

// ✅ Firebase CDN imports (GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  reload
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCiOkeeKPQh7RUXWsVG0Kk5laDXzNrdr48",
  authDomain: "dprintinglogin.firebaseapp.com",
  projectId: "dprintinglogin",
  storageBucket: "dprintinglogin.firebasestorage.app",
  messagingSenderId: "285262720729",
  appId: "1:285262720729:web:5f9c2b330bdaa30aba58c8"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

// ---------- CONFIG ----------
const ADMIN_EMAIL = "yedidyakap@gmail.com";
const CURRENCY = "ILS";

// ---------- HELPERS ----------
const el = (id) => document.getElementById(id);

function mustEl(id) {
  const node = el(id);
  if (!node) console.warn(`Missing element #${id}`);
  return node;
}

const money = (n) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: CURRENCY }).format(Number(n) || 0);

const uid = () => "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
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
  }
};

// ---------- EMAIL VERIFICATION (ONLY FOR SIGNUP) ----------
async function sendVerifyEmail(user) {
  await sendEmailVerification(user);
}

async function refreshVerified(user) {
  try { await reload(user); } catch {}
  return !!user.emailVerified;
}

function showVerifyMessage() {
  openAuthModal();
  mustEl("authError").textContent =
    "Please verify your email (check inbox), then refresh/reopen the site to unlock checkout/admin.";
}

// ---------- STATE ----------
const state = {
  products: Array.isArray(store.get("products", [])) ? store.get("products", []) : [],
  cart: Array.isArray(store.get("cart", [])) ? store.get("cart", []) : [],
  selectedId: null,
  user: null,
  verified: false
};

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
  pages.forEach(p => mustEl(`page-${p}`)?.classList.add("hidden"));
  mustEl(`page-${page}`)?.classList.remove("hidden");

  document.querySelectorAll(".navItem").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  renderAll();
}

// ✅ IMPORTANT: nav handler is async so we can check verified
document.querySelectorAll(".navItem").forEach(btn => {
  btn.addEventListener("click", async () => {
    const page = btn.dataset.page;

    if (page === "admin") {
      if (!isAdmin()) return;

      const ok = await refreshVerified(state.user);
      state.verified = ok;
      if (!ok) { showVerifyMessage(); return; }
    }

    showPage(page);
  });
});

mustEl("ctaShop")?.addEventListener("click", () => showPage("shop"));
mustEl("ctaFeatured")?.addEventListener("click", () => {
  mustEl("featuredGrid")?.scrollIntoView({ behavior: "smooth" });
});

// ---------- SEARCH ----------
mustEl("searchInput")?.addEventListener("input", () => renderAll());
mustEl("searchClear")?.addEventListener("click", () => {
  const si = mustEl("searchInput");
  if (si) si.value = "";
  renderAll();
});

// ---------- AUTH MODAL ----------
let authMode = "login"; // login | signup

function syncAuthUI() {
  const isLogin = authMode === "login";
  mustEl("authTitle").textContent = isLogin ? "Log in" : "Sign up";
  mustEl("authPrimaryBtn").textContent = isLogin ? "Log in" : "Create account";
  mustEl("authSwitchBtn").textContent = isLogin ? "Sign up" : "Back to login";
  mustEl("authSwitchText").textContent = isLogin ? "Don’t have an account?" : "Already have an account?";
}

function openAuthModal() {
  mustEl("loginBackdrop")?.classList.remove("hidden");
  mustEl("loginModal")?.classList.remove("hidden");
  if (mustEl("authError")) mustEl("authError").textContent = "";
  syncAuthUI();
}

function closeAuthModal() {
  mustEl("loginBackdrop")?.classList.add("hidden");
  mustEl("loginModal")?.classList.add("hidden");
}

async function doAuthPrimary() {
  const email = mustEl("authEmail").value.trim();
  const pass = mustEl("authPass").value;
  mustEl("authError").textContent = "";

  if (!email || !pass) {
    mustEl("authError").textContent = "Enter email + password.";
    return;
  }

  try {
    if (authMode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      // ✅ send verification ONLY on signup
      await sendVerifyEmail(cred.user);

      // ✅ (Optional) keep them logged in, but tell them to verify
      closeAuthModal();
      alert("Account created! Check your email for the verification link. You can log in now, but checkout/admin are locked until you verify.");
      return;
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
      closeAuthModal();
    }
  } catch (err) {
    console.error(err);
    mustEl("authError").textContent = err?.message || "Auth failed";
  }
}

mustEl("loginBtn")?.addEventListener("click", openAuthModal);
mustEl("accountBtn")?.addEventListener("click", openAuthModal);
mustEl("authCloseBtn")?.addEventListener("click", closeAuthModal);
mustEl("loginBackdrop")?.addEventListener("click", closeAuthModal);
mustEl("authPrimaryBtn")?.addEventListener("click", doAuthPrimary);

mustEl("authSwitchBtn")?.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  syncAuthUI();
});

mustEl("logoutBtn")?.addEventListener("click", () => signOut(auth));

// ---------- AUTH STATE ----------
onAuthStateChanged(auth, async (user) => {
  state.user = user || null;
  state.verified = user ? await refreshVerified(user) : false;

  mustEl("loginBtn")?.classList.toggle("hidden", !!user);
  mustEl("logoutBtn")?.classList.toggle("hidden", !user);
  mustEl("userEmail").textContent = user ? user.email : "Guest";
  mustEl("accountLabel").textContent = user ? user.email.split("@")[0] : "Guest";

  // ✅ Admin nav visible only if admin email
  mustEl("navAdmin")?.classList.toggle("hidden", !isAdmin());

  // If user is on admin page but loses access, send home
  const adminVisible = !mustEl("page-admin")?.classList.contains("hidden");
  if (adminVisible && !isAdmin()) showPage("home");

  renderAll();
});

// ---------- PRODUCTS ----------
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
  const grid = mustEl("featuredGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const list = state.products.slice(0, 6);
  if (list.length === 0) {
    grid.innerHTML = `<div class="muted">No products yet. Log in as admin and add items.</div>`;
    return;
  }
  list.forEach(p => grid.appendChild(productCard(p)));
}

function renderShop() {
  const grid = mustEl("shopGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const q = (mustEl("searchInput")?.value || "").trim().toLowerCase();
  const list = state.products.filter(p => {
    if (!q) return true;
    return (p.name + " " + (p.desc || "")).toLowerCase().includes(q);
  });

  if (list.length === 0) {
    grid.innerHTML = `<div class="muted">No matching products.</div>`;
    return;
  }

  list.forEach(p => grid.appendChild(productCard(p)));
}

// ---------- PRODUCT MODAL ----------
function openProduct(id) {
  state.selectedId = id;
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  mustEl("pTitle").textContent = p.name;
  mustEl("pDesc").textContent = p.desc || "";
  mustEl("pPrice").textContent = money(p.price);
  mustEl("pImage").style.backgroundImage = `url('${p.img || ""}')`;

  mustEl("modalBackdrop")?.classList.remove("hidden");
  mustEl("productModal")?.classList.remove("hidden");
}

function closeProduct() {
  mustEl("modalBackdrop")?.classList.add("hidden");
  mustEl("productModal")?.classList.add("hidden");
  state.selectedId = null;
}

mustEl("pClose")?.addEventListener("click", closeProduct);
mustEl("modalBackdrop")?.addEventListener("click", closeProduct);

mustEl("pAddCart")?.addEventListener("click", () => {
  if (!state.selectedId) return;
  addToCart(state.selectedId, 1);
  closeProduct();
});

mustEl("pBuyNow")?.addEventListener("click", () => {
  if (!state.selectedId) return;
  addToCart(state.selectedId, 1);
  closeProduct();
  openCheckout();
});

// ---------- CART ----------
function addToCart(id, qty) {
  const item = state.cart.find(x => x.id === id);
  if (item) item.qty += qty;
  else state.cart.push({ id, qty });
  save();
  renderAll();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(x => x.id !== id);
  save();
  renderAll();
}

function setQty(id, qty) {
  const item = state.cart.find(x => x.id === id);
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
    const p = state.products.find(x => x.id === c.id);
    if (!p) continue;
    total += (p.price || 0) * (c.qty || 0);
  }
  return total;
}

function renderCartBadge() {
  const cc = mustEl("cartCount");
  if (cc) cc.textContent = String(cartCount());
}

function openCart() {
  mustEl("cartBackdrop")?.classList.remove("hidden");
  mustEl("cartDrawer")?.classList.remove("hidden");
  renderCart();
}

function closeCart() {
  mustEl("cartBackdrop")?.classList.add("hidden");
  mustEl("cartDrawer")?.classList.add("hidden");
}

mustEl("cartBtn")?.addEventListener("click", openCart);
mustEl("closeCart")?.addEventListener("click", closeCart);
mustEl("cartBackdrop")?.addEventListener("click", closeCart);

function renderCart() {
  const wrap = mustEl("cartItems");
  if (!wrap) return;
  wrap.innerHTML = "";

  if (state.cart.length === 0) {
    wrap.innerHTML = `<div class="muted">Your cart is empty.</div>`;
    mustEl("cartTotal").textContent = money(0);
    return;
  }

  state.cart.forEach(c => {
    const p = state.products.find(x => x.id === c.id);
    if (!p) return;

    const row = document.createElement("div");
    row.className = "cartRow";
    row.innerHTML = `
      <div class="left">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="muted">${money(p.price)} • Qty: ${c.qty}</div>
      </div>
      <div class="right row gap">
        <button class="smallBtn" type="button" data-action="minus">-</button>
        <button class="smallBtn" type="button" data-action="plus">+</button>
        <button class="smallBtn" type="button" data-action="remove">Remove</button>
      </div>
    `;

    row.querySelector('[data-action="minus"]').addEventListener("click", () => setQty(c.id, c.qty - 1));
    row.querySelector('[data-action="plus"]').addEventListener("click", () => setQty(c.id, c.qty + 1));
    row.querySelector('[data-action="remove"]').addEventListener("click", () => removeFromCart(c.id));

    wrap.appendChild(row);
  });

  mustEl("cartTotal").textContent = money(cartTotal());
}

// ---------- CHECKOUT (LOCKED UNTIL VERIFIED) ----------
async function openCheckout() {
  if (!state.user) {
    openAuthModal();
    return;
  }

  const ok = await refreshVerified(state.user);
  state.verified = ok;
  if (!ok) {
    showVerifyMessage();
    return;
  }

  if (state.cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  mustEl("checkoutBackdrop")?.classList.remove("hidden");
  mustEl("checkoutModal")?.classList.remove("hidden");
}

function closeCheckout() {
  mustEl("checkoutBackdrop")?.classList.add("hidden");
  mustEl("checkoutModal")?.classList.add("hidden");
}

mustEl("checkoutBtn")?.addEventListener("click", openCheckout);
mustEl("checkoutCancel")?.addEventListener("click", closeCheckout);
mustEl("checkoutCancel2")?.addEventListener("click", closeCheckout);
mustEl("checkoutBackdrop")?.addEventListener("click", closeCheckout);

mustEl("placeOrderBtn")?.addEventListener("click", async () => {
  if (!state.user) {
    openAuthModal();
    return;
  }

  const ok = await refreshVerified(state.user);
  state.verified = ok;
  if (!ok) {
    showVerifyMessage();
    return;
  }

  const phone = mustEl("cPhone").value.trim();
  const addr = mustEl("cAddress").value.trim();

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
mustEl("addItemBtn")?.addEventListener("click", async () => {
  if (!isAdmin()) {
    alert("Admin only.");
    return;
  }

  const ok = await refreshVerified(state.user);
  state.verified = ok;
  if (!ok) { showVerifyMessage(); return; }

  const name = mustEl("aName").value.trim();
  const desc = mustEl("aDesc").value.trim();
  const price = Number(mustEl("aPrice").value);
  const file = mustEl("aImg").files?.[0];

  if (!name || !Number.isFinite(price)) {
    alert("Enter name + price.");
    return;
  }

  let img = "";
  if (file) img = await fileToDataUrl(file);

  state.products.unshift({ id: uid(), name, desc, price, img });

  mustEl("aName").value = "";
  mustEl("aDesc").value = "";
  mustEl("aPrice").value = "";
  mustEl("aImg").value = "";

  save();
  renderAll();
});

function renderAdmin() {
  const list = mustEl("adminList");
  if (!list) return;
  list.innerHTML = "";

  if (!isAdmin()) {
    list.innerHTML = `<div class="muted">Log in with admin email to manage products.</div>`;
    return;
  }

  if (state.products.length === 0) {
    list.innerHTML = `<div class="muted">No products yet.</div>`;
    return;
  }

  state.products.forEach(p => {
    const row = document.createElement("div");
    row.className = "adminRow";
    row.innerHTML = `
      <div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="tiny muted">${money(p.price)}</div>
      </div>
      <div class="right">
        <button class="smallBtn" type="button">Delete</button>
      </div>
    `;
    row.querySelector("button").addEventListener("click", () => {
      if (!confirm(`Delete "${p.name}"?`)) return;
      state.products = state.products.filter(x => x.id !== p.id);
      state.cart = state.cart.filter(x => x.id !== p.id);
      save();
      renderAll();
    });
    list.appendChild(row);
  });
}

// ---------- RENDER ----------
function renderAll() {
  renderFeatured();
  renderShop();
  renderCartBadge();
  renderCart();
  renderAdmin();
}

renderAll();
showPage("home");
