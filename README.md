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

## 📁 Project Structure

```text
chuka-student-marketplace/
├── index.html                   # Core semantic HTML layout & accessible modals
├── css/
│   └── styles.css               # Design system, CSS variables, responsive typography
├── js/
│   ├── app.js                   # Live search, category filtering, seller modal logic
│   ├── data.js                  # Initial campus product catalog & LocalStorage persistence
│   └── cart.js                  # Cart manager, quantity adjusters, drawer UI
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
