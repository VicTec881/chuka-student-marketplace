// Chuka Student Marketplace - Cart Manager

const CART_KEY = "chuka_marketplace_cart";
const MAX_ITEM_QUANTITY = 99;

// Repair/validate an item loaded from storage. Returns null if it is unusable.
function normalizeCartItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const price = Number(raw.price);
  const quantity = Math.floor(Number(raw.quantity));
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.title !== "string" || !raw.title) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  if (!Number.isFinite(quantity) || quantity < 1) return null;

  return {
    id: raw.id,
    title: raw.title,
    price,
    formattedPrice: `KSh ${price.toLocaleString()}`,
    image: safeImagePath(raw.image),
    seller: typeof raw.seller === "string" ? raw.seller : "Student",
    location: typeof raw.location === "string" ? raw.location : "",
    quantity: Math.min(quantity, MAX_ITEM_QUANTITY)
  };
}

const Cart = {
  items: [],

  init() {
    const saved = storageGetJSON(CART_KEY);
    this.items = Array.isArray(saved) ? saved.map(normalizeCartItem).filter(Boolean) : [];

    // One delegated listener instead of inline onclick handlers.
    const list = document.getElementById("cartDrawerItems");
    if (list) {
      list.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cart-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.cartAction;
        if (action === "increase") this.updateQuantity(id, 1);
        else if (action === "decrease") this.updateQuantity(id, -1);
        else if (action === "remove") this.removeItem(id);
      });
    }

    this.updateUI();
  },

  /**
   * Sync cart items with the current catalogue: refresh price/title/image and drop
   * items whose listing no longer exists. Returns how many items were removed.
   */
  reconcile(products) {
    const byId = new Map(products.map(p => [p.id, p]));
    const before = this.items.length;
    this.items = this.items
      .filter(item => byId.has(item.id))
      .map(item => {
        const p = byId.get(item.id);
        return {
          ...item,
          title: p.title,
          price: p.price,
          formattedPrice: p.formattedPrice,
          image: p.image,
          seller: p.seller.name,
          location: p.seller.location
        };
      });
    const removed = before - this.items.length;
    this.save();
    return removed;
  },

  save() {
    storageSet(CART_KEY, JSON.stringify(this.items));
    this.updateUI();
  },

  addItem(product, qty = 1) {
    if (!product) return;
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, MAX_ITEM_QUANTITY);
    } else {
      this.items.push({
        id: product.id,
        title: product.title,
        price: product.price,
        formattedPrice: product.formattedPrice,
        image: product.image,
        seller: product.seller.name,
        location: product.seller.location,
        quantity: Math.min(qty, MAX_ITEM_QUANTITY)
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
      item.quantity = Math.min(item.quantity, MAX_ITEM_QUANTITY);
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

    cartDrawerList.innerHTML = this.items.map(item => {
      const id = escapeHtml(item.id);
      const title = escapeHtml(item.title);
      return `
      <div class="cart-item-row" data-id="${id}">
        <img src="${escapeHtml(safeImagePath(item.image))}" alt="${title}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${title}</h4>
          <span class="cart-item-seller">Seller: ${escapeHtml(item.seller)}</span>
          <div class="cart-item-price">KSh ${(item.price * item.quantity).toLocaleString()}</div>
          <div class="cart-qty-controls">
            <button type="button" class="cart-qty-btn minus-btn" data-cart-action="decrease" data-id="${id}" aria-label="Decrease quantity of ${title}">−</button>
            <span class="cart-qty-number">${item.quantity}</span>
            <button type="button" class="cart-qty-btn plus-btn" data-cart-action="increase" data-id="${id}" aria-label="Increase quantity of ${title}">+</button>
            <button type="button" class="cart-remove-btn" data-cart-action="remove" data-id="${id}" title="Remove item" aria-label="Remove ${title} from cart">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      </div>`;
    }).join("");

    if (cartDrawerTotal) {
      cartDrawerTotal.textContent = `KSh ${this.getTotalPrice().toLocaleString()}`;
    }
  }
};
