// Chuka University Student Marketplace Data Layer

const INITIAL_CATEGORIES = [
  {
    id: "electronics",
    name: "Electronics",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>`,
    bgColor: "#e0f2fe",
    textColor: "#0369a1",
    borderColor: "#bae6fd",
    count: 42
  },
  {
    id: "books",
    name: "Books & Stationery",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 2v20"/><path d="M10 6h6"/><path d="M10 10h6"/></svg>`,
    bgColor: "#ffe4e6",
    textColor: "#e11d48",
    borderColor: "#fecdd3",
    count: 68
  },
  {
    id: "fashion",
    name: "Clothing & Fashion",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
    bgColor: "#f3e8ff",
    textColor: "#9333ea",
    borderColor: "#e9d5ff",
    count: 53
  },
  {
    id: "phones",
    name: "Phones & Accessories",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>`,
    bgColor: "#dcfce7",
    textColor: "#16a34a",
    borderColor: "#bbf7d0",
    count: 31
  },
  {
    id: "home",
    name: "Home & Living",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    bgColor: "#ffedd5",
    textColor: "#ea580c",
    borderColor: "#fed7aa",
    count: 29
  },
  {
    id: "food",
    name: "Food & Beverages",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10"/><path d="M12 15v7"/><path d="M6 2v20"/><path d="M3 6h6"/></svg>`,
    bgColor: "#e0f7fa",
    textColor: "#0288d1",
    borderColor: "#b2ebf2",
    count: 19
  },
  {
    id: "sports",
    name: "Sports & Recreation",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93 19.07 19.07"/><path d="m14 2 .5 8.5L22 14"/><path d="M2 10l8.5.5L14 22"/></svg>`,
    bgColor: "#f5f3ff",
    textColor: "#7c3aed",
    borderColor: "#ddd6fe",
    count: 14
  },
  {
    id: "other",
    name: "Other",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    bgColor: "#f1f5f9",
    textColor: "#64748b",
    borderColor: "#e2e8f0",
    count: 22
  }
];

const INITIAL_PRODUCTS = [
  {
    id: "p1",
    title: "Dell Latitude Laptop",
    price: 28000,
    formattedPrice: "KSh 28,000",
    category: "electronics",
    badge: "Popular",
    badgeType: "popular", // blue
    image: "assets/images/dell_laptop.jpg",
    description: "Intel i5, 8GB RAM, 256GB SSD. Very clean and works perfectly.",
    longDescription: "Dell Latitude 5490 business notebook. Powered by Intel Core i5 8th Gen, 8GB DDR4 RAM (expandable), and high-speed 256GB M.2 NVMe SSD. Battery health is at 88% (~4 hours continuous coding or lecture note-taking). Includes genuine Dell 65W AC charger.",
    condition: "Used - Like New",
    seller: {
      name: "Brian Mwangi",
      department: "BSc. Computer Science",
      year: "Year 3",
      avatar: "assets/images/avatar_brian.jpg",
      phone: "+254 712 345 678",
      whatsapp: "254712345678",
      rating: 4.9,
      salesCount: 12,
      location: "Chuka University (Science Complex / Hall 4)"
    },
    featured: true,
    views: 142
  },
  {
    id: "p2",
    title: "Exercise Books (Set of 5)",
    price: 350,
    formattedPrice: "KSh 350",
    category: "books",
    badge: "New",
    badgeType: "new", // green
    image: "assets/images/exercise_books.jpg",
    description: "Quality exercise books, 200 pages. Ideal for all courses.",
    longDescription: "Brand new pack of 5 Kasuku/Pukka Pad style exercise books, 200 pages ruled, high-gsm bleed-resistant paper. Durable glossy covers in assorted colors (red, green, blue, yellow). Perfect for taking lecture notes across your semester units.",
    condition: "Brand New",
    seller: {
      name: "Faith Wanjiku",
      department: "BSc. Agriculture",
      year: "Year 2",
      avatar: "assets/images/avatar_faith.jpg",
      phone: "+254 723 456 789",
      whatsapp: "254723456789",
      rating: 5.0,
      salesCount: 28,
      location: "Chuka University (Pavilion Hostel / Farm Gate)"
    },
    featured: true,
    views: 89
  },
  {
    id: "p3",
    title: "Ladies Handbag",
    price: 1500,
    formattedPrice: "KSh 1,500",
    category: "fashion",
    badge: "Best Deal",
    badgeType: "best-deal", // orange
    image: "assets/images/handbag.jpg",
    description: "Stylish and durable. Perfect for campus and casual use.",
    longDescription: "Elegant black structured tote bag with gold-tone accents and top zip closure. Spacious interior easily fits notebooks, iPad/tablet, powerbank, and daily campus essentials. Dual carry handles plus detachable adjustable shoulder strap.",
    condition: "Used - Very Good",
    seller: {
      name: "Mercy Njeri",
      department: "BSc. Business Admin",
      year: "Year 4",
      avatar: "assets/images/avatar_mercy.jpg",
      phone: "+254 734 567 890",
      whatsapp: "254734567890",
      rating: 4.8,
      salesCount: 19,
      location: "Chuka University (Ladies Hall 2 / Cafeteria)"
    },
    featured: true,
    views: 215
  },
  {
    id: "p4",
    title: "Samsung Galaxy A14",
    price: 14500,
    formattedPrice: "KSh 14,500",
    category: "phones",
    badge: "Popular",
    badgeType: "popular", // blue
    image: "assets/images/samsung_phone.jpg",
    description: "128GB, 4GB RAM. Good condition. Comes with charger.",
    longDescription: "Samsung Galaxy A14 Dual SIM in Awesome Black. 128GB internal storage, 4GB RAM + RAM Plus. 50MP triple camera system, crisp 6.6-inch FHD+ display, massive 5000mAh battery that easily lasts 2 full campus days. Comes with transparent protective case and original Type-C fast charger.",
    condition: "Used - Very Good",
    seller: {
      name: "Kelvin Mutua",
      department: "BSc. Computer Science",
      year: "Year 2",
      avatar: "assets/images/avatar_kelvin.jpg",
      phone: "+254 745 678 901",
      whatsapp: "254745678901",
      rating: 4.9,
      salesCount: 15,
      location: "Chuka University (Block B, Room 14)"
    },
    featured: true,
    views: 310
  },
  {
    id: "p5",
    title: "Home Cooked Meals",
    price: 150,
    formattedPrice: "KSh 150",
    category: "food",
    badge: "Fresh",
    badgeType: "fresh", // emerald
    image: "assets/images/cooked_meal.jpg",
    description: "Delicious and nutritious meals. Rice, beans, beef, vegetables.",
    longDescription: "Freshly cooked hot campus meals made with love! Generous portions of steamed rice, savory stewed yellow beans, tender beef chunks in rich gravy, and sautéed sukuma wiki/cabbage. Delivered hot right outside student hostels or picked up near Ndagani Gate.",
    condition: "Freshly Prepared Daily",
    seller: {
      name: "Grace Wanjiru",
      department: "BSc. Education",
      year: "Year 3",
      avatar: "assets/images/avatar_grace.jpg",
      phone: "+254 756 789 012",
      whatsapp: "254756789012",
      rating: 5.0,
      salesCount: 84,
      location: "Chuka University (Ndagani Junction / Hall 1)"
    },
    featured: true,
    views: 450
  },
  // Additional products for rich discovery
  {
    id: "p6",
    title: "Casio fx-991EX Scientific Calculator",
    price: 1800,
    formattedPrice: "KSh 1,800",
    category: "books",
    badge: "Essential",
    badgeType: "popular",
    image: "assets/images/casio_calc.jpg",
    description: "Original ClassWiz with 552 functions. High-res spreadsheet display.",
    longDescription: "Authentic Casio fx-991EX ClassWiz scientific calculator. Natural textbook display, simultaneous equations, matrices, vectors, integration and statistics. Approved for university exams.",
    condition: "Used - Like New",
    seller: {
      name: "Brian Mwangi",
      department: "BSc. Computer Science",
      year: "Year 3",
      avatar: "assets/images/avatar_brian.jpg",
      phone: "+254 712 345 678",
      whatsapp: "254712345678",
      rating: 4.9,
      salesCount: 12,
      location: "Chuka University (Science Complex)"
    },
    featured: false,
    views: 76
  },
  {
    id: "p7",
    title: "Stainless Steel Fast-Boil Kettle (2.0L)",
    price: 850,
    formattedPrice: "KSh 850",
    category: "home",
    badge: "Best Deal",
    badgeType: "best-deal",
    image: "assets/images/kettle.jpg",
    description: "1500W rapid boiling, auto cut-off protection. Campus room must-have.",
    longDescription: "2.0-litre stainless steel electric kettle. Boils water in under 4 minutes. Ideal for hostel morning hot beverages, coffee, and quick ramen. Clean heating element with 3-pin fused plug.",
    condition: "Used - Good",
    seller: {
      name: "Mercy Njeri",
      department: "BSc. Business Admin",
      year: "Year 4",
      avatar: "assets/images/avatar_mercy.jpg",
      phone: "+254 734 567 890",
      whatsapp: "254734567890",
      rating: 4.8,
      salesCount: 19,
      location: "Chuka University (Ladies Hall 2)"
    },
    featured: false,
    views: 112
  },
  {
    id: "p8",
    title: "Chuka University Varsity Hoodie",
    price: 1200,
    formattedPrice: "KSh 1,200",
    category: "fashion",
    badge: "Trending",
    badgeType: "new",
    image: "assets/images/hoodie.jpg",
    description: "Heavyweight 100% cotton fleece. Deep navy blue with kangaroo pocket.",
    longDescription: "Super cozy Chuka University student varsity hoodie. High-density embroidery, fleece lined inside for cold Chuka evenings, ribbed cuffs and drawstring hood.",
    condition: "Brand New",
    seller: {
      name: "Kelvin Mutua",
      department: "BSc. Computer Science",
      year: "Year 2",
      avatar: "assets/images/avatar_kelvin.jpg",
      phone: "+254 745 678 901",
      whatsapp: "254745678901",
      rating: 4.9,
      salesCount: 15,
      location: "Chuka University (Block B, Room 14)"
    },
    featured: false,
    views: 198
  },
  {
    id: "p9",
    title: "Wireless Noise-Cancelling Headphones",
    price: 2400,
    formattedPrice: "KSh 2,400",
    category: "electronics",
    badge: "Popular",
    badgeType: "popular",
    image: "assets/images/headphones.jpg",
    description: "Deep bass, 30h battery life, comfortable memory foam ear cushions.",
    longDescription: "Bluetooth 5.3 over-ear headphones with active ambient noise reduction. Built-in mic for Zoom classes, foldable hinges, type-C fast charging. Perfect for studying in the university library.",
    condition: "Used - Like New",
    seller: {
      name: "Brian Mwangi",
      department: "BSc. Computer Science",
      year: "Year 3",
      avatar: "assets/images/avatar_brian.jpg",
      phone: "+254 712 345 678",
      whatsapp: "254712345678",
      rating: 4.9,
      salesCount: 12,
      location: "Chuka University (Science Complex)"
    },
    featured: false,
    views: 165
  },
  {
    id: "p10",
    title: "LED Study Desk Lamp with USB Port",
    price: 650,
    formattedPrice: "KSh 650",
    category: "home",
    badge: "New",
    badgeType: "new",
    image: "assets/images/desk_lamp.jpg",
    description: "Eye-care warm & cool lighting, flexible 360 goose-neck, touch dimmer.",
    longDescription: "Energy-efficient LED study lamp designed for late-night hostel revisions without straining your eyes or disturbing roommates. Features built-in phone charging port and touch switch.",
    condition: "Brand New",
    seller: {
      name: "Faith Wanjiku",
      department: "BSc. Agriculture",
      year: "Year 2",
      avatar: "assets/images/avatar_faith.jpg",
      phone: "+254 723 456 789",
      whatsapp: "254723456789",
      rating: 5.0,
      salesCount: 28,
      location: "Chuka University (Pavilion Hostel)"
    },
    featured: false,
    views: 92
  },
  {
    id: "p11",
    title: "Molten Official Size 7 Basketball",
    price: 1100,
    formattedPrice: "KSh 1,100",
    category: "sports",
    badge: "Best Deal",
    badgeType: "best-deal",
    image: "assets/images/basketball.jpg",
    description: "Durable composite rubber grip. Ideal for campus tarmac and indoor court.",
    longDescription: "Standard size 7 basketball with pebble surface pattern for superior grip and bounce response. Great for evening student pickup games at the Chuka sports ground.",
    condition: "Used - Very Good",
    seller: {
      name: "Kelvin Mutua",
      department: "BSc. Computer Science",
      year: "Year 2",
      avatar: "assets/images/avatar_kelvin.jpg",
      phone: "+254 745 678 901",
      whatsapp: "254745678901",
      rating: 4.9,
      salesCount: 15,
      location: "Chuka University (Block B, Room 14)"
    },
    featured: false,
    views: 88
  }
];

// ================= STORAGE (browser only, until a backend exists) =================
const STORAGE_KEYS = {
  products: "chuka_marketplace_products",
  wishlist: "chuka_marketplace_wishlist",
  reservations: "chuka_marketplace_reservations"
};

// localStorage can throw (private mode, blocked storage, quota). Never let that break the page.
function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error("Could not save to localStorage", e);
    return false;
  }
}

function storageGetJSON(key) {
  const raw = storageGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse stored data for ${key}`, e);
    return null;
  }
}

/**
 * Validate and repair one stored product. Returns null if it is unusable.
 * - ensures the fields the UI relies on exist and have the right types
 * - re-derives the WhatsApp number from the phone number (fixes old "0712..." links)
 * - only keeps images that ship with the site
 */
function sanitizeProduct(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const price = Number(raw.price);
  if (!id || !title || !Number.isFinite(price) || price < 0) return null;

  const seller = raw.seller && typeof raw.seller === "object" ? raw.seller : {};
  const phoneSource = seller.phone || seller.whatsapp || "";
  const whatsapp = normalizeKenyanPhone(phoneSource) || "";

  return {
    ...raw,
    id,
    title,
    price,
    formattedPrice: `KSh ${price.toLocaleString()}`,
    category: typeof raw.category === "string" ? raw.category : "other",
    badge: typeof raw.badge === "string" && raw.badge ? raw.badge : "New",
    badgeType: typeof raw.badgeType === "string" && raw.badgeType ? raw.badgeType : "new",
    image: safeImagePath(raw.image),
    description: typeof raw.description === "string" ? raw.description : "",
    longDescription: typeof raw.longDescription === "string" ? raw.longDescription : "",
    condition: typeof raw.condition === "string" ? raw.condition : "",
    // Listings created in this browser (ids start with "p_") belong to "My Listings".
    mine: raw.mine === true || id.startsWith("p_"),
    seller: {
      ...seller,
      name: typeof seller.name === "string" ? seller.name : "Student",
      department: typeof seller.department === "string" ? seller.department : "",
      year: typeof seller.year === "string" ? seller.year : "",
      phone: whatsapp ? formatKenyanPhone(whatsapp) : String(phoneSource || ""),
      whatsapp,
      location: typeof seller.location === "string" ? seller.location : "Chuka University",
      avatar: id.startsWith("p_") ? DEFAULT_AVATAR : safeImagePath(seller.avatar, DEFAULT_AVATAR)
    }
  };
}

// Helper to get products from LocalStorage or initialize with defaults
function getStoredProducts() {
  const stored = storageGetJSON(STORAGE_KEYS.products);

  if (Array.isArray(stored)) {
    const cleaned = stored.map(sanitizeProduct).filter(Boolean);
    if (cleaned.length > 0) {
      saveProducts(cleaned); // persist repaired data (e.g. fixed WhatsApp numbers)
      return cleaned;
    }
  }

  // Nothing stored, unreadable, or nothing usable: start from the sample catalogue.
  const defaults = INITIAL_PRODUCTS.map(sanitizeProduct).filter(Boolean);
  saveProducts(defaults);
  return defaults;
}

function saveProducts(products) {
  return storageSet(STORAGE_KEYS.products, JSON.stringify(products));
}

// ================= WISHLIST =================
function getStoredWishlist() {
  const stored = storageGetJSON(STORAGE_KEYS.wishlist);
  return new Set(Array.isArray(stored) ? stored.filter(id => typeof id === "string") : []);
}

function saveWishlist(wishlistSet) {
  return storageSet(STORAGE_KEYS.wishlist, JSON.stringify([...wishlistSet]));
}

// ================= RESERVATIONS =================
function getStoredReservations() {
  const stored = storageGetJSON(STORAGE_KEYS.reservations);
  return Array.isArray(stored) ? stored : [];
}

function saveReservation(reservation) {
  const all = getStoredReservations();
  all.unshift(reservation);
  return storageSet(STORAGE_KEYS.reservations, JSON.stringify(all));
}

// Allow the serverless API (Node) to reuse the sample catalogue as seed data.
// In the browser `module` is undefined, so this does nothing.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { INITIAL_CATEGORIES, INITIAL_PRODUCTS };
}
