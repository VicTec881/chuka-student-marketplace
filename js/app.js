// Chuka University Student Marketplace - Main Application Logic
// Depends on: utils.js (escapeHtml, phone helpers), data.js (storage + catalogue), cart.js (Cart)

let products = [];
let activeCategory = "all";
// "all" | "popular" | "best-deal" | "under1000" | <category id> | "saved" | "mine"
let activeFilter = "all";
let currentSearchTerm = "";
let wishlist = new Set();
let lastFocusedElement = null;

const ALLOWED_BADGES = {
  "Popular": "popular",
  "New": "new",
  "Best Deal": "best-deal",
  "Fresh": "fresh"
};

const CATEGORY_DEFAULT_IMAGES = {
  electronics: "assets/images/dell_laptop.jpg",
  fashion: "assets/images/handbag.jpg",
  phones: "assets/images/samsung_phone.jpg",
  food: "assets/images/cooked_meal.jpg",
  home: "assets/images/kettle.jpg",
  sports: "assets/images/basketball.jpg"
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// true while we wait for the shared backend; false once listings are shown
let listingsLoading = true;
// true when listings come from (and are posted to) the shared backend
let sharedMode = false;

document.addEventListener("DOMContentLoaded", () => {
  wishlist = getStoredWishlist();
  Cart.init();

  renderCategories();
  renderProducts(); // shows the loading message until listings arrive
  updateWishlistDot();
  initEventListeners();
  initPhotoUpload();
  initAccountUI();

  const year = document.getElementById("footerYear");
  if (year) year.textContent = new Date().getFullYear();

  loadListings();
});

/**
 * Load listings from the shared backend; if it is not available (local preview, database not
 * configured, offline) fall back to the browser-only catalogue so the site always works.
 */
async function loadListings() {
  try {
    const { listings, user } = await fetchListings();
    const myIds = getMyListingIds(); // listings posted from this browser while signed out
    products = listings
      .map(sanitizeProduct)
      .filter(Boolean)
      .map(p => ({ ...p, mine: p.mine === true || myIds.has(p.id) }));
    sharedMode = true;
    currentUser = user;
  } catch (e) {
    products = getStoredProducts();
    sharedMode = false;
    currentUser = null;
  }
  renderAccountUI();

  listingsLoading = false;

  // Photos are stored on the shared backend, so the photo field only appears when it is connected.
  const photoGroup = document.getElementById("photoGroup");
  if (photoGroup) photoGroup.hidden = !sharedMode;

  const removed = Cart.reconcile(products);
  if (removed > 0) {
    showToast(`${removed} item${removed === 1 ? " is" : "s are"} no longer available and ${removed === 1 ? "was" : "were"} removed from your cart.`, "info");
  }

  renderProducts();
}

// ================= FOCUS HELPERS =================
function rememberFocus(trigger) {
  lastFocusedElement = trigger || document.activeElement;
}

function restoreFocus() {
  const el = lastFocusedElement;
  lastFocusedElement = null;
  if (el && document.contains(el) && typeof el.focus === "function") el.focus();
}

function focusFirstIn(container) {
  if (!container) return;
  const first = container.querySelector(FOCUSABLE_SELECTOR);
  if (first) first.focus();
}

// ================= RENDER CATEGORIES =================
function renderCategories() {
  const container = document.getElementById("categoryGridContainer");
  if (!container) return;

  // Re-rendering replaces the focused card; remember it so keyboard users keep their place.
  const focusedCard = document.activeElement && container.contains(document.activeElement)
    ? document.activeElement.closest("[data-category]")
    : null;
  const focusedId = focusedCard ? focusedCard.dataset.category : null;

  container.innerHTML = INITIAL_CATEGORIES.map(cat => `
    <div
      class="category-card ${activeCategory === cat.id ? 'active' : ''}"
      data-category="${escapeHtml(cat.id)}"
      style="background-color: ${cat.bgColor}; border-color: ${cat.borderColor};"
      role="button"
      tabindex="0"
      aria-pressed="${activeCategory === cat.id}"
    >
      <div class="category-icon-box" style="color: ${cat.textColor};" aria-hidden="true">
        ${cat.icon}
      </div>
      <span class="category-name" style="color: ${cat.textColor};">${escapeHtml(cat.name)}</span>
    </div>
  `).join("");

  if (focusedId) {
    const next = Array.from(container.querySelectorAll("[data-category]"))
      .find(el => el.dataset.category === focusedId);
    if (next) next.focus({ preventScroll: true });
  }
}

// ================= PRODUCT CARD (single template) =================
const HEART_PATH = "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";

function productCardHTML(product) {
  const id = escapeHtml(product.id);
  const title = escapeHtml(product.title);
  const isWishlisted = wishlist.has(product.id);
  const badgeClass = `badge-${escapeHtml(product.badgeType || "popular")}`;
  const sellerName = escapeHtml(product.seller.name);

  return `
    <article class="product-card" data-id="${id}">
      <div class="product-img-box">
        <span class="product-badge ${badgeClass}">${escapeHtml(product.badge)}</span>
        <button
          type="button"
          class="wishlist-btn ${isWishlisted ? 'active' : ''}"
          data-action="wishlist"
          data-id="${id}"
          aria-pressed="${isWishlisted}"
          aria-label="${isWishlisted ? 'Remove' : 'Save'} ${title} ${isWishlisted ? 'from' : 'to'} wishlist"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="${HEART_PATH}"/>
          </svg>
        </button>
        <img src="${escapeHtml(safeImagePath(product.image))}" alt="${title}" class="product-img" loading="lazy">
      </div>

      <div class="product-body">
        <h3 class="product-title" title="${title}">${title}</h3>
        <div class="product-price">${escapeHtml(product.formattedPrice || `KSh ${product.price.toLocaleString()}`)}</div>
        <p class="product-desc">${escapeHtml(product.description)}</p>

        <div class="seller-row">
          <img src="${escapeHtml(safeImagePath(product.seller.avatar, DEFAULT_AVATAR))}" alt="" class="seller-avatar">
          <div class="seller-details">
            <span class="seller-name">${sellerName}</span>
            <span class="seller-dept">${escapeHtml(product.seller.department)}</span>
          </div>
        </div>

        <div class="location-row">
          <svg class="location-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>Chuka University</span>
        </div>

        <button type="button" class="btn-view-details" data-action="details" data-id="${id}">
          <span>View Details</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <button type="button" class="quick-add-btn" data-action="quick-add" data-id="${id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Quick Add</span>
        </button>
      </div>
    </article>
  `;
}

// ================= FILTERING =================
function getVisibleProducts() {
  let filtered = [...products];

  // Search filter
  if (currentSearchTerm.trim() !== "") {
    const q = currentSearchTerm.trim().toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.seller.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // Category cards
  if (activeCategory !== "all") {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  // Chips / special views
  if (activeFilter === "popular") {
    filtered = filtered.filter(p => p.badgeType === "popular");
  } else if (activeFilter === "best-deal") {
    filtered = filtered.filter(p => p.badgeType === "best-deal");
  } else if (activeFilter === "under1000") {
    filtered = filtered.filter(p => p.price < 1000);
  } else if (activeFilter === "saved") {
    filtered = filtered.filter(p => wishlist.has(p.id));
  } else if (activeFilter === "mine") {
    filtered = filtered.filter(p => p.mine === true);
  } else if (INITIAL_CATEGORIES.some(c => c.id === activeFilter)) {
    filtered = filtered.filter(p => p.category === activeFilter);
  }

  return filtered;
}

function updateHeadings(count) {
  const heading = document.getElementById("productsHeading");
  const subheading = document.getElementById("productsSubheading");
  if (!heading || !subheading) return;

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  if (activeFilter === "saved") {
    heading.textContent = "Saved Items";
    subheading.textContent = `Showing ${plural(count, "saved item")}.`;
  } else if (activeFilter === "mine") {
    heading.textContent = "My Listings";
    subheading.textContent = `Showing ${plural(count, "listing")} posted from this browser.`;
  } else if (activeCategory !== "all") {
    const catObj = INITIAL_CATEGORIES.find(c => c.id === activeCategory);
    heading.textContent = catObj ? catObj.name : "Products";
    subheading.textContent = `Showing all listings in ${catObj ? catObj.name : "this category"}.`;
  } else if (currentSearchTerm.trim()) {
    heading.textContent = `Search Results for "${currentSearchTerm.trim()}"`;
    subheading.textContent = `Found ${plural(count, "matching product")}.`;
  } else {
    heading.textContent = "Featured Products";
    subheading.textContent = "Showing all listings from fellow students on campus.";
  }
}

function emptyStateHTML() {
  let message = "Try adjusting your search terms or browse all student categories.";
  if (activeFilter === "saved") {
    message = "You haven't saved any items yet. Tap the heart on any product to save it.";
  } else if (activeFilter === "mine") {
    message = "You haven't posted any listings from this browser yet.";
  }
  return `
    <div class="empty-products">
      <div class="empty-icon" aria-hidden="true">🔍</div>
      <h3 class="empty-title">No products found</h3>
      <p style="color: #64748b; margin-bottom: 16px;">${message}</p>
      <button type="button" class="btn-primary" data-action="reset-filters">Reset All Filters</button>
    </div>
  `;
}

// ================= RENDER PRODUCTS =================
function renderProducts() {
  const container = document.getElementById("productsGridContainer");
  if (!container) return;

  container.setAttribute("aria-busy", listingsLoading ? "true" : "false");
  if (listingsLoading) {
    container.innerHTML = `
      <div class="empty-products" role="status">
        <div class="empty-icon" aria-hidden="true">⏳</div>
        <h3 class="empty-title">Loading listings…</h3>
      </div>
    `;
    return;
  }

  const filtered = getVisibleProducts();
  updateHeadings(filtered.length);

  container.innerHTML = filtered.length === 0
    ? emptyStateHTML()
    : filtered.map(productCardHTML).join("");
}

function setActiveChip(filter) {
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.filter === filter);
  });
}

function setMobileBarActive(id) {
  document.querySelectorAll(".mobile-bar-btn").forEach(btn => {
    btn.classList.toggle("active", btn.id === id);
  });
}

function scrollToProducts() {
  const section = document.getElementById("featuredSection");
  if (section) section.scrollIntoView({ behavior: scrollBehavior() });
}

// ================= FILTER HANDLERS =================
function filterByCategory(categoryId) {
  activeCategory = activeCategory === categoryId ? "all" : categoryId;
  renderCategories();
  renderProducts();
  scrollToProducts();
}

function resetAllFilters() {
  activeCategory = "all";
  activeFilter = "all";
  currentSearchTerm = "";
  const searchInput = document.getElementById("globalSearchInput");
  if (searchInput) searchInput.value = "";
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.style.display = "none";

  setActiveChip("all");
  renderCategories();
  renderProducts();
}

// Switch to a special view ("saved" / "mine") that has no chip of its own.
function showFilterView(filter) {
  activeFilter = filter;
  activeCategory = "all";
  currentSearchTerm = "";
  const searchInput = document.getElementById("globalSearchInput");
  if (searchInput) searchInput.value = "";
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.style.display = "none";

  setActiveChip(filter); // no chip matches, so "All Items" is deselected
  renderCategories();
  renderProducts();
  scrollToProducts();
}

// ================= QUICK ADD & WISHLIST =================
function quickAddToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (prod) Cart.addItem(prod, 1);
}

function updateWishlistDot() {
  const dot = document.getElementById("wishlistDot");
  if (dot) dot.classList.toggle("active", wishlist.size > 0);
}

function toggleWishlist(productId) {
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
    showToast("Removed from saved items", "info");
  } else {
    wishlist.add(productId);
    showToast("Saved to your wishlist!", "success");
  }
  saveWishlist(wishlist);
  updateWishlistDot();
  renderProducts();
}

function filterWishlistItems() {
  if (wishlist.size === 0) {
    showToast("You haven't saved any items yet! Tap the heart icon on any product.", "info");
    return;
  }
  showFilterView("saved");
  setMobileBarActive("barSavedBtn");
}

function filterMyListings() {
  if (!products.some(p => p.mine === true)) {
    showToast(currentUser ? "You haven't posted any listings yet." : "You haven't posted any listings from this browser yet. Sign in to see the ones you posted while signed in.", "info");
    return;
  }
  showFilterView("mine");
}

// ================= PRODUCT DETAILS MODAL =================
function openProductModal(productId, trigger) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modalBody = document.getElementById("productModalBody");
  const modalOverlay = document.getElementById("productModalOverlay");
  if (!modalBody || !modalOverlay) return;

  rememberFocus(trigger);

  const id = escapeHtml(product.id);
  const title = escapeHtml(product.title);
  const price = product.formattedPrice || `KSh ${product.price.toLocaleString()}`;

  // Always derive the wa.me number from the stored phone, so it has the 254 country code.
  const waNumber = normalizeKenyanPhone(product.seller.whatsapp || product.seller.phone);
  const whatsappMessage = encodeURIComponent(
    `Hello ${product.seller.name}, I am a student at Chuka University interested in your "${product.title}" listed for ${price} on the Chuka Student Marketplace. Is it still available for campus meetup?`
  );
  const phoneLabel = waNumber ? formatKenyanPhone(waNumber) : "";

  // Visitors who are not signed in never receive the number (the server withholds it).
  const contactLocked = product.contactLocked === true;

  const whatsappButton = contactLocked
    ? `<button type="button" class="btn-signin-contact" data-action="modal-sign-in" data-id="${id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Sign in to see seller contact</span>
        </button>
        <div class="contact-locked-note">Free, with your @chuka.ac.ke email. This keeps contacts for students only.</div>`
    : waNumber
    ? `<a
          href="https://wa.me/${waNumber}?text=${whatsappMessage}"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-whatsapp"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
          <span>Chat on WhatsApp (${escapeHtml(phoneLabel)})</span>
        </a>`
    : `<span class="btn-whatsapp" aria-disabled="true" style="opacity: 0.55; pointer-events: none; cursor: not-allowed;">
          <span>No valid WhatsApp number on this listing</span>
        </span>`;

  modalBody.innerHTML = `
    <div class="product-modal-gallery">
      <img src="${escapeHtml(safeImagePath(product.image))}" alt="${title}" class="product-modal-main-img">
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        ${product.verified
          ? `<span class="badge-verified">✓ Verified Chuka student</span>`
          : `<span style="font-size: 11.5px; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 9999px; font-weight: 600;">
          Seller not yet verified
        </span>`}
        <span style="font-size: 11.5px; color: #0284c7; background: #e0f2fe; padding: 4px 10px; border-radius: 9999px; font-weight: 600;">
          Condition: ${escapeHtml(product.condition || "Good")}
        </span>
      </div>
    </div>

    <div>
      <div class="modal-badge-row">
        <span class="product-badge badge-${escapeHtml(product.badgeType || "popular")}" style="position: static;">
          ${escapeHtml(product.badge)}
        </span>
        <span style="font-size: 12px; color: #64748b;">Posted by a fellow student</span>
      </div>

      <h2 class="modal-product-title" id="modalProductTitle">${title}</h2>
      <div class="modal-product-price">${escapeHtml(price)}</div>

      <p class="modal-product-desc">
        ${escapeHtml(product.longDescription || product.description)}
      </p>

      <!-- Seller Profile Card -->
      <div class="modal-seller-card">
        <div class="modal-seller-header">
          <img src="${escapeHtml(safeImagePath(product.seller.avatar, DEFAULT_AVATAR))}" alt="" class="modal-seller-avatar">
          <div style="flex: 1;">
            <div class="modal-seller-name">${escapeHtml(product.seller.name)}</div>
            <div class="modal-seller-meta">${escapeHtml(product.seller.department)} • ${escapeHtml(product.seller.year || "Student")}</div>
            <div style="font-size: 12px; color: #0f172a; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Meetup: ${escapeHtml(product.seller.location)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-actions-row">
        ${whatsappButton}

        <button type="button" class="btn-add-cart-large" data-action="modal-add-cart" data-id="${id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <span>Add to Campus Cart</span>
        </button>
      </div>

      ${product.mine && currentUser ? `
      <div class="owner-actions">
        <button type="button" data-action="mark-sold" data-id="${id}">Mark as sold</button>
        <button type="button" class="owner-delete" data-action="delete-listing" data-id="${id}">Delete listing</button>
      </div>` : ""}

      <!-- Campus Safety Advisory -->
      <div style="margin-top: 18px; padding: 12px; background: #eff6ff; border-radius: 8px; font-size: 11.5px; color: #1e40af; line-height: 1.4;">
        🛡️ <strong>Safety Tips:</strong> Meet in public campus spots (e.g. Student Centre, Library, Pavilion). Always inspect item condition before making M-Pesa payment.
      </div>
    </div>
  `;

  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  focusFirstIn(modalOverlay);
}

function closeProductModal() {
  const modalOverlay = document.getElementById("productModalOverlay");
  if (modalOverlay) modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  restoreFocus();
}

// ================= POST AN ITEM MODAL =================
// ---------- Product photo (Sell form) ----------
// The chosen photo is resized in the browser (max 1000px, JPEG) so uploads stay small and fast
// on mobile data; the server checks it again before storing it.
let selectedPhoto = null; // data URL of the resized photo, or null

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}

async function resizePhoto(file, maxSide = 1000, quality = 0.82) {
  const img = await readFileAsImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // PNGs with transparency become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function setPhotoHelp(message, isError) {
  const help = document.getElementById("photoHelp");
  if (!help) return;
  help.textContent = message;
  help.classList.toggle("error", !!isError);
}

function clearPhoto() {
  selectedPhoto = null;
  const input = document.getElementById("postPhoto");
  if (input) input.value = "";
  const preview = document.getElementById("photoPreview");
  const drop = document.getElementById("photoDrop");
  if (preview) preview.hidden = true;
  if (drop) drop.hidden = false;
  setPhotoHelp("Show the actual item. Listings with a clear photo get more messages.", false);
}

function initPhotoUpload() {
  const input = document.getElementById("postPhoto");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      clearPhoto();
      setPhotoHelp("Please choose a JPG, PNG or WebP photo.", true);
      return;
    }
    setPhotoHelp("Preparing your photo…", false);
    try {
      selectedPhoto = await resizePhoto(file);
    } catch (e) {
      clearPhoto();
      setPhotoHelp("We could not read that photo. Please try another one.", true);
      return;
    }
    document.getElementById("photoPreviewImg").src = selectedPhoto;
    document.getElementById("photoPreview").hidden = false;
    document.getElementById("photoDrop").hidden = true;
    setPhotoHelp("Looks good! Tap Remove photo to choose a different one.", false);
  });
  const removeBtn = document.getElementById("photoRemoveBtn");
  if (removeBtn) removeBtn.addEventListener("click", () => {
    clearPhoto();
    input.focus();
  });
}

function openPostModal(trigger) {
  const modal = document.getElementById("postModalOverlay");
  if (modal) {
    rememberFocus(trigger instanceof Element ? trigger : null);
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    const first = document.getElementById("postTitle");
    if (first) first.focus();
  }
}

function closePostModal() {
  const modal = document.getElementById("postModalOverlay");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    restoreFocus();
  }
}

// ================= CHECKOUT (RESERVATION) MODAL =================
function openCheckoutModal() {
  const modal = document.getElementById("checkoutModalOverlay");
  if (!modal) return;
  rememberFocus();
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  const first = document.getElementById("buyerName");
  if (first) first.focus();
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModalOverlay");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
  restoreFocus();
}

// ================= CART DRAWER TOGGLE =================
function openCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    rememberFocus();
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    Cart.updateUI();
    const closeBtn = document.getElementById("closeCartBtn");
    if (closeBtn) closeBtn.focus();
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    restoreFocus();
  }
}

// ================= ACCOUNT DROPDOWN =================
function setAccountMenuOpen(open) {
  const menu = document.getElementById("accountDropdown");
  const btn = document.getElementById("accountMenuBtn");
  if (menu) menu.classList.toggle("show", open);
  if (btn) btn.setAttribute("aria-expanded", String(open));
}

function toggleAccountMenu() {
  const menu = document.getElementById("accountDropdown");
  setAccountMenuOpen(!(menu && menu.classList.contains("show")));
}

function closeAccountMenu() {
  setAccountMenuOpen(false);
}

// ================= MOBILE DRAWER =================
function openMobileDrawer() {
  const drawer = document.getElementById("mobileDrawer");
  const overlay = document.getElementById("mobileDrawerOverlay");
  if (drawer && overlay) {
    rememberFocus();
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    const closeBtn = document.getElementById("closeMobileDrawerBtn");
    if (closeBtn) closeBtn.focus();
  }
}

function closeMobileDrawer() {
  const drawer = document.getElementById("mobileDrawer");
  const overlay = document.getElementById("mobileDrawerOverlay");
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    restoreFocus();
  }
}

// ================= TOAST NOTIFICATION =================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const text = document.createElement("span");
  text.textContent = message; // textContent: never interpret user-provided text as HTML
  toast.appendChild(text);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ================= ESCAPE KEY + FOCUS TRAP =================
// Top-most first. Each entry: how to tell it is open, how to close it, which element holds the focusable controls.
function getOpenOverlays() {
  const isOpen = (id) => {
    const el = document.getElementById(id);
    return el && el.classList.contains("open") ? el : null;
  };
  return [
    { el: isOpen("signInModalOverlay"), close: closeSignInModal },
    { el: isOpen("checkoutModalOverlay"), close: closeCheckoutModal },
    { el: isOpen("postModalOverlay"), close: closePostModal },
    { el: isOpen("productModalOverlay"), close: closeProductModal },
    { el: isOpen("cartDrawer"), close: closeCartDrawer },
    { el: isOpen("mobileDrawer"), close: closeMobileDrawer }
  ].filter(entry => entry.el);
}

function handleGlobalKeydown(e) {
  if (e.key === "Escape") {
    const open = getOpenOverlays();
    if (open.length > 0) {
      e.preventDefault();
      open[0].close();
      return;
    }
    const menu = document.getElementById("accountDropdown");
    if (menu && menu.classList.contains("show")) {
      closeAccountMenu();
      const btn = document.getElementById("accountMenuBtn");
      if (btn) btn.focus();
    }
    return;
  }

  if (e.key === "Tab") {
    const open = getOpenOverlays();
    if (open.length === 0) return;
    const container = open[0].el;
    const focusables = [...container.querySelectorAll(FOCUSABLE_SELECTOR)];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ================= FORM HELPERS =================
function clearValidityOnInput(input) {
  if (input) input.addEventListener("input", () => input.setCustomValidity(""));
}

function failField(input, message) {
  input.setCustomValidity(message);
  input.reportValidity();
}

// ================= EVENT LISTENERS =================
function initEventListeners() {
  // Global search input
  const searchInput = document.getElementById("globalSearchInput");
  const clearBtn = document.getElementById("searchClearBtn");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchTerm = e.target.value;
      if (clearBtn) clearBtn.style.display = currentSearchTerm ? "block" : "none";
      renderProducts();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      currentSearchTerm = "";
      clearBtn.style.display = "none";
      renderProducts();
    });
  }

  // Quick filter chips
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter;
      setActiveChip(activeFilter);
      renderProducts();
    });
  });

  // Product grid: one delegated listener (no inline handlers, no ids interpolated into JS)
  const grid = document.getElementById("productsGridContainer");
  if (grid) {
    grid.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const id = el.dataset.id;
      switch (el.dataset.action) {
        case "wishlist": toggleWishlist(id); break;
        case "details": openProductModal(id, el); break;
        case "quick-add": quickAddToCart(id); break;
        case "reset-filters": resetAllFilters(); break;
      }
    });
  }

  // Category cards: click + keyboard (Enter / Space)
  const categoryGrid = document.getElementById("categoryGridContainer");
  if (categoryGrid) {
    categoryGrid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-category]");
      if (card) filterByCategory(card.dataset.category);
    });
    categoryGrid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest("[data-category]");
      if (!card) return;
      e.preventDefault();
      filterByCategory(card.dataset.category);
    });
  }

  // Product modal actions
  const modalBody = document.getElementById("productModalBody");
  if (modalBody) {
    modalBody.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const prod = products.find(p => p.id === btn.dataset.id);
      if (!prod) return;
      switch (btn.dataset.action) {
        case "modal-add-cart":
          Cart.addItem(prod, 1);
          closeProductModal();
          break;
        case "modal-sign-in": {
          const id = prod.id;
          closeProductModal();
          openSignInModal(null, () => openProductModal(id));
          break;
        }
        case "mark-sold":
        case "delete-listing": {
          const selling = btn.dataset.action === "mark-sold";
          if (!selling && !window.confirm(`Delete "${prod.title}"? This cannot be undone.`)) return;
          btn.disabled = true;
          const res = selling ? await markListingSold(prod.id) : await deleteListing(prod.id);
          if (!res.ok) {
            btn.disabled = false;
            showToast(res.status === 401 ? "Please sign in again." : (res.message || "Could not update the listing. Try again."), "info");
            return;
          }
          closeProductModal();
          await loadListings();
          showToast(selling ? "Marked as sold. It is no longer listed." : "Listing deleted.", "success");
          break;
        }
      }
    });
  }

  // Modal close buttons + click outside
  const closeProductBtn = document.getElementById("closeProductModalBtn");
  if (closeProductBtn) closeProductBtn.addEventListener("click", closeProductModal);

  const productOverlay = document.getElementById("productModalOverlay");
  if (productOverlay) {
    productOverlay.addEventListener("click", (e) => {
      if (e.target === productOverlay) closeProductModal();
    });
  }

  const closePostBtn = document.getElementById("closePostModalBtn");
  if (closePostBtn) closePostBtn.addEventListener("click", closePostModal);

  const postOverlay = document.getElementById("postModalOverlay");
  if (postOverlay) {
    postOverlay.addEventListener("click", (e) => {
      if (e.target === postOverlay) closePostModal();
    });
  }

  // Cart open / close
  const openCartBtn = document.getElementById("openCartBtn");
  if (openCartBtn) openCartBtn.addEventListener("click", openCartDrawer);

  const closeCartBtn = document.getElementById("closeCartBtn");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);

  const cartOverlay = document.getElementById("cartOverlay");
  if (cartOverlay) cartOverlay.addEventListener("click", closeCartDrawer);

  // Mobile Drawer Toggle
  const mobileToggleBtn = document.getElementById("mobileMenuToggleBtn");
  if (mobileToggleBtn) mobileToggleBtn.addEventListener("click", openMobileDrawer);

  const closeMobileBtn = document.getElementById("closeMobileDrawerBtn");
  if (closeMobileBtn) closeMobileBtn.addEventListener("click", closeMobileDrawer);

  const mobileOverlay = document.getElementById("mobileDrawerOverlay");
  if (mobileOverlay) mobileOverlay.addEventListener("click", closeMobileDrawer);

  // Mobile Bottom Bar active state sync
  const barHomeBtn = document.getElementById("barHomeBtn");
  if (barHomeBtn) {
    barHomeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setMobileBarActive("barHomeBtn");
      resetAllFilters();
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    });
  }

  const barCatBtn = document.getElementById("barCatBtn");
  if (barCatBtn) {
    barCatBtn.addEventListener("click", () => setMobileBarActive("barCatBtn"));
  }

  // Sell buttons
  const navSellBtn = document.getElementById("navSellBtn");
  if (navSellBtn) navSellBtn.addEventListener("click", (e) => openPostModal(e.currentTarget));

  const heroSellBtn = document.getElementById("heroSellBtn");
  if (heroSellBtn) heroSellBtn.addEventListener("click", (e) => openPostModal(e.currentTarget));

  // Account Menu Toggle
  const accountBtn = document.getElementById("accountMenuBtn");
  if (accountBtn) {
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAccountMenu();
    });
  }

  const accountListingsBtn = document.getElementById("accountListingsBtn");
  if (accountListingsBtn) {
    accountListingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAccountMenu();
      filterMyListings();
    });
  }

  const accountSavedBtn = document.getElementById("accountSavedBtn");
  if (accountSavedBtn) {
    accountSavedBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAccountMenu();
      filterWishlistItems();
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".account-dropdown-wrapper")) {
      closeAccountMenu();
    }
  });

  document.addEventListener("keydown", handleGlobalKeydown);

  // ---------- Post Item Form ----------
  const postForm = document.getElementById("postItemForm");
  if (postForm) {
    const priceInput = document.getElementById("postPrice");
    const phoneInput = document.getElementById("sellerPhone");
    clearValidityOnInput(priceInput);
    clearValidityOnInput(phoneInput);

    let posting = false;

    postForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (posting) return; // ignore double clicks while a request is in flight

      const title = document.getElementById("postTitle").value.trim();
      const categoryValue = document.getElementById("postCategory").value;
      const category = INITIAL_CATEGORIES.some(c => c.id === categoryValue) ? categoryValue : "other";
      const price = Number(priceInput.value);
      const condition = document.getElementById("postCondition").value;
      const badgeValue = document.getElementById("postBadge").value;
      const badge = Object.prototype.hasOwnProperty.call(ALLOWED_BADGES, badgeValue) ? badgeValue : "New";
      const description = document.getElementById("postDescription").value.trim();
      const sName = document.getElementById("sellerName").value.trim();
      const sDept = document.getElementById("sellerDept").value.trim();
      const sLocation = document.getElementById("sellerLocation").value.trim();

      if (!title || !description || !sName || !sDept || !sLocation) {
        showToast("Please fill in all the required fields.", "info");
        return;
      }

      if (!Number.isInteger(price) || price < 10 || price > 10000000) {
        failField(priceInput, "Enter a whole-number price between KSh 10 and KSh 10,000,000.");
        return;
      }

      const phone = normalizeKenyanPhone(phoneInput.value);
      if (!phone) {
        failField(phoneInput, "Enter a valid Kenyan mobile number, e.g. 0712 345 678 or +254 712 345 678.");
        return;
      }

      let newProduct = null;

      if (sharedMode && !selectedPhoto) {
        setPhotoHelp("Please add a photo of the item you are selling.", true);
        document.getElementById("postPhoto").focus();
        showToast("Please add a photo of your item.", "info");
        return;
      }

      if (sharedMode) {
        // ---- Shared backend: the server validates again and stores the listing for everyone ----
        const submitBtn = postForm.querySelector("button[type='submit']");
        posting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute("aria-busy", "true");
        }

        const result = await postListing({
          title,
          price,
          category,
          condition,
          badge,
          description,
          image: selectedPhoto,
          sellerName: sName,
          sellerDept: sDept,
          sellerPhone: phoneInput.value,
          sellerLocation: sLocation
        });

        posting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
        }

        if (!result.ok) {
          if (result.error === "validation") {
            const fieldInputs = { price: priceInput, sellerPhone: phoneInput };
            const [field, message] = Object.entries(result.fields)[0] || [];
            if (fieldInputs[field]) failField(fieldInputs[field], message);
            else showToast(message || "Please check the form and try again.", "info");
            if (message && field === "image") setPhotoHelp(message, true);
          } else if (result.error === "rate_limited") {
            showToast(result.message || "You've posted a lot recently. Please try again later.", "info");
          } else {
            showToast("Could not post your listing right now. Please check your connection and try again.", "info");
          }
          return; // keep the form filled in so nothing is lost
        }

        newProduct = { ...sanitizeProduct(result.listing), mine: true };
        if (!currentUser) rememberMyListingId(newProduct.id); // signed-out posts are tracked in this browser only
        products.unshift(newProduct);
      } else {
        // ---- Fallback: browser-only listing (backend not reachable) ----
        newProduct = sanitizeProduct({
          id: generateId("p"),
          title,
          price,
          category,
          badge,
          badgeType: ALLOWED_BADGES[badge],
          image: CATEGORY_DEFAULT_IMAGES[category] || DEFAULT_PRODUCT_IMAGE,
          description,
          longDescription: description,
          condition,
          seller: {
            name: sName,
            department: sDept,
            year: "",
            avatar: DEFAULT_AVATAR,
            phone: formatKenyanPhone(phone),
            whatsapp: phone, // always the full 254... number so wa.me links work
            location: `Chuka University (${sLocation})`
          },
          mine: true
        });

        products.unshift(newProduct);
        if (!saveProducts(products)) {
          showToast("Your listing is visible now, but this browser could not save it (storage full or blocked).", "info");
        }
      }

      postForm.reset();
      clearPhoto();
      closePostModal();
      resetAllFilters(); // make sure the new listing is not hidden by an active filter
      scrollToProducts();

      showToast(
        sharedMode
          ? `Listing "${newProduct.title}" is now live for all students!`
          : `Listing "${newProduct.title}" saved on this device only (the shared marketplace is not connected yet).`,
        "success"
      );
    });
  }

  // ---------- Cart Checkout Reservation ----------
  const cartCheckoutBtn = document.getElementById("cartCheckoutBtn");
  const closeCheckoutBtn = document.getElementById("closeCheckoutModalBtn");
  const checkoutOverlay = document.getElementById("checkoutModalOverlay");
  const checkoutForm = document.getElementById("checkoutReserveForm");

  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener("click", () => {
      closeCartDrawer();
      openCheckoutModal();
    });
  }

  if (closeCheckoutBtn) closeCheckoutBtn.addEventListener("click", closeCheckoutModal);

  if (checkoutOverlay) {
    checkoutOverlay.addEventListener("click", (e) => {
      if (e.target === checkoutOverlay) closeCheckoutModal();
    });
  }

  if (checkoutForm) {
    const buyerPhoneInput = document.getElementById("buyerPhone");
    clearValidityOnInput(buyerPhoneInput);

    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const buyerName = document.getElementById("buyerName").value.trim();
      const meetup = document.getElementById("meetupLocation").value;
      const buyerPhone = normalizeKenyanPhone(buyerPhoneInput.value);

      if (!buyerName) {
        showToast("Please enter your name.", "info");
        return;
      }
      if (!buyerPhone) {
        failField(buyerPhoneInput, "Enter a valid Kenyan mobile number, e.g. 0712 345 678.");
        return;
      }
      if (Cart.items.length === 0) {
        closeCheckoutModal();
        showToast("Your cart is empty.", "info");
        return;
      }

      const reservation = {
        id: generateId("r"),
        createdAt: new Date().toISOString(),
        buyer: { name: buyerName, phone: formatKenyanPhone(buyerPhone) },
        meetup,
        total: Cart.getTotalPrice(),
        items: Cart.items.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          seller: item.seller
        }))
      };
      saveReservation(reservation);

      closeCheckoutModal();
      checkoutForm.reset();
      Cart.clear();

      showToast(
        `Reservation saved for ${buyerName} (meetup: ${meetup}). Message each seller on WhatsApp to confirm.`,
        "success"
      );
    });
  }

  // View all links
  const viewAllBtn = document.getElementById("viewAllProductsBtn");
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetAllFilters();
    });
  }

  const viewAllCatBtn = document.getElementById("viewAllCategoriesBtn");
  if (viewAllCatBtn) {
    viewAllCatBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetAllFilters();
    });
  }
}

// Footer help links (shown as toasts until real pages exist)
function openFaqModal() {
  showToast("FAQs: This marketplace is for Chuka University students to buy and sell on campus.", "info");
}

function openContactModal() {
  showToast("Support Desk: Ndagani Student Centre, Chuka University. Email: support@chuka.ac.ke", "info");
}

function openTermsModal() {
  showToast("Terms: Direct student handover. Inspect items before any M-Pesa transfer.", "info");
}

function openPrivacyModal() {
  showToast("Privacy: the phone number on a listing is shown to buyers so they can reach you on WhatsApp.", "info");
}

// Quick search from Hero trending tag pills
function quickHeroSearch(term) {
  activeCategory = "all";
  activeFilter = "all";
  setActiveChip("all");
  renderCategories();

  const searchInput = document.getElementById("globalSearchInput");
  if (searchInput) searchInput.value = term;
  currentSearchTerm = term;
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.style.display = "block";
  renderProducts();
  scrollToProducts();
}
