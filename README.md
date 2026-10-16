# Chuka University Student Marketplace 🎓🛒

A modern, student-centric marketplace web application built exclusively for the Chuka University campus community. Buy, sell, and support fellow students safely, affordably, and conveniently.

![Chuka University Student Marketplace Banner](assets/images/chuka_campus_hero.jpg)

## 🌟 Key Features

- **Chuka University Identity**: Features the official Chuka University coat of arms emblem and aerial campus panorama.
- **Shop by Category**: 8 dedicated pastel category cards:
  - 💻 Electronics (Laptops, headphones, chargers, adapters)
  - 📚 Books & Stationery (Course textbooks, exercise books, revision guides, calculators)
  - 👕 Clothing & Fashion (Campus hoodies, formal wear, casual student fashion, bags)
  - 📱 Phones & Accessories (Smartphones, earbuds, screen protectors, cables)
  - 🏠 Home & Living (Hostel electric kettles, study lamps, room storage, bedding)
  - 🍲 Food & Beverages (Fresh student meals, daily catering, snacks)
  - 🏀 Sports & Recreation (Basketballs, soccer boots, fitness gear)
  - 💬 Other (Campus services, tutoring, peer assistance)
- **Verified Student Listings**: Each card displays the student seller's name, degree course (e.g. BSc. Computer Science, Agriculture, Business Admin, Education), and campus location.
- **Direct WhatsApp Chat**: One-click WhatsApp link pre-filled with the item title and price for instant negotiation and campus meetup arrangement.
- **Start Selling Flow**: Interactive modal allowing any student to list items in seconds with live price in KSh and meetup spot.
- **Campus Cart & Reservations**: Slide-over cart drawer with quantity controls, M-Pesa pay-on-delivery notes, and campus meetup selector (Student Centre, Library Lawn, Science Complex, Pavilion Hostel, Ndagani Commercial Center).
- **Instant Search & Filters**: Real-time keyword search across titles, descriptions, and categories, plus filter chips (Popular, Best Deals, Under KSh 1,000).

## 🚀 Getting Started

No build tools or complex configurations required! Simply open the site:

### Option 1: Direct File
Double-click `index.html` in your file browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local HTTP Server
Using Python:
```bash
python -m http.server 8080
```
Then navigate to `http://localhost:8080` in your web browser.

## 🗄️ Shared Listings Backend (Vercel + MongoDB Atlas)

Without a backend, listings live only in each visitor's browser. With the backend, every student sees the same marketplace. If the backend is not configured or not reachable, the site automatically falls back to browser-only mode, so it never breaks.

**One-time setup**

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas). Create a database user, and under *Network Access* allow `0.0.0.0/0` (Vercel's server addresses change, so a fixed allow-list does not work).
2. In Atlas choose **Connect → Drivers** and copy the connection string. Replace `<password>` with your database user's password.
3. In Vercel open **Project → Settings → Environment Variables** and add `MONGODB_URI` (and optionally `MONGODB_DB`, `IP_HASH_SALT`). See `.env.example`. Never put these values in the code or in GitHub.
4. Redeploy (Deployments → ⋯ → Redeploy) so the variables take effect.
5. Open `https://<your-site>/api/listings`. You should see JSON with 11 sample listings. The first request creates the collection and inserts the samples.

**API**

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/listings` | Lists available listings, newest first (`?limit=` up to 200) |
| `POST` | `/api/listings` | Creates a listing (JSON). Validated on the server; limited to 5 posts per hour per IP |

Raw IP addresses are never stored, only a salted one-way hash used for the rate limit. Sample listings are marked `sample: true` in the database.

**Known limits (until accounts are added)**: anyone can post, nobody can edit or delete a listing, and "My Listings" is remembered per browser.

**Run the tests**: `npm install && npm test`

## 📁 Project Structure

```text
chuka-student-marketplace/
├── index.html                   # Core semantic HTML layout & accessible modals
├── css/
│   └── styles.css               # Design system, CSS variables, responsive typography
├── js/
│   ├── app.js                   # Live search, category filtering, seller modal logic
│   ├── api.js                   # Client for the shared listings API (with offline fallback)
│   ├── data.js                  # Sample catalogue & browser-only fallback storage
│   ├── utils.js                 # HTML escaping, Kenyan phone handling (unit tested)
│   └── cart.js                  # Cart manager, quantity adjusters, drawer UI
├── api/
│   └── listings.js              # Vercel serverless function: GET/POST /api/listings
├── lib/                         # Server code: MongoDB connection, validation, handler, seed data
├── tests/                       # Unit tests (npm test)
└── assets/
    └── images/
        ├── chuka_logo.png        # Official Chuka University coat of arms emblem
        ├── chuka_campus_hero.jpg # Aerial campus panorama photograph
        ├── dell_laptop.jpg       # Product showcase images
        ├── exercise_books.jpg
        ├── handbag.jpg
        ├── samsung_phone.jpg
        ├── cooked_meal.jpg
        └── avatar_*.jpg          # Student seller avatars
```

## 🛡️ Campus Safety Guidelines

1. **Meet in Public**: Always arrange meetups at designated high-traffic campus locations (Student Centre / Mess, Library Lawn, Science Complex).
2. **Inspect First**: Always inspect the physical condition of the item before making payment.
3. **M-Pesa on Delivery**: Pay only once you have satisfied yourself with the product in person.

## 📄 License & Credits

Built with ❤️ for Chuka University students. All university crests and campus imagery belong to Chuka University.
