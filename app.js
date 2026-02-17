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
  reload,
  applyActionCode
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ✅ NEW: Firestore imports
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(fbApp); // ✅ NEW

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

// ---------- EMAIL VERIFICATION ----------
async function sendVerifyEmail(user) {
  await sendEmailVerification(user);
}

async function refreshVerified(user) {
  try { await reload(user); } catch {}
  return !!user.emailVerified;
}

function showVerifyBlocked(reason = "this feature") {
  alert(`Please verify your email to use ${reason}. Check your inbox and click the verification link.`);
}

// ---------- STATE ----------
const state = {
  products: Array.isArray(store.get("products", [])) ? store.get("products", []) : [],
  cart: Array.isArray(store.get("cart", [])) ? store.get("cart", []) : [],
  selectedId: null,
  user: null,
  verified: false,

  // ✅ NEW: orders loaded from Firestore
  ordersAll: [],     // admin
  ordersMine: []     // customer
};

function save() {
  store.set("products", state.products);
  store.set("cart", state.cart);
}

function isAdmin() {
  return !!state.user && state.user.email === ADMIN_EMAIL;
}

function formatDateAny(v) {
  try {
    // Firestore Timestamp -> toDate()
    if (v && typeof v.toDate === "function") return v.toDate().toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
    // ISO string
    if (typeof v === "string") return new Date(v).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
    // JS Date
    if (v instanceof Date) return v.toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
  } catch {}
  return "Unknown date";
}

// ---------- AUTH MODAL ----------
let authMode = "login"; // login | signup

function syncAuthUI() {
  const isLogin = authMode === "login";
  mustEl("authTitle").textContent = isLogin ? "Log in" : "Sign up";
  mustEl("authPrimaryBtn").textContent = isLogin ? "Log in" : "Create account";
  mustEl("authSwitchBtn").textContent = isLogin ? "Sign up" : "Back to login";
  mustEl("authSwitchText").textContent = isLogin ? "Don’t have an account?" : "Already have an account?";
}

function openAuthModal(mode = "login") {
  authMode = mode;
  syncAuthUI();
  mustEl("loginBackdrop")?.classList.remove("hidden");
  mustEl("loginModal")?.classList.remove("hidden");
}

function closeAuthModal() {
  mustEl("loginBackdrop")?.classList.add("hidden");
  mustEl("loginModal")?.classList.add("hidden");
}

function setAuthError(msg) {
  const e = mustEl("authError");
  if (e) e.textContent = msg || "";
}

// ---------- HANDLE VERIFICATION LINK ----------
async function handleEmailActionLink() {
  const url = new URL(location.href);
  const mode = url.searchParams.get("mode");
  const oobCode = url.searchParams.get("oobCode");

  if (!mode || !oobCode) return;

  try {
    if (mode === "verifyEmail" || mode === "action") {
      await applyActionCode(auth, oobCode);
      alert("✅ Email verified! Now you can log in.");
    }
  } catch (e) {
    console.warn("Email action link error:", e);
    alert("⚠️ This verification link is invalid or expired. Try signing up again.");
  } finally {
    url.searchParams.delete("mode");
    url.searchParams.delete("oobCode");
    url.searchParams.delete("apiKey");
    url.searchParams.delete("continueUrl");
    url.searchParams.delete("lang");
    history.replaceState({}, "", url.pathname + url.search + url.hash);

    if (auth.currentUser) {
      state.verified = await refreshVerified(auth.currentUser);
      renderAll();
    }
  }
}
handleEmailActionLink();

// ---------- NAV ----------
const pages = ["home", "shop", "help", "myorders", "orders", "admin"];

function showPage(page) {
  pages.forEach(p => mustEl(`page-${p}`)?.classList.add("hidden"));
  mustEl(`page-${page}`)?.classList.remove("hidden");

  document.querySelectorAll(".navItem").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  renderAll();
}

document.querySelectorAll(".navItem").forEach(btn => {
  btn.addEventListener("click", async () => {
    const page = btn.dataset.page;

    if (page === "admin" || page === "orders") {
      if (!isAdmin()) return;

      const ok = await refreshVerified(state.user);
      state.verified = ok;
      if (!ok) {
        showVerifyBlocked(page === "admin" ? "Admin" : "Orders");
        return;
      }
    }

    if (page === "myorders") {
      if (!state.user) {
        openAuthModal("login");
        return;
      }
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

// ---------- AUTH BUTTONS ----------
mustEl("loginBtn")?.addEventListener("click", () => { setAuthError(""); openAuthModal("login"); });
mustEl("accountBtn")?.addEventListener("click", () => { setAuthError(""); openAuthModal("login"); });
mustEl("authCloseBtn")?.addEventListener("click", closeAuthModal);
mustEl("loginBackdrop")?.addEventListener("click", closeAuthModal);

mustEl("authSwitchBtn")?.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  setAuthError("");
  syncAuthUI();
});

mustEl("logoutBtn")?.addEventListener("click", () => signOut(auth));

// ---------- MAIN AUTH ACTION ----------
async function doAuthPrimary() {
  const email = mustEl("authEmail").value.trim();
  const pass = mustEl("authPass").value;
  setAuthError("");

  if (!email || !pass) {
    setAuthError("Enter email + password.");
    return;
  }

  try {
    if (authMode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await sendVerifyEmail(cred.user);
      await signOut(auth);

      closeAuthModal();
      authMode = "login";
      syncAuthUI();

      alert("✅ Account created! Verify your email first. After verifying, you can log in.");
      return;
    }

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const ok = await refreshVerified(cred.user);

    if (!ok) {
      await signOut(auth);
      openAuthModal("login");
      setAuthError("Please verify your email first. Check your inbox, click the link, then log in.");
      return;
    }

    closeAuthModal();
  } catch (err) {
    console.error(err);
    setAuthError(err?.message || "Auth failed");
  }
}

mustEl("authPrimaryBtn")?.addEventListener("click", doAuthPrimary);

// ---------- 🔒 ENFORCE VERIFIED EVEN AFTER REFRESH ----------
let enforcingKick = false;

// ✅ NEW: Firestore subscriptions
let unsubAllOrders = null;
let unsubMyOrders = null;

function stopOrderListeners() {
  try { unsubAllOrders?.(); } catch {}
  try { unsubMyOrders?.(); } catch {}
  unsubAllOrders = null;
  unsubMyOrders = null;
}

function startOrderListenersForUser(user) {
  stopOrderListeners();

  if (!user) return;

  // Customer: My Orders
  const myQ = query(
    collection(db, "orders"),
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  unsubMyOrders = onSnapshot(
    myQ,
    (snap) => {
      state.ordersMine = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderMyOrders();
    },
    (err) => {
      console.warn("MyOrders snapshot error:", err);
      state.ordersMine = [];
      renderMyOrders(true);
    }
  );

  // Admin: All Orders
  if (user.email === ADMIN_EMAIL) {
    const allQ = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    unsubAllOrders = onSnapshot(
      allQ,
      (snap) => {
        state.ordersAll = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderOrders();
      },
      (err) => {
        console.warn("Orders snapshot error:", err);
        state.ordersAll = [];
        renderOrders(true);
      }
    );
  }
}

onAuthStateChanged(auth, async (user) => {
  state.user = user || null;

  if (user && !user.emailVerified) {
    if (!enforcingKick) {
      enforcingKick = true;
      try { await signOut(auth); } catch {}
      openAuthModal("login");
      setAuthError("Please verify your email first. Check your inbox, click the link, then log in.");
      enforcingKick = false;
    }
    state.user = null;
    state.verified = false;
    stopOrderListeners();
  } else {
    state.verified = !!user?.emailVerified;
    startOrderListenersForUser(user || null);
  }

  mustEl("loginBtn")?.classList.toggle("hidden", !!state.user);
  mustEl("logoutBtn")?.classList.toggle("hidden", !state.user);
  mustEl("userEmail").textContent = state.user ? state.user.email : "Guest";
  mustEl("accountLabel").textContent = state.user ? state.user.email.split("@")[0] : "Guest";

  // ✅ Tabs visibility
  mustEl("navAdmin")?.classList.toggle("hidden", !isAdmin());
  mustEl("navOrders")?.classList.toggle("hidden", !isAdmin());
  mustEl("navMyOrders")?.classList.toggle("hidden", !state.user);

  const adminVisible = !mustEl("page-admin")?.classList.contains("hidden");
  const ordersVisible = !mustEl("page-orders")?.classList.contains("hidden");
  if ((adminVisible || ordersVisible) && !isAdmin()) showPage("home");

  const myVisible = !mustEl("page-myorders")?.classList.contains("hidden");
  if (myVisible && !state.user) showPage("home");

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
    openAuthModal("login");
    return;
  }

  const ok = await refreshVerified(state.user);
  state.verified = ok;
  if (!ok) {
    showVerifyBlocked("Checkout");
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

// ✅ NEW: snapshot items
function buildOrderItemsSnapshot() {
  const items = [];
  for (const c of state.cart) {
    const p = state.products.find(x => x.id === c.id);
    if (!p) continue;
    items.push({
      productId: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      qty: Number(c.qty) || 1
    });
  }
  return items;
}

mustEl("placeOrderBtn")?.addEventListener("click", async () => {
  if (!state.user) {
    openAuthModal("login");
    return;
  }

  const ok = await refreshVerified(state.user);
  state.verified = ok;
  if (!ok) {
    showVerifyBlocked("placing orders");
    return;
  }

  const phone = mustEl("cPhone").value.trim();
  const addr = mustEl("cAddress").value.trim();

  if (!phone || !addr) {
    alert("Please enter phone number and address.");
    return;
  }

  const itemsSnapshot = buildOrderItemsSnapshot();
  if (itemsSnapshot.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const total = itemsSnapshot.reduce((sum, it) => sum + (it.price * it.qty), 0);

  // ✅ NEW: Save order to Firestore (cloud)
  try {
    await addDoc(collection(db, "orders"), {
      uid: state.user.uid,
      email: state.user.email,
      phone,
      address: addr,
      items: itemsSnapshot,
      total,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Firestore add order failed:", e);
    alert("⚠️ Could not place order. Firestore not set up or blocked by rules.");
    return;
  }

  alert(
    `Order placed!\n\nEmail: ${state.user.email}\nPhone: ${phone}\nAddress: ${addr}\nTotal: ${money(total)}`
  );

  state.cart = [];
  save();
  renderAll();
  closeCheckout();
  closeCart();
});

// ---------- ADMIN PRODUCTS ----------
mustEl("addItemBtn")?.addEventListener("click", async () => {
  if (!isAdmin()) {
    alert("Admin only.");
    return;
  }

  const ok = await refreshVerified(state.user);
  state.verified = ok;
  if (!ok) {
    showVerifyBlocked("Admin");
    return;
  }

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

// ---------- ORDERS RENDER ----------
function renderOrderListInto(containerId, list, isAdminView, hadError = false) {
  const wrap = mustEl(containerId);
  if (!wrap) return;

  if (hadError) {
    wrap.innerHTML = `<div class="muted">⚠️ Could not load orders (Firestore/rules not set up).</div>`;
    return;
  }

  if (!state.user) {
    wrap.innerHTML = `<div class="muted">Log in to view orders.</div>`;
    return;
  }

  if (isAdminView && !isAdmin()) {
    wrap.innerHTML = `<div class="muted">Admin only.</div>`;
    return;
  }

  if (!Array.isArray(list) || list.length === 0) {
    wrap.innerHTML = `<div class="muted">No orders yet.</div>`;
    return;
  }

  wrap.innerHTML = "";

  for (const o of list) {
    const card = document.createElement("div");
    card.className = "orderCard";

    const itemsHtml = (o.items || []).map(it => {
      const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 1);
      return `
        <div class="orderItemRow">
          <div>
            <div style="font-weight:800;">${escapeHtml(it.name)}</div>
            <div class="tiny muted">${money(it.price)} • Qty: ${escapeHtml(it.qty)}</div>
          </div>
          <div style="font-weight:900;">${money(lineTotal)}</div>
        </div>
      `;
    }).join("");

    card.innerHTML = `
      <div class="orderTop">
        <div class="orderId">Order: ${escapeHtml(o.id || "")}</div>
        <div class="orderMeta">${escapeHtml(formatDateAny(o.createdAt))}</div>
      </div>

      ${isAdminView ? `
        <div class="tiny muted">
          <div><b>Customer:</b> ${escapeHtml(o.email || "")}</div>
          <div><b>Phone:</b> ${escapeHtml(o.phone || "")}</div>
          <div><b>Address:</b> ${escapeHtml(o.address || "")}</div>
        </div>
      ` : `
        <div class="tiny muted">
          <div><b>Status:</b> Received</div>
        </div>
      `}

      <div class="orderItems">${itemsHtml}</div>

      <div class="orderTotalRow">
        <div>Total</div>
        <div>${money(o.total || 0)}</div>
      </div>
    `;

    wrap.appendChild(card);
  }
}

function renderOrders(hadError = false) {
  renderOrderListInto("ordersList", state.ordersAll, true, hadError);
}

function renderMyOrders(hadError = false) {
  renderOrderListInto("myOrdersList", state.ordersMine, false, hadError);
}

// ---------- RENDER ----------
function renderAll() {
  renderFeatured();
  renderShop();
  renderCartBadge();
  renderCart();
  renderAdmin();
  renderOrders();
  renderMyOrders();
}

renderAll();
showPage("home");
