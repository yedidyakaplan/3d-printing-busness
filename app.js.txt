let user = null;
let cart = [];

const products = [
  {name:"Flexi Dragon", price:12},
  {name:"Fidget Gear", price:6},
  {name:"Phone Stand", price:8}
];

function showPage(page){
  document.getElementById("home").classList.add("hidden");
  document.getElementById("shop").classList.add("hidden");
  document.getElementById(page).classList.remove("hidden");
}

function login(){
  const name = prompt("Enter your name:");
  if(name){
    user = name;
    document.getElementById("userName").innerText = name;
    document.getElementById("loginBtn").style.display="none";
  }
}

function renderProducts(){
  const search = document.getElementById("search").value.toLowerCase();
  const grid = document.getElementById("shopGrid");
  const featured = document.getElementById("featured");
  grid.innerHTML="";
  featured.innerHTML="";

  products.forEach(p=>{
    if(!p.name.toLowerCase().includes(search)) return;

    const card = document.createElement("div");
    card.className="card";
    card.innerHTML=`<h3>${p.name}</h3>
    <p>$${p.price}</p>
    <button onclick="addToCart('${p.name}',${p.price})">Add to Cart</button>`;

    grid.appendChild(card);
    featured.appendChild(card.cloneNode(true));
  });
}

function addToCart(name,price){
  cart.push({name,price});
  document.getElementById("cartCount").innerText=cart.length;
}

function openCart(){
  const div=document.getElementById("cart");
  const items=document.getElementById("cartItems");
  items.innerHTML="";
  let total=0;

  cart.forEach(i=>{
    items.innerHTML+=`<p>${i.name} - $${i.price}</p>`;
    total+=i.price;
  });

  document.getElementById("total").innerText="Total: $"+total;
  div.classList.remove("hidden");
}

function closeCart(){
  document.getElementById("cart").classList.add("hidden");
}

function checkout(){
  alert("Next step: connect Stripe payments!");
}

renderProducts();
