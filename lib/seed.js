// Sample listings inserted once, the first time the listings collection is empty.
// They come from the same catalogue the front end ships with, so ids (p1, p2, ...) match
// what visitors may already have in their carts and wishlists.

const { INITIAL_PRODUCTS } = require("../js/data.js");
const { normalizeKenyanPhone, formatKenyanPhone } = require("../js/utils.js");

function buildSeedListings(now = Date.now()) {
  return INITIAL_PRODUCTS.map((p, index) => {
    const whatsapp = normalizeKenyanPhone(p.seller.phone) || "";
    return {
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      condition: p.condition,
      badge: p.badge,
      badgeType: p.badgeType,
      description: p.description,
      longDescription: p.longDescription,
      image: p.image,
      seller: {
        name: p.seller.name,
        department: p.seller.department,
        year: p.seller.year,
        avatar: p.seller.avatar,
        phone: whatsapp ? formatKenyanPhone(whatsapp) : p.seller.phone,
        whatsapp,
        location: p.seller.location
      },
      sample: true, // demo content, not a real student's listing
      status: "available",
      // Keep the original order: earlier items are "newer".
      createdAt: new Date(now - index * 1000).toISOString()
    };
  });
}

module.exports = { buildSeedListings };
