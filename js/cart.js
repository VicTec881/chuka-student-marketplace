// Chuka Student Marketplace - Cart Manager

const Cart = {
  items: [],

  init() {
    const saved = localStorage.getItem("chuka_marketplace_cart");
    if (saved) {
      try {
        this.items = JSON.parse(saved);
      } catch (e) {
        this.items = [];
      }
    }
    this.updateUI();
  },

  save() {
    localStorage.setItem("chuka_marketplace_cart", JSON.stringify(this.items));
    this.updateUI();
  },

  addItem(product, qty = 1) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.items.push({
        id: product.id,
        title: product.title,
        price: product.price,
        formattedPrice: product.formattedPrice,
        image: product.image,
        seller: product.seller.name,
        location: product.seller.location,
        quantity: qty
      });
    }
    this.save();
    showToast(`Added "${product.title}" to your cart!`, "success");
  },

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.save();
  },

  updateQuantity(productId, delta) {
    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeItem(productId);
        return;
      }
      this.save();
    }
  },

  clear() {
    this.items = [];
    this.save();
  },

  getTotalCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getTotalPrice() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  updateUI() {
    const badges = document.querySelectorAll(".cart-count-badge");
    const count = this.getTotalCount();
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    });

    const cartDrawerList = document.getElementById("cartDrawerItems");
    const cartDrawerTotal = document.getElementById("cartDrawerTotal");
    const cartCheckoutBtn = document.getElementById("cartCheckoutBtn");
    const cartEmptyState = document.getElementById("cartEmptyState");

    if (!cartDrawerList) return;

    if (this.items.length === 0) {
      cartDrawerList.innerHTML = "";
      if (cartEmptyState) cartEmptyState.style.display = "flex";
      if (cartCheckoutBtn) cartCheckoutBtn.disabled = true;
      if (cartDrawerTotal) cartDrawerTotal.textContent = "KSh 0";
      return;
    }

    if (cartEmptyState) cartEmptyState.style.display = "none";
    if (cartCheckoutBtn) cartCheckoutBtn.disabled = false;

    cartDrawerList.innerHTML = this.items.map(item => `
      <div class="cart-item-row" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.title}</h4>
          <span class="cart-item-seller">Seller: ${item.seller}</span>
          <div class="cart-item-price">KSh ${(item.price * item.quantity).toLocaleString()}</div>
          <div class="cart-qty-controls">
            <button class="cart-qty-btn minus-btn" onclick="Cart.updateQuantity('${item.id}', -1)" aria-label="Decrease quantity">−</button>
            <span class="cart-qty-number">${item.quantity}</span>
            <button class="cart-qty-btn plus-btn" onclick="Cart.updateQuantity('${item.id}', 1)" aria-label="Increase quantity">+</button>
            <button class="cart-remove-btn" onclick="Cart.removeItem('${item.id}')" title="Remove item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");

    if (cartDrawerTotal) {
      cartDrawerTotal.textContent = `KSh ${this.getTotalPrice().toLocaleString()}`;
    }
  }
};
