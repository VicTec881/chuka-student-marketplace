// Server-side validation for listings. The browser validates too, but only this
// code is trusted: anyone can call the API directly and skip the form.

const { parseImageDataUrl } = require("./images");
const { normalizeKenyanPhone, formatKenyanPhone, DEFAULT_AVATAR, DEFAULT_PRODUCT_IMAGE } = require("../js/utils.js");

const CATEGORIES = ["electronics", "books", "fashion", "phones", "home", "food", "sports", "other"];

const CONDITIONS = [
  "Brand New",
  "Used - Like New",
  "Used - Very Good",
  "Used - Good",
  "Used - Fair",
  "Freshly Prepared"
];

const BADGES = {
  "Popular": "popular",
  "New": "new",
  "Best Deal": "best-deal",
  "Fresh": "fresh"
};

const CATEGORY_IMAGES = {
  electronics: "assets/images/dell_laptop.jpg",
  fashion: "assets/images/handbag.jpg",
  phones: "assets/images/samsung_phone.jpg",
  food: "assets/images/cooked_meal.jpg",
  home: "assets/images/kettle.jpg",
  sports: "assets/images/basketball.jpg"
};

const LIMITS = {
  title: [3, 80],
  description: [10, 1000],
  sellerName: [2, 60],
  sellerDept: [2, 80],
  sellerLocation: [2, 80],
  price: [10, 10000000]
};

// Remove control characters and collapse whitespace; the front end escapes on render.
function cleanText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Descriptions may contain line breaks, so keep \n but strip other control characters.
function cleanMultiline(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function checkLength(errors, field, text, [min, max], label) {
  if (text.length < min) errors[field] = `${label} must be at least ${min} characters.`;
  else if (text.length > max) errors[field] = `${label} must be at most ${max} characters.`;
}

/**
 * Validate the body of POST /api/listings.
 * Returns { ok: true, value } with the clean listing fields, or { ok: false, errors }
 * where errors maps a field name to a human-readable message.
 */
function validateListingInput(body) {
  const errors = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, errors: { _: "Request body must be a JSON object." } };
  }

  const title = cleanText(body.title);
  const description = cleanMultiline(body.description);
  const sellerName = cleanText(body.sellerName);
  const sellerDept = cleanText(body.sellerDept);
  const sellerLocation = cleanText(body.sellerLocation);

  checkLength(errors, "title", title, LIMITS.title, "Title");
  checkLength(errors, "description", description, LIMITS.description, "Description");
  checkLength(errors, "sellerName", sellerName, LIMITS.sellerName, "Seller name");
  checkLength(errors, "sellerDept", sellerDept, LIMITS.sellerDept, "Department");
  checkLength(errors, "sellerLocation", sellerLocation, LIMITS.sellerLocation, "Meetup location");

  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!Number.isInteger(price) || price < LIMITS.price[0] || price > LIMITS.price[1]) {
    errors.price = "Price must be a whole number between KSh 10 and KSh 10,000,000.";
  }

  const category = typeof body.category === "string" ? body.category : "";
  if (!CATEGORIES.includes(category)) errors.category = "Choose a valid category.";

  const condition = typeof body.condition === "string" ? body.condition : "";
  if (!CONDITIONS.includes(condition)) errors.condition = "Choose a valid condition.";

  const badge = typeof body.badge === "string" && body.badge ? body.badge : "New";
  if (!Object.prototype.hasOwnProperty.call(BADGES, badge)) errors.badge = "Choose a valid badge.";

  const whatsapp = normalizeKenyanPhone(body.sellerPhone);
  if (!whatsapp) errors.sellerPhone = "Enter a valid Kenyan mobile number, e.g. 0712 345 678.";

  // Optional photo (data URL). Invalid photos are rejected rather than silently dropped.
  let photo = null;
  if (body.image !== undefined && body.image !== null && body.image !== "") {
    const parsed = parseImageDataUrl(body.image);
    if (parsed.ok) photo = parsed;
    else errors.image = parsed.message;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    photo, // { buffer, mime, ext } or null; the handler uploads it and sets value.image
    value: {
      title,
      price,
      category,
      condition,
      badge,
      badgeType: BADGES[badge],
      description,
      image: CATEGORY_IMAGES[category] || DEFAULT_PRODUCT_IMAGE,
      seller: {
        name: sellerName,
        department: sellerDept,
        year: "",
        avatar: DEFAULT_AVATAR,
        phone: formatKenyanPhone(whatsapp),
        whatsapp,
        location: `Chuka University (${sellerLocation})`
      }
    }
  };
}

module.exports = {
  CATEGORIES,
  CONDITIONS,
  BADGES,
  CATEGORY_IMAGES,
  LIMITS,
  cleanText,
  cleanMultiline,
  validateListingInput
};
