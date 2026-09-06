# Mannar Green Ride (MGR) - System & Website Requirements

## 1. Executive Summary & Business Overview
**Mannar Green Ride (MGR)** is a premier passenger transport, eco-tourism, and fitness rental service based in Mannar Town, Northern Province, Sri Lanka. The platform bridges local vehicle owners and international tourists, birdwatchers, pilgrims, NGO workers, and fitness enthusiasts.

- **Brand Motto:** *"Ride Easy. Save Money. Stay Fit. Go Green."*
- **Primary Operational Base:** Mannar Town, Sri Lanka
- **Direct WhatsApp Line:** `+94 77 657 4418`
- **Official Email:** `mannargreenride@gmail.com`
- **Key Differentiator:** A comprehensive transport marketplace covering green personal mobility (bicycles from Rs. 100/hr, motorcycles) to private family & group transit (A/C cars, KDH vans, tourist buses), supported by a verified local vehicle host network.

---

## 2. Target Audience & User Personas
1. **Eco-Tourists & Fitness Cyclists:** Travelers and locals seeking active cardio exercise along the scenic flat causeways and coastal roads of Mannar.
2. **Backpackers & Independent Explorers:** Solo or couple travelers looking for budget-friendly scooters and motorbikes to explore Talaimannar Pier, Adam's Bridge, and remote lighthouses.
3. **Families & Pilgrimage/Tour Groups:** Groups visiting Thiruketheeswaram, Madhu Church, or migratory bird sanctuaries requiring spacious A/C vans (Toyota KDH) or 24–42 seater tourist coaches.
4. **Local Vehicle Owners (Hosts):** Residents in Mannar with idle bicycles, motorbikes, cars, vans, or buses who want to earn extra income by listing their vehicles.

---

## 3. Core Functional Requirements

### 3.1. Fleet Presentation & Categorization
The website must feature dedicated categorization and detail cards for 5 distinct vehicle tiers:
1. **Bicycles (Fitness & Town):**
   - Mountain bikes and hybrid city bikes.
   - Pricing: Rs. 100/hr | Rs. 400 (Half-Day, 4–5 hrs) | Rs. 800 (Full-Day, 24 hrs).
   - Inclusions: Free safety sports helmet, heavy-duty anti-theft cable lock, phone holder, water bottle cage.
2. **Motorcycles & Scooters:**
   - Automatic scooters (Honda Dio, TVS NTorq) & manual touring motorbikes.
   - Pricing: Rs. 500/hr | Rs. 1,800 (Half-Day) | Rs. 3,500 (Full-Day).
   - Inclusions: 2 safety helmets, high fuel efficiency, 24/7 roadside assistance.
3. **Cars (Sedans & Hatchbacks):**
   - Compact hatchbacks (Alto, WagonR) and comfortable sedans/hybrids (Prius).
   - Pricing: From Rs. 1,500/hr | Rs. 5,000 (Half-Day) | Rs. 9,500 (Full-Day).
   - Options: With verified local driver or self-drive.
4. **Passenger Vans:**
   - High-roof Toyota KDH, Nissan Caravan (10–15 seaters), full dual A/C.
   - Ideal for group excursions and airport transfers.
5. **Tourist Buses & Mini-Buses:**
   - 24 to 42 seater air-conditioned coaches for large groups, research delegations, and school/pilgrim trips.

### 3.2. Interactive Pricing Matrix & Duration Toggle
- Seamless switching between **Hourly**, **Half-Day (4–5 hrs)**, and **Full-Day (24 hrs)**.
- Real-time rate calculation and transparent pricing with no hidden charges.
- Direct "Select Vehicle" action that automatically populates the booking form.

### 3.3. Direct WhatsApp Booking Engine
- Friction-free booking workflow without mandatory account registration.
- **Form Fields:**
  - Full Name (Required)
  - WhatsApp / Phone Number (Required, with international formatting support)
  - Vehicle Type (Pre-selectable from fleet)
  - Rental Package / Duration (Hourly, Half-day, Full-day, Multi-day tour)
  - Rental Date (Auto-validated to today or future dates)
  - Quantity of Vehicles (1–25)
  - Hotel / Pickup Location & Special Inquiries
- **Action:** Form generates an URL-encoded WhatsApp message sent directly to `+94 77 657 4418` (`https://wa.me/94776574418?text=...`).

### 3.4. Host Community & Vehicle Owner Onboarding
- **WhatsApp Host Group Invitation:** Quick-access CTA to join the Mannar Green Ride vehicle owners community.
- **AI Listing Assistant for Vehicle Owners:**
  - Input: Vehicle description & target audience.
  - Output: Well-crafted, emoji-rich rental promotion post in WhatsApp markdown format with suggested fair LKR pricing and call-to-action.

### 3.5. AI Route & Fitness Itinerary Planner
- Input parameters: Vehicle type, Pace/Intensity goal (casual, cardio workout, long distance tour), Available duration, Specific interests (Vankalai bird sanctuary, Talaimannar lighthouse, Baobab tree, Adam's Bridge).
- Output: Personalized itinerary with estimated distances (km), estimated calories burned (for cyclists), scenic rest stops, and local safety precautions.

### 3.6. Body Fitness & Eco-Tourism Feature Section
- Educational content highlighting Mannar’s unique geography: flat causeways, sea breeze, bird sanctuary routes.
- Benefits: Joint-friendly cardiovascular workout, low carbon footprint, local community empowerment.

### 3.7. Travel Guides & Blogs
- Curated blog cards highlighting:
  1. *Top 5 Cycling Routes in Mannar for Fitness & Bird Watching.*
  2. *Renting a Motorcycle in Mannar: License, Helmet & Road Safety Rules.*
  3. *Empowering Local Communities: How Local Hosts Drive Northwestern Tourism.*

### 3.8. Moving Testimonial Marquee
- Smooth, infinite marquee displaying authentic reviews from local and international travelers (Germany, Russia, Colombo, local hosts).
- Interactive pause-on-hover capability.

### 3.9. Multilingual Localization (6 Languages)
Full UI and SEO translation dictionary support for:
1. English (`en`) - Default
2. Tamil (`ta`) - Local primary language
3. Sinhala (`si`) - National language
4. Russian (`ru`) - Major tourist demographic in Sri Lanka
5. French (`fr`) - European eco-tourist demographic
6. Chinese (`zh`) - International travelers and business delegations

---

## 4. Non-Functional & Technical Requirements

### 4.1. Visual Design & Aesthetics
- **Color Palette:**
  - Primary Green: `#15803d` (Deep Emerald)
  - Dark Accent: `#14532d` (Forest Green)
  - Fresh Accent: `#65a30d` (Lime Leaf)
  - Soft Surface: `#f0fdf4` / `#f8fafc`
  - Text: `#0f172a` (Slate 900)
- **Typography:** Modern, clean typography (Inter / Plus Jakarta Sans / Outfit) with high readability across all 6 languages and script families (Latin, Tamil, Sinhala, Cyrillic, Hanzi).
- **Responsive Layout:** 100% mobile-first design, optimized for iOS Safari, Android Chrome, and desktop viewports.
- **Micro-animations:** Subtle hover states, smooth accordion/modal transitions, animated metric counters, and floating WhatsApp contact button.

### 4.2. SEO & Web Standards
- Canonical `<title>` and `<meta name="description">` tags dynamically synchronized with language changes.
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`) for social media sharing.
- Schema.org structured data (`TravelAgency` / `AutoRental`) in JSON-LD format.
- Semantic HTML5 structure (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).
- Valid accessibility standards: WCAG 2.1 AA compliant contrast ratios, descriptive `alt` tags, and visible focus states.

### 4.3. Performance & Asset Optimization
- Fast Time-to-Interactive (TTI) and Largest Contentful Paint (LCP) < 1.5s.
- Clean vector SVGs for brand logo and fallback icons to eliminate missing asset 404s.
- Responsive image delivery with `loading="lazy"` and modern web formats.
- Zero server dependency requirement: can be hosted directly on Cloudflare Pages, GitHub Pages, Netlify, or Apache/Nginx web servers.

---

## 5. Implementation Roadmap
| Phase | Scope | Deliverables |
|---|---|---|
| **Phase 1** | Requirement Specification & Architecture Plan | `REQUIREMENTS.md`, `implementation_plan.md` |
| **Phase 2** | Production Core Web Application | `index.html`, `styles.css`, `app.js` with modern modular code |
| **Phase 3** | Visual Assets & Branding | Embedded high-res SVG brand logo, optimized imagery, favicon |
| **Phase 4** | Interactive Logic & Localization | Rate toggle, WhatsApp link generator, AI planner, 6-language switcher |
| **Phase 5** | Verification & Browser QA | Responsive checks, WhatsApp link verification, language switching QA |
