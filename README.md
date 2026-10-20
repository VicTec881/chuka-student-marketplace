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

## 🗄️ Shared Listings Backend (Vercel + Supabase)

Without a backend, listings live only in each visitor's browser. With the backend, every student sees the same marketplace. If the backend is not configured or not reachable, the site automatically falls back to browser-only mode, so it never breaks.

**One-time setup**

1. Create a free project at [supabase.com](https://supabase.com) (note the database password you choose).
2. In the dashboard open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the `listings` table and locks it so only the server can use it.
3. Copy two values: the **Project URL** (just `https://<project-ref>.supabase.co`, nothing after `.supabase.co`; the server ignores extra text such as `/rest/v1`), and the **secret key** (Project Settings → API Keys, starts with `sb_secret_`).
4. In Vercel open **Project → Settings → Environment Variables** and add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (optionally `IP_HASH_SALT`). See `.env.example`. The secret key must never go in the code, in GitHub, or in a chat.
5. Redeploy (Deployments → ⋯ → Redeploy) so the variables take effect.
6. Open `https://<your-site>/api/listings`. You should see JSON with 11 sample listings. The first request inserts the samples.

**API**

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/listings` | Lists available listings, newest first (`?limit=` up to 200) |
| `POST` | `/api/listings` | Creates a listing (JSON, with an optional `image` photo as a data URL). Validated on the server; limited to 5 posts per hour per IP. Anyone can post; signed-in students get a Verified badge and can manage the listing |
| `PATCH` | `/api/listings?id=…` | `{"status":"sold"}`: the signed-in owner marks a listing sold |
| `DELETE` | `/api/listings?id=…` | The signed-in owner deletes a listing |
| `GET` | `/api/auth/me` | Who is signed in (or `null`) |
| `POST` | `/api/auth/start` | `{email}` emails a 6-digit code to any valid address |
| `POST` | `/api/auth/verify` | `{email, code}` signs in (HttpOnly cookie, 30 days) |
| `POST` | `/api/auth/logout` | Signs out |

**Photos:** the Sell form resizes the chosen photo in the browser (max 1000px JPEG), the server checks the real file type and size (max 1.5 MB), then stores it in a public Supabase Storage bucket named `listing-images`. The bucket is created automatically on the first upload, so no extra setup is needed. Free plan storage is 1 GB.

Raw IP addresses are never stored, only a salted one-way hash used for the rate limit. Sample listings are marked `sample = true` in the database.

**Free plan things to know**

- Supabase **pauses free projects after 1 week of inactivity**. `vercel.json` schedules a once-a-day request to keep the project active. If it ever does pause, press *Restore project* in the Supabase dashboard.
- The free plan has **no automatic backups**. Before real students depend on the data, either upgrade or export the table regularly (Table Editor → Export).

### Sign-in (accounts)

Anyone can sign in with any email address (Gmail, Yahoo, school mail). We email a 6-digit code, there are no passwords. Visitors can browse and post without signing in, but **seller phone/WhatsApp numbers are only sent to signed-in users** (the server withholds them; they are not hidden by CSS). Signed-in users can mark their own listings sold or delete them. Addresses ending in `@chuka.ac.ke` (or a subdomain such as `students.chuka.ac.ke`) are treated as verified students: their listings show a **Verified Chuka student** badge.

Because anyone can sign in, the contact lock stops casual scraping but is not a guarantee that every viewer is a student. If that matters later, switch the lock to `@chuka.ac.ke` only (one-line change in `lib/listings-handler.js`).

**One-time setup for sign-in**

1. Run the new part of [`supabase/schema.sql`](supabase/schema.sql) again (SQL Editor). It adds `owner_email` to `listings` and creates the locked `login_codes` and `login_throttle` tables. It is safe to re-run.
2. Create a free [Brevo](https://www.brevo.com) account (300 emails/day free), verify a sender address (Senders, Domains & dedicated IPs → Senders), and create an API key (SMTP & API → API Keys).
3. In Vercel add `BREVO_API_KEY` and `MAIL_FROM` (the verified sender address). `SESSION_SECRET` is optional: if you leave it out, the session signing key is derived from `SUPABASE_SECRET_KEY`.
4. Redeploy.

Notes: codes are valid for 10 minutes, work once, are stored only as a keyed hash, are locked after 5 wrong tries, each email can request at most 5 codes per hour (one per minute), and each network address at most 10 code requests per hour across all emails (so the email quota cannot be drained). For reliable inbox delivery, send from an address on a domain you own and authenticate it in Brevo; mail sent "from" a free Gmail address often lands in spam.

**Known limits**: listings posted while signed out cannot be edited or deleted later (there is no proof of who posted them), and "My Listings" for them is remembered per browser.

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
├── lib/                         # Server code: Supabase store, validation, handler, seed data
├── supabase/
│   └── schema.sql               # Database table (run once in the Supabase SQL editor)
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
