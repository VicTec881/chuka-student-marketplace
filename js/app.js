// Chuka University Student Marketplace - Main Application Logic

let products = [];
let activeCategory = "all";
let activeFilter = "all";
let currentSearchTerm = "";
let wishlist = new Set();

document.addEventListener("DOMContentLoaded", () => {
  // Load products
  products = getStoredProducts();

  // Initialize Cart
  Cart.init();

  // Render UI
  renderCategories();
  renderProducts();

  // Bind Events
  initEventListeners();
});

// ================= RENDER CATEGORIES =================
function renderCategories() {
  const container = document.getElementById("categoryGridContainer");
  if (!container) return;

  container.innerHTML = INITIAL_CATEGORIES.map(cat => `
    <div 
      class="category-card ${activeCategory === cat.id ? 'active' : ''}" 
      data-category="${cat.id}"
      style="background-color: ${cat.bgColor}; border-color: ${cat.borderColor};"
      onclick="filterByCategory('${cat.id}')"
      role="button"
      tabindex="0"
    >
      <div class="category-icon-box" style="color: ${cat.textColor};">
        ${cat.icon}
      </div>
      <span class="category-name" style="color: ${cat.textColor};">${cat.name}</span>
    </div>
  `).join("");
}

// ================= RENDER PRODUCTS =================
function renderProducts() {
  const container = document.getElementById("productsGridContainer");
  if (!container) return;

  // Filter products based on search, activeCategory, and filter chips
  let filtered = [...products];

  // Search filter
  if (currentSearchTerm.trim() !== "") {
    const q = currentSearchTerm.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.seller.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // Category filter
  if (activeCategory !== "all") {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  // Quick filter chips
  if (activeFilter === "popular") {
    filtered = filtered.filter(p => p.badgeType === "popular");
  } else if (activeFilter === "best-deal") {
    filtered = filtered.filter(p => p.badgeType === "best-deal");
  } else if (activeFilter === "under1000") {
    filtered = filtered.filter(p => p.price < 1000);
  } else if (["electronics", "books", "fashion", "phones", "food"].includes(activeFilter)) {
    filtered = filtered.filter(p => p.category === activeFilter);
  }

  // Update Section Heading
  const heading = document.getElementById("productsHeading");
  const subheading = document.getElementById("productsSubheading");
  if (heading && subheading) {
    if (activeCategory !== "all") {
      const catObj = INITIAL_CATEGORIES.find(c => c.id === activeCategory);
      heading.textContent = catObj ? `${catObj.name}` : "Products";
      subheading.textContent = `Showing all verified items in ${catObj ? catObj.name : "category"}.`;
    } else if (currentSearchTerm) {
      heading.textContent = `Search Results for "${currentSearchTerm}"`;
      subheading.textContent = `Found ${filtered.length} matching product${filtered.length === 1 ? '' : 's'}.`;
    } else {
      heading.textContent = "Featured Products";
      subheading.textContent = "Showing all verified listings from fellow students on campus.";
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-products">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">No products found</h3>
        <p style="color: #64748b; margin-bottom: 16px;">Try adjusting your search terms or browse all student categories.</p>
        <button class="btn-primary" onclick="resetAllFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => {
    const isWishlisted = wishlist.has(product.id);
    const badgeClass = `badge-${product.badgeType || 'popular'}`;

    return `
      <article class="product-card" data-id="${product.id}">
        <div class="product-img-box">
          <span class="product-badge ${badgeClass}">${product.badge}</span>
          <button 
            type="button" 
            class="wishlist-btn ${isWishlisted ? 'active' : ''}" 
            onclick="toggleWishlist('${product.id}', event)" 
            aria-label="Save to wishlist"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
          <img src="${product.image}" alt="${product.title}" class="product-img" loading="lazy">
        </div>

        <div class="product-body">
          <h3 class="product-title" title="${product.title}">${product.title}</h3>
          <div class="product-price">${product.formattedPrice || `KSh ${product.price.toLocaleString()}`}</div>
          <p class="product-desc">${product.description}</p>

          <div class="seller-row">
            <img src="${product.seller.avatar || 'assets/images/avatar_brian.jpg'}" alt="${product.seller.name}" class="seller-avatar">
            <div class="seller-details">
              <span class="seller-name">${product.seller.name}</span>
              <span class="seller-dept">${product.seller.department}</span>
            </div>
          </div>

          <div class="location-row">
            <svg class="location-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Chuka University</span>
          </div>

          <button type="button" class="btn-view-details" onclick="openProductModal('${product.id}')">
            <span>View Details</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <button type="button" class="quick-add-btn" onclick="quickAddToCart('${product.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Quick Add</span>
          </button>
        </div>
      </article>
    `;
  }).join("");
}

// ================= FILTER HANDLERS =================
function filterByCategory(categoryId) {
  if (activeCategory === categoryId) {
    activeCategory = "all";
  } else {
    activeCategory = categoryId;
  }
  renderCategories();
  renderProducts();

  // Scroll smoothly to products
  const section = document.getElementById("featuredSection");
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
}

function resetAllFilters() {
  activeCategory = "all";
  activeFilter = "all";
  currentSearchTerm = "";
  const searchInput = document.getElementById("globalSearchInput");
  if (searchInput) searchInput.value = "";
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.style.display = "none";

  // Reset chips
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.filter === "all");
  });

  renderCategories();
  renderProducts();
}

// ================= QUICK ADD & WISHLIST =================
function quickAddToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (prod) {
    Cart.addItem(prod, 1);
  }
}

function toggleWishlist(productId, event) {
  if (event) event.stopPropagation();
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
    showToast("Removed from saved items", "info");
  } else {
    wishlist.add(productId);
    showToast("Saved to your wishlist!", "success");
  }

  // Update wishlist indicator on mobile bar
  const dot = document.getElementById("wishlistDot");
  if (dot) {
    dot.classList.toggle("active", wishlist.size > 0);
  }

  renderProducts();
}

function filterWishlistItems() {
  if (wishlist.size === 0) {
    showToast("You haven't saved any items yet! Tap the heart icon on any product.", "info");
    return;
  }
  
  activeFilter = "saved";
  activeCategory = "all";
  currentSearchTerm = "";

  document.querySelectorAll(".mobile-bar-btn").forEach(btn => btn.classList.remove("active"));
  const savedBarBtn = document.getElementById("barSavedBtn");
  if (savedBarBtn) savedBarBtn.classList.add("active");

  const container = document.getElementById("productsGridContainer");
  const heading = document.getElementById("productsHeading");
  const subheading = document.getElementById("productsSubheading");
  if (heading) heading.textContent = "Saved / Wishlist Items";
  if (subheading) subheading.textContent = `Showing ${wishlist.size} saved campus item${wishlist.size === 1 ? '' : 's'}.`;

  const savedProducts = products.filter(p => wishlist.has(p.id));
  if (container) {
    container.innerHTML = savedProducts.map(product => {
      const badgeClass = `badge-${product.badgeType || 'popular'}`;
      return `
        <article class="product-card" data-id="${product.id}">
          <div class="product-img-box">
            <span class="product-badge ${badgeClass}">${product.badge}</span>
            <button 
              type="button" 
              class="wishlist-btn active" 
              onclick="toggleWishlist('${product.id}', event)" 
              aria-label="Remove from wishlist"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
            <img src="${product.image}" alt="${product.title}" class="product-img" loading="lazy">
          </div>
          <div class="product-body">
            <h3 class="product-title" title="${product.title}">${product.title}</h3>
            <div class="product-price">${product.formattedPrice || `KSh ${product.price.toLocaleString()}`}</div>
            <div class="seller-row">
              <img src="${product.seller.avatar || 'assets/images/avatar_brian.jpg'}" alt="${product.seller.name}" class="seller-avatar">
              <div class="seller-details">
                <span class="seller-name">${product.seller.name}</span>
                <span class="seller-dept">${product.seller.department}</span>
              </div>
            </div>
            <div class="location-row">
              <svg class="location-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Chuka University</span>
            </div>
            <button type="button" class="btn-view-details" onclick="openProductModal('${product.id}')">
              <span>View Details</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  const section = document.getElementById("featuredSection");
  if (section) section.scrollIntoView({ behavior: "smooth" });
}

// ================= PRODUCT DETAILS MODAL =================
function openProductModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modalBody = document.getElementById("productModalBody");
  const modalOverlay = document.getElementById("productModalOverlay");

  const whatsappMessage = encodeURIComponent(
    `Hello ${product.seller.name}, I am a student at Chuka University interested in your "${product.title}" listed for ${product.formattedPrice || 'KSh ' + product.price.toLocaleString()} on the Chuka Student Marketplace. Is it still available for campus meetup?`
  );

  modalBody.innerHTML = `
    <div class="product-modal-gallery">
      <img src="${product.image}" alt="${product.title}" class="product-modal-main-img">
      <div style="display: flex; gap: 8px; justify-content: center;">
        <span style="font-size: 11.5px; color: #16a34a; background: #dcfce7; padding: 4px 10px; border-radius: 9999px; font-weight: 600;">
          ✓ Campus Verified Seller
        </span>
        <span style="font-size: 11.5px; color: #0284c7; background: #e0f2fe; padding: 4px 10px; border-radius: 9999px; font-weight: 600;">
          Condition: ${product.condition || 'Good'}
        </span>
      </div>
    </div>

    <div>
      <div class="modal-badge-row">
        <span class="product-badge badge-${product.badgeType || 'popular'}" style="position: static;">
          ${product.badge}
        </span>
        <span style="font-size: 12px; color: #64748b;">Posted by fellow student</span>
      </div>

      <h2 class="modal-product-title" id="modalProductTitle">${product.title}</h2>
      <div class="modal-product-price">${product.formattedPrice || `KSh ${product.price.toLocaleString()}`}</div>

      <p class="modal-product-desc">
        ${product.longDescription || product.description}
      </p>

      <!-- Seller Profile Card -->
      <div class="modal-seller-card">
        <div class="modal-seller-header">
          <img src="${product.seller.avatar || 'assets/images/avatar_brian.jpg'}" alt="${product.seller.name}" class="modal-seller-avatar">
          <div style="flex: 1;">
            <div class="modal-seller-name">${product.seller.name}</div>
            <div class="modal-seller-meta">${product.seller.department} • ${product.seller.year || 'Student'}</div>
            <div style="font-size: 12px; color: #0f172a; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Meetup: ${product.seller.location}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-actions-row">
        <a 
          href="https://wa.me/${product.seller.whatsapp}?text=${whatsappMessage}" 
          target="_blank" 
          rel="noopener" 
          class="btn-whatsapp"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
          <span>Chat on WhatsApp (${product.seller.phone})</span>
        </a>

        <button type="button" class="btn-add-cart-large" onclick="Cart.addItem(products.find(p => p.id === '${product.id}')); closeProductModal();">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <span>Add to Campus Cart</span>
        </button>
      </div>

      <!-- Campus Safety Advisory -->
      <div style="margin-top: 18px; padding: 12px; background: #eff6ff; border-radius: 8px; font-size: 11.5px; color: #1e40af; line-height: 1.4;">
        🛡️ <strong>Safety Tips:</strong> Meet in public campus spots (e.g. Student Centre, Library, Pavilion). Always inspect item condition before making M-Pesa payment.
      </div>
    </div>
  `;

  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  const modalOverlay = document.getElementById("productModalOverlay");
  if (modalOverlay) modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

// ================= POST AN ITEM MODAL =================
function openPostModal() {
  const modal = document.getElementById("postModalOverlay");
  if (modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closePostModal() {
  const modal = document.getElementById("postModalOverlay");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// ================= CART DRAWER TOGGLE =================
function openCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    Cart.updateUI();
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// ================= ACCOUNT DROPDOWN =================
function toggleAccountMenu() {
  const menu = document.getElementById("accountDropdown");
  if (menu) menu.classList.toggle("show");
}

function closeAccountMenu() {
  const menu = document.getElementById("accountDropdown");
  if (menu) menu.classList.remove("show");
}

// ================= MOBILE DRAWER =================
function openMobileDrawer() {
  const drawer = document.getElementById("mobileDrawer");
  const overlay = document.getElementById("mobileDrawerOverlay");
  if (drawer && overlay) {
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeMobileDrawer() {
  const drawer = document.getElementById("mobileDrawer");
  const overlay = document.getElementById("mobileDrawerOverlay");
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// ================= TOAST NOTIFICATION =================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
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
      if (searchInput) searchInput.value = "";
      currentSearchTerm = "";
      clearBtn.style.display = "none";
      renderProducts();
      searchInput.focus();
    });
  }

  // Quick filter chips
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      filterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.dataset.filter;
      renderProducts();
    });
  });

  // Modal close buttons
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
    barHomeBtn.addEventListener("click", () => {
      document.querySelectorAll(".mobile-bar-btn").forEach(b => b.classList.remove("active"));
      barHomeBtn.classList.add("active");
      resetAllFilters();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const barCatBtn = document.getElementById("barCatBtn");
  if (barCatBtn) {
    barCatBtn.addEventListener("click", () => {
      document.querySelectorAll(".mobile-bar-btn").forEach(b => b.classList.remove("active"));
      barCatBtn.classList.add("active");
    });
  }

  // Sell buttons
  const navSellBtn = document.getElementById("navSellBtn");
  if (navSellBtn) navSellBtn.addEventListener("click", openPostModal);

  const heroSellBtn = document.getElementById("heroSellBtn");
  if (heroSellBtn) heroSellBtn.addEventListener("click", openPostModal);

  // Account Menu Toggle
  const accountBtn = document.getElementById("accountMenuBtn");
  if (accountBtn) {
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAccountMenu();
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".account-dropdown-wrapper")) {
      closeAccountMenu();
    }
  });

  // Post Item Form Submit
  const postForm = document.getElementById("postItemForm");
  if (postForm) {
    postForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = document.getElementById("postTitle").value.trim();
      const category = document.getElementById("postCategory").value;
      const price = parseInt(document.getElementById("postPrice").value, 10);
      const condition = document.getElementById("postCondition").value;
      const badge = document.getElementById("postBadge").value;
      const description = document.getElementById("postDescription").value.trim();
      const sName = document.getElementById("sellerName").value.trim();
      const sDept = document.getElementById("sellerDept").value.trim();
      const sPhone = document.getElementById("sellerPhone").value.trim();
      const sLocation = document.getElementById("sellerLocation").value.trim();

      // Pick default image based on category
      let image = "assets/images/exercise_books.jpg";
      if (category === "electronics") image = "assets/images/dell_laptop.jpg";
      else if (category === "fashion") image = "assets/images/handbag.jpg";
      else if (category === "phones") image = "assets/images/samsung_phone.jpg";
      else if (category === "food") image = "assets/images/cooked_meal.jpg";
      else if (category === "home") image = "assets/images/kettle.jpg";
      else if (category === "sports") image = "assets/images/basketball.jpg";

      let badgeType = "new";
      if (badge === "Popular") badgeType = "popular";
      if (badge === "Best Deal") badgeType = "best-deal";
      if (badge === "Fresh") badgeType = "fresh";

      const newProduct = {
        id: "p_" + Date.now(),
        title,
        price,
        formattedPrice: `KSh ${price.toLocaleString()}`,
        category,
        badge,
        badgeType,
        image,
        description,
        longDescription: description,
        condition,
        seller: {
          name: sName,
          department: sDept,
          year: "Student",
          avatar: "assets/images/avatar_brian.jpg",
          phone: sPhone,
          whatsapp: sPhone.replace(/[^0-9]/g, ""),
          rating: 5.0,
          salesCount: 1,
          location: `Chuka University (${sLocation})`
        },
        featured: true,
        views: 1
      };

      products.unshift(newProduct);
      saveProducts(products);

      postForm.reset();
      closePostModal();
      renderProducts();

      showToast(`Listing "${newProduct.title}" created successfully!`, "success");

      // Scroll to top of products
      const section = document.getElementById("featuredSection");
      if (section) section.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Cart Checkout Reservation
  const cartCheckoutBtn = document.getElementById("cartCheckoutBtn");
  const checkoutModal = document.getElementById("checkoutModalOverlay");
  const closeCheckoutBtn = document.getElementById("closeCheckoutModalBtn");
  const checkoutForm = document.getElementById("checkoutReserveForm");

  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener("click", () => {
      closeCartDrawer();
      if (checkoutModal) checkoutModal.classList.add("open");
    });
  }

  if (closeCheckoutBtn) {
    closeCheckoutBtn.addEventListener("click", () => {
      if (checkoutModal) checkoutModal.classList.remove("open");
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const buyerName = document.getElementById("buyerName").value;
      const meetup = document.getElementById("meetupLocation").value;

      if (checkoutModal) checkoutModal.classList.remove("open");
      Cart.clear();

      showToast(`Reservation confirmed for ${buyerName}! Meetup spot: ${meetup}.`, "success");
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

// Modal dialog helpers for footer links
function openFaqModal() {
  showToast("FAQs: Marketplace is exclusively for verified Chuka University students to trade on campus.", "info");
}

function openContactModal() {
  showToast("Support Desk: Ndagani Student Centre, Chuka University. Email: support@chuka.ac.ke", "info");
}

function openTermsModal() {
  showToast("Terms: Direct student handover. Ensure inspection before M-Pesa transfer.", "info");
}

function openPrivacyModal() {
  showToast("Privacy: Student contacts are only visible to logged-in campus members.", "info");
}

// Quick search from Hero trending tag pills
function quickHeroSearch(term) {
  const searchInput = document.getElementById("globalSearchInput");
  if (searchInput) {
    searchInput.value = term;
    currentSearchTerm = term;
    const clearBtn = document.getElementById("searchClearBtn");
    if (clearBtn) clearBtn.style.display = "block";
    renderProducts();
  }
  const section = document.getElementById("featuredSection");
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
}
