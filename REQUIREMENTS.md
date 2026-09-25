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

---

## 6. Active Enhancements & Dynamic Features (September 2026 Roadmap)

### 6.1. Floating Action Booking Button (Item 1 - Implemented)
- **Positioning:** Fixed floating button positioned right above the WhatsApp floating button (`bottom: 84px; right: 24px;` on desktop, `bottom: 80px; right: 20px;` on mobile).
- **Icon Animation:** Continuous pulsing and blinking icon (`fa-calendar-check`) with warm gold accent (`#fef08a`) and outward expanding green pulse ring.
- **Dynamic Text Rotation:** Automatically cycles every 2.6s through three action phrases with smooth vertical slide/fade transitions:
  1. `Book Now`
  2. `Ride Now`
  3. `Explore Mannar`
- **Navigation Behavior:** Clicking navigates directly to `https://booking.mannargreenride.com/` in a new tab with 100% native anchor reliability (no popup blocking).
- **C-Panel Customization:** In C-Panel ➔ Global Settings:
  - Configure rotating words (Word 1, Word 2, Word 3).
  - Configure rotation speed/interval (seconds).
  - Configure navigation target URL (`https://booking.mannargreenride.com/`).
  - Toggle button visibility ON/OFF with live dynamic preview.
- **Accessibility:** Respects `prefers-reduced-motion` media queries.

### 6.2. C Panel Content Editing - WordPress-Style Controls (Item 2 - Implemented & Enhanced)
- **High-Visibility Discoverability in C-Panel:**
  - **Left Sidebar Menu:** Prominently branded with WordPress logo and badge: `WP Content & Images [WP-STYLE]`.
  - **Top Header Bar:** Direct 1-click button: `WP Text & Image Editor` always accessible from any page/tab.
  - **Dashboard Overview:** Featured WordPress Editor banner with direct access button.
  - **Section Quick Navigator:** Top-of-page quick-jump links (`Hero Section`, `Fitness Section`, `About Story`, `Host Network`).
- **Text / Typography Editing Controls:**
  - **Font Size:** Continuous slider (14px–72px) with quick preset chips (`16px SM`, `24px MD`, `32px LG`, `48px XL`, `60px 2XL`) and live pixel badge.
  - **Font Style:** Toggle buttons (`Normal`, `Italic`, `Oblique`).
  - **Font Weight:** Toggle buttons (`400 Regular`, `600 Semibold`, `700 Bold`, `900 Black`).
  - **Text Color:** Native color picker, hex input, and curated brand palette swatches (Emerald, Forest, Charcoal, Sky, Amber, Red).
  - **Alignment:** Visual buttons (`Left`, `Center`, `Right`, `Justify`).
  - **Gradient ("radint"):** Toggleable text gradient with dual color stop pickers (Start/End) and presets (`Emerald`, `Sunset Gold`, `Ocean Cyan`, `Royal Purple`), applied via `-webkit-background-clip: text`.
- **Image Editing Controls:**
  - **Image URL / Source:** Direct editable image URL input with live preview update.
  - **Media Library Integration:** One-click `Media Library` modal to select uploaded images or presets.
  - **Image Size:** Width slider (20%–100%) with quick preset chips (`25%`, `50%`, `75%`, `100%`).
  - **Style:** Visual presets (`Default`, `Elevated Shadow`, `Emerald Glow`, `Glassmorphism Border`).
  - **Border & Radius:** Corner radius slider (0px–48px) with preset chips (`Sharp 0px`, `Rounded 12px`, `Curved 24px`, `Pill 48px`) plus border width and border color pickers.
  - **Padding:** Slider (0px–32px).
  - **Margin / Alignment:** Visual buttons (`Float Left`, `Center Block`, `Float Right`).
  - **Brightness & Blur ("bler"):** Brightness slider (50%–150%) and Blur slider (0px–15px) applied via CSS `filter: brightness(...) blur(...)`.
- **Live C-Panel Preview Canvas:** Instant real-time visual feedback canvas inside each C-Panel card responding to all slider, button, image URL, and color changes.
- **Persistence & Website Synchronization:** Saves to Supabase `website_settings.content_styling_config` and `localStorage`, dynamically rendered on the live website by `js/cms-bridge.js`.

### 6.3. Offer Section Animation (Item 3 - Implemented)
- **Location:**
  - C-Panel ➔ Promotions & Offers (`admin/index.html` ➔ Promotions & Offers).
  - Also mirrored in C-Panel ➔ Global Settings (`admin/index.html` ➔ Global Settings).
- **Master Animation Toggle:**
  - Instant ON / OFF master switch (`[ON] Animation Active` / `[OFF] Animation Disabled`).
  - When disabled, banner displays cleanly without motion or distraction.
- **Animation Style Presets:**
  - `all-combined`: **All-in-One Showcase** (Liquid shimmer sweep + Breathing golden emerald glow + Heartbeat badge pulse + CTA button float & gift icon wobble).
  - `shimmer-wave`: **Shimmer Wave Only** (Continuous reflective light streak sweeping across the promotional ribbon).
  - `pulse-glow`: **Breathing Glow Aura** (Ambient pulsating golden-emerald glow along banner borders).
  - `bounce-cta`: **Vibrant CTA Bounce** (Micro-bounce and gift icon wobble on the action elements).
- **Cycle Speeds:**
  - `Fast (1.8s)`
  - `Standard (3.2s)`
  - `Relaxed (5.0s)`
- **Sub-element Toggles:**
  - Toggle discount badge heartbeat pulse & golden sparkle halo.
  - Toggle CTA button nudge & gift icon wobble.
- **Live C-Panel Interactive Preview:**
  - Embedded real-time replica banner inside C-Panel card responding dynamically to style, speed, and toggle changes.
- **Live Website Integration:**
  - Applied to `#promo-offer-banner`, `#promo-discount-badge`, and `#promo-offer-btn` via `js/cms-bridge.js`.
  - Persisted in Supabase `website_settings.offer_animation_config` and `localStorage`.
  - Fully accessible, pausing animations when `prefers-reduced-motion` is detected.

### 6.4. Transport Category Navigation Updates (Item 4 - Implemented)
- **Navigation Destination Routing:**
  - **Car:** Navigates directly to `https://booking.mannargreenride.com/bicycle-pos/finance` in a new tab.
  - **Van:** Navigates directly to `https://booking.mannargreenride.com/bicycle-pos/finance` in a new tab.
  - **Tourist Bus:** Navigates directly to `https://booking.mannargreenride.com/bicycle-pos/finance` in a new tab.
  - **Boat:** Navigates directly to `https://booking.mannargreenride.com/bicycle-pos/finance` in a new tab.
  - **Bicycle:** Continues to navigate smoothly to `#pricing-rates` (Rates / Pricing Matrix section).
  - **Motorcycle:** Continues to navigate smoothly to `#pricing-rates` (Rates / Pricing Matrix section).
- **C-Panel Transport Categories Management Table Display:**
  - Available under C-Panel ➔ Transport Categories (`admin/index.html` ➔ Categories).
  - The **Target Navigation** column explicitly displays:
    - `Bicycle ➔ Rates Matrix (#pricing-rates)`
    - `Motorcycle ➔ Rates Matrix (#pricing-rates)`
    - `Car ➔ Top Booking (#booking)`
    - `Van ➔ Top Booking (#booking)`
    - `Tourist Bus ➔ Top Booking (#booking)`
    - `Boat ➔ Top Booking (#booking)`
  - Includes modal dropdown to configure destination between Top Booking (`#booking`) and Rates Matrix (`#pricing-rates`).

### 6.5. Hero Multi-Image Slider & Carousel Engine (Item 5 - Implemented)
- **Live Hero Carousel on Front Website:**
  - Integrated widescreen hero carousel container (`#hero-slider-wrapper`) into the Hero section between the action buttons and metrics counter grid.
  - Interactive previous/next navigation buttons (`#hero-slider-prev`, `#hero-slider-next`) with hover elevation.
  - Indicator dots (`#hero-slider-dots`) showing the active slide and total slide count.
  - Caption overlay (`#hero-slider-caption`) dynamically presenting active slide title and subtitle.
  - Auto-sliding playback engine with customizable transition interval (default 4 seconds) and hover-to-pause protection.
- **Admin C-Panel Multi-Image Management:**
  - Accessible under **WP Content & Sliders** ➔ **Hero Banner & Main Headline** via the dedicated **Multi-Image Slider** tab.
  - Dynamic slide card list displaying:
    - Slide index & total indicator (e.g. `Slide 1 of 3`).
    - Real-time thumbnail preview.
    - Image URL input with instant preview replacement.
    - Media Library selector integration (`Choose from Media Library`).
    - Slide headline and subtitle inputs.
    - **Move Up** and **Move Down** buttons to reorder slide sequence.
    - **Delete** button to remove individual slides (protects minimum 1 slide).
  - "➕ Add Slide Image" buttons (both top and bottom) to add multiple slides with instant preview feedback.
  - Auto-slide toggle (Enable / Disable) and interval selector (2.5s, 3.5s, 4s, 5s, 6s).
  - **Live Interactive Preview Carousel:** Renders a fully functional mini-slider in the admin preview canvas, with next/prev buttons and dots to test slide order and captions.
  - Immediate single-image synchronization: Changing the hero image URL in either the "Images & Blur" tab or the Multi-Image Slider immediately replaces the previous image across all controls and live preview.
  - Persisted to Supabase `website_settings.hero_slider_config` and `localStorage.mgr_setting_hero_slider_config`.

### 6.6. Admin C-Panel Duplicate Functions Cleanup (Development Specification Alignment)
- Reorganized sidebar navigation to match `MGR_WEBSITE_BACKEND_CMS_DEVELOPMENT.md` Section 6 into 5 clean categories:
  - *Core Navigation* (Dashboard)
  - *Website Content & Media* (WP Content & Sliders, Media Library & Gallery)
  - *Fleet & Business Information* (Transport Categories, Services & Rates, Statistics Counters)
  - *Marketing & Community* (Offers & Deals, Blog & Guides, Rider Testimonials, AI Travel Assistant)
  - *Configuration & Launch* (Launch Ceremony, SEO & Keywords, Language Manager, Global Settings)
- Removed redundant/duplicate sidebar navigation tabs (`host-network`, `fitness-cards`, `about-cards`) that duplicated cards inside "WP Content & Sliders".
- Re-routed legacy tab requests in `switchTab()` to automatically switch to the unified `content` view and smoothly scroll to the relevant section card (`#join-editor-card`, `#fitness-editor-card`, `#about-editor-card`).

### 6.7. Currency Symbol & Pricing Format Management (Item 6 - Implemented)
- **C-Panel Global Settings Controls:**
  - Located under C-Panel ➔ Global Settings (`admin/index.html` ➔ Global Settings).
  - **Preset Currencies:** Quick 1-click presets for `Rs.` (Default Sri Lankan Rupee), `LKR` (ISO Code), `$` (USD), `€` (EUR), `£` (GBP), plus `Custom Symbol / Code` for international flexibility.
  - **Symbol Placement:** Toggle between `Prefix` (e.g. `Rs. 100`, `$100`) and `Suffix` (e.g. `100 LKR`, `100 Rs.`).
  - **Currency ISO Code:** Custom ISO 4217 currency code specification (e.g. `LKR`, `USD`, `EUR`).
  - **Live Dynamic Preview Canvas:** Embedded real-time interactive preview badge and sample rates banner responding instantly to preset and placement changes.
  - **Persistence:** Persists to Supabase `website_settings.currency_config` and `localStorage.mgr_setting_currency_config`.
- **Full Public Website Synchronization:**
  - **Rates Matrix Section:** Duration rate cards (Hourly, Half-Day, Full-Day) for Bicycle, Motorcycle, and Cars dynamically render using the configured currency symbol and placement.
  - **Fleet & Services Listings:** Fleet card rates display dynamically formatted (e.g. `From Rs. 100/hr` or `From $ 100/hr`).
  - **Hero Category Badges:** Bicycle badge automatically reflects the selected currency symbol.
  - **C-Panel Services & Duration Matrix:** Table column headers (`Display Rate (Rs.)`), service rows, and duration rates column headers dynamically adapt to the active currency.

### 6.8. Hero Slider Repositioning, Section Positioning & Background Customization (Implemented)
- **1. Hero Slider Repositioning:**
  - Relocated the widescreen multi-image slider (`#hero-slider-wrapper`) directly underneath the subheadline `"Eco-Friendly Passenger Transport & Rentals in Mannar"` (`#hero-headlines-container`).
  - The visual hierarchy now flows seamlessly:
    1. Tagline badge (`#hero-badge-container`)
    2. Main headline & subheadline (`#hero-headlines-container`)
    3. Multi-image sliding carousel (`#hero-slider-wrapper`)
    4. Vehicle category selector pill buttons (`#hero-categories-wrapper`)
    5. Descriptive lead paragraph (`#hero-desc-container`)
    6. Primary action buttons (`#hero-actions-container`)
- **2. Hero Details Positioning & Spacing (Top, Bottom, Left, Right):**
  - Added visual WordPress/Elementor-style layout positioning controls in C-Panel under **WP Content & Sliders ➔ Hero Banner & Main Headline ➔ Background & Layout**:
    - **Details Alignment:** Left, Center, Right with dedicated toggle buttons and live layout adjustment.
    - **Top Spacing (Padding Top):** Slider (20px–220px) with quick-access preset chips (`40px`, `80px Std`, `120px`, `160px`).
    - **Bottom Spacing (Padding Bottom):** Slider (20px–220px) with quick-access preset chips (`40px`, `80px Std`, `120px`, `160px`).
    - **Left & Right Inset (Padding X):** Slider (12px–80px) with quick-access chips (`16px Compact`, `24px Standard`, `36px Wide`, `48px Relaxed`).
    - **Max Container Width:** Configurable dropdown (`1100px - Focused`, `1280px - Default Standard`, `1440px - Wide Screen`, `100% - Full Width`).
- **3. Hero Background Image & Theme Color Controls:**
  - Added background mode selection:
    - **Default Gradient:** Clean, polished light-green gradient.
    - **Theme / Solid Color:** Native color picker and hex code input with quick-select palette chips (`Mint Soft Light #f0fdf4`, `Emerald Dark #064e3b`, `Slate Midnight #0f172a`, `Pure White #ffffff`, `Eco Pale Green #ecfdf5`, `Charcoal Dark #1e293b`).
    - **Background Image:** Image URL input, direct integration with the CMS Media Library picker, scenic Mannar presets (`Coastal Causeway`, `Lagoon & Dunes`, `Eco Flamingo Sanctuary`, `Mannar Sunset`), background position selector (`Center`, `Top`, `Bottom`), and scroll attachment (`Normal Scroll`, `Fixed / Parallax`).
    - **Overlay Tint & Opacity:** Configurable overlay tint color and opacity slider (0%–90%) ensuring high readability and contrast when using photo backgrounds or dark colors.
    - **Automatic Text Contrast Mode:** Auto-detects dark backgrounds to render high-contrast white headlines with subtle dropshadows, or allows forcing light/dark text.
- **4. Live Interactive Preview & Persistence:**
  - Real-time preview canvas inside C-Panel instantly reflects background images, theme colors, dimmer overlays, padding, and text alignments without reloading.
  - Persisted to Supabase `website_settings.hero_layout_config` and `localStorage.mgr_setting_hero_layout_config`.
  - Automatically applied to the live website by `js/cms-bridge.js`.

### 6.9. Hero Image Clarity, Sizing & Ambient Backdrop (Implemented)
- **1. Image Sizing & Dimensions Specifications Banner in Admin C-Panel:**
  - Added a dedicated guidance banner in **WP Content & Sliders ➔ Hero Banner & Main Headline ➔ Multi-Image Slider**:
    - **Recommended Dimensions:** `1920 × 1080 px` (Standard 16:9 Full HD) or `1920 × 800 px` (Panoramic Ultra-Wide).
    - **Original Display Mode Guarantee:** 100% full uncropped view ("not 80%"), preserving crisp high-resolution photo quality without artificial squishing or top/bottom cropping.
    - **Ambient Background Technology:** Solves letterbox margins dynamically when photos have different aspect ratios, keeping text, vehicles, and logos 100% visible and sharp.
- **2. Display & Sizing Controls:**
  - **Image Fit Mode (`fit_mode`):**
    - `contain`: Full original image uncropped with ambient backdrop (Recommended - 100% clarity).
    - `cover`: Edge-to-edge fill with border cropping.
  - **Slider Height (`slider_height`):** Range slider (300px–650px) with live value display and quick preset chips (`380px`, `440px`, `480px Std`, `540px`, `600px`).
  - **Container Width (`slider_width`):** Select options (`1280px Standard Centered`, `100% Full Width`, `1440px Wide Desktop`, `1024px Compact`).
  - **Ambient Backdrop Style (`ambient_bg` & `bg_style`):**
    - Master toggle for ambient glow.
    - Style presets: `Dynamic Ambient Glow (Apple/YouTube blurred reflection)`, `Sleek Deep Dark (#0f172a)`, `Mannar Deep Emerald (#022c22)`, and `Transparent / Neutral`.
- **3. Frontend Website & C-Panel Live Preview Engine:**
  - Updated `index.html`, `css/styles.css`, and `js/cms-bridge.js` to render `.hero-slide-bg-blur` and `.hero-slide-main-img`.
  - C-Panel interactive preview canvas matches frontend display in real time with ambient blur and fit mode badge.
  - Persisted to Supabase `website_settings.hero_slider_config` and `localStorage.mgr_setting_hero_slider_config`.

### 6.10. Complete Launch Ceremony Text Customization (Implemented)
- **Full Text Editing via Admin C-Panel:**
  - Added comprehensive form controls under **Configuration & Launch ➔ Launch Ceremony** (`admin/index.html?tab=launch-ceremony`):
    1. **Government / Official Approval Pill:** Upper badge text next to the Sri Lankan emblem shield (e.g. `Govt. Approved Tourist Transport Service`).
    2. **Brand Title (Golden Text):** Golden headline title (e.g. `MANNAR GREEN RIDE`).
    3. **Brand Subtitle / Rollout Tag:** Sub-badge underneath brand title (e.g. `Official Inauguration & Public Rollout`).
    4. **Stage Inaugural Badge Tag:** Tag above main heading (e.g. `STATE INAUGURAL CEREMONY • MANNAR DISTRICT`).
    5. **Ceremony Main Heading:** Primary large typography headline (e.g. `Empowering Mannar with Eco-Friendly Transport`).
    6. **Project Mission & Purpose Subtitle:** Descriptive paragraph highlighting rollout significance.
    7. **Dignitary Inauguration Dedication:** Golden plaque dedication recognizing the Government Agent & distinguished guests.
    8. **Central Launch Button Text:** Main label on the central circular touch sensor (e.g. `TOUCH TO INAUGURATE`).
    9. **Touch Action Instruction Hint:** Helper instruction underneath launch button (e.g. `Press and hold for 2.5 seconds to unlock`).
    10. **Countdown Progress Banner Text:** Banner displayed while the digital countdown is ticking down (e.g. `OFFICIAL PUBLIC DEPLOYMENT COMMENCING`).
    11. **Celebration Victory Headline:** Giant congratulatory headline unveiled after countdown (e.g. `MANNAR GREEN RIDE IS NOW OFFICIALLY LAUNCHED!`).
    12. **Celebration Subtitle / Impact Message:** Mission message accompanying the celebration screen.
    13. **Website Enter Button Label:** Action button transitioning visitors into the live website (e.g. `ENTER OFFICIAL PORTAL`).
- **Live Website Hydration & Persistence:**
  - Added dedicated semantic IDs in `index.html` for all 13 text elements (`#ga-govt-tag`, `#ga-brand-title`, `#ga-brand-subtitle`, `#ga-ceremony-badge-text`, `#ga-ceremony-heading`, `#ga-ceremony-desc`, `#ga-ceremony-guest-badge`, `#ga-launch-btn-text`, `#ga-touch-hint-text`, `#ga-countdown-status`, `#ga-celebration-title`, `#ga-celebration-sub`, `#ga-enter-btn-text`).
  - Synced dynamically in `js/cms-bridge.js` upon page load.
  - Persisted to Supabase `website_settings.launch_ceremony_config` and `localStorage.mgr_setting_launch_ceremony_config`.

### 6.11. System Optimization & Incremental Roadmap Items
1. **Hero Section Responsive Images** (Completed & Verified on Localhost:8000)
2. **Browser Forward / Backward Navigation & Refresh Hardcoded Image Override Prevention** (Completed & Verified on Localhost:8000)
3. **Offer Image / Video Management & Capacity Guidance** (Completed & Verified on Localhost:8000)
4. **Ride for Health, Ride for the Planet Synchronization** (Completed & Verified on Localhost:8000)
5. **WordPress Content Controls – Fitness Heading & Dual Images** (Completed & Verified on Localhost:8000)
6. **Data Persistence & Verified Error Handling** (Completed & Verified on Localhost:8000)

### 6.12. Hero Section Responsive Images & Dynamic Aspect Ratio Scaling (Implemented)
- **1. Fluid Responsive Height & Dynamic Aspect Ratio Engine:**
  - Migrated `#hero-slider` from rigid fixed inline heights to a CSS custom variable `--hero-slider-h` combined with dynamic `aspect-ratio: 16 / 9` rules:
    - **Desktop (min-width: 1025px):** Adopts `--hero-slider-h` (default 480px or CMS configured value) with safe upper bounds (`calc(var(--hero-slider-h) + 40px)`).
    - **Tablet (641px – 1024px):** Dynamic fluid height calculated via `aspect-ratio: 16 / 9` with clamp bounds (`min-height: 260px`, `max-height: min(460px, 55vh)`), maintaining natural photo proportions across iPad/tablets.
    - **Mobile (max-width: 640px):** Dynamic fluid height via `aspect-ratio: 16 / 9` with bounds (`min-height: 200px`, `max-height: min(340px, 52vh)`), eliminating severe letterboxing and edge cut-offs.
    - **Compact Mobile (max-width: 420px):** Sized with `aspect-ratio: 16 / 9.5` (`min-height: 185px`, `max-height: min(290px, 48vh)`).
    - **Landscape Mode Protection:** Dynamic constraint `max-height: 65vh; aspect-ratio: 16 / 7.5` preventing vertical screen clipping on rotated handheld devices.
- **2. Full Image Visibility & Centering Guarantee:**
  - Configured `.hero-slide-main-img` with `object-fit: contain; object-position: center center; max-width: 100%; max-height: 100%;` ensuring 100% of the image is completely visible without cropping on any screen ratio.
  - In `fit-cover` mode, dynamic 16:9 container aspect ratio matches standard banner dimensions to eliminate artificial vertical or horizontal cropping.
  - Retained ambient blurred backdrop (`.hero-slide-bg-blur`) to frame photos smoothly.
- **3. Mobile & Tablet Touch Swipe Navigation:**
  - Integrated native `touchstart`, `touchmove`, and `touchend` swipe gesture handling in `js/cms-bridge.js`.
  - Enabled swipe-left for next slide and swipe-right for previous slide with smooth threshold detection.
  - Styled navigation controls on touch screens with touch targets and persistent opacity (`opacity: 0.85`), eliminating dependency on desktop hover states.
- **4. Background Image Mobile Compatibility:**
  - Configured mobile/tablet override (`background-attachment: scroll !important; background-position: center center !important;`) on `#home` to prevent mobile browser fixed-attachment scaling artifacts.
- **5. Admin Guidance Update:**
  - Added "Mobile & Tablet Ready (Dynamic 16:9 Scale)" specification card inside the C-Panel Hero Multi-Image Slider guidance banner.

### 6.13. Browser Forward / Backward Navigation & Instant Synchronous Image Pre-Hydration (Implemented)
- **1. Instant Synchronous Image Pre-Hydration on Refresh:**
  - Embedded an early execution pre-hydration script in `<head>` of `index.html` to instantly read `localStorage` (`mgr_setting_fitness_section_images`, `mgr_setting_content_styling_config`, `mgr_setting_hero_slider_config`) before the browser finishes rendering HTML.
  - Completely eliminates the flash or retention of fallback Unsplash placeholder images when users refresh the website.
  - Added `applySynchronousPreHydration()` into `js/cms-bridge.js` to immediately apply all stored settings in memory with 0ms delay.
  - Added missing keys (`fitness_section_images`, `launch_ceremony_config`) to the runtime settings overlay map.
- **2. Public Website Process Flows & Browser History (`js/app.js` & `js/calculator.js`):**
  - Integrated `history.pushState` on all page section jumps (`#home`, `#services`, `#pricing-rates`, `#about`, `#partner-vehicles`, `#ai-planner`, `#contact`, `#booking`).
  - Added `popstate` event listener restoring exact scroll target, active nav header buttons, and selected vehicle/package dropdown states when user clicks browser **Back** or **Forward**.
  - Configured `html { scroll-behavior: smooth; scroll-padding-top: 100px; }` in `css/styles.css` ensuring targets clear the fixed 96px header properly.
- **3. Admin C-Panel Navigation & Deep-Linking (`admin/js/admin.js`):**
  - Updated `switchTab(tabName, pushToHistory = true)` to push history state (`history.pushState({ tab: tabName }, '', '#' + tabName)`).
  - Added `popstate` listener allowing admins to navigate smoothly backward and forward between CMS views (e.g. Dashboard ➔ WP Content ➔ Offers ➔ Services ➔ Dashboard).
  - Configured modal history tracking in `openModal(modalId)`: pressing the browser Back button cleanly dismisses open modals instead of ejecting the admin from the panel.
  - Handled initial deep linking in `init()`: refreshing on any URL hash (e.g. `admin/#offers`) or `?tab=...` directly opens and restores that exact view.

### 6.14. Offer Image / Video Management & Capacity Guidance (Implemented)
- **1. Dimension Guidance & Capacity Rules (Add/Edit Offer Modals):**
  - Added a dedicated guidance banner inside both `#add-offer-modal` and `#edit-offer-modal`:
    - **1200 × 675 px (16:9):** Standard horizontal desktop & tablet promotional banner.
    - **1080 × 1350 px (4:5):** Vertical mobile/Instagram feed format.
    - **1920 × 1080 px (16:9):** Full HD promotional video (MP4/WebM/YouTube/Vimeo).
    - **File Capacity Limits:** Maximum 10MB for static imagery, 50MB for video assets.
- **2. Interactive Media Controller & Live Preview Container:**
  - Multi-input media management: Direct image/video URL input, direct local file upload with auto-upload to Supabase storage bucket (`website-media`), Media Library asset picker, and instant removal button.
  - Responsive 16:9 live preview container (`#offer-media-preview-box` & `#edit-offer-media-preview-box`) supporting images, HTML5 video player, and YouTube embed detection.
- **3. Admin Offers Table Media Preview Column:**
  - Added a dedicated `Media` column to the Offers table with interactive media preview thumbnails and badge buttons (`previewOfferMediaModal(url, title)`).
- **4. Website Frontend Offer Media Lightbox:**
  - Updated `js/cms-bridge.js` to render interactive "Watch Promo Video" or "View Deal Media" pill buttons in the `#promo-offer-banner`.
  - Added `showOfferMediaModal(offer)`: a full-featured modal lightbox for public visitors with responsive video player and high-res image view.

### 6.15. WordPress Content Controls – Fitness Heading & Dual Images (Implemented)
- **1. Dual Independent Image Controls (`renderWpFitnessDualImageControls`):**
  - Added separate, dedicated Gutenberg/Elementor style controls for both **Image 1: Cycling Fitness in Mannar** and **Image 2: Tourist Adventure** under C-Panel *WordPress Content Controls (Fitness Heading & Images)*.
  - Smooth sub-tab switching between Image 1 and Image 2 without page reload.
  - For each image:
    - Source URL input, Media Library picker, local image file uploader with auto-storage integration, and one-click reset to authentic default image.
    - Alt text input for accessibility and SEO.
    - Sizing slider (20% – 100% width) with quick preset chips (25%, 50%, 75%, 100% Full).
    - Image style & elevation button group (Default, Elevated shadow, Glow, Glassmorphism).
    - Margin alignment button group (Left, Center, Right).
    - Border radius slider (0 – 48px) with quick chips (Sharp 0px, Rounded 12px, Curved 24px, Pill 48px), border width (0 – 10px), and hex border color picker.
    - Spacing padding slider (0 – 32px), Brightness slider (50% – 150%), and Blur filter slider (0 – 15px).
- **2. Real-Time Interactive Dual-Image Preview Canvas (`#wp-fitness-preview-box`):**
  - Side-by-side interactive preview rendering Image 1 (`#wp-fitness-preview-img1`) and Image 2 (`#wp-fitness-preview-img2`) with live typography headline preview.
  - Instant visual feedback on every slider movement, button click, or URL change.
- **3. Dual Persistence & Cross-Tab Synchronization:**
  - Saving via `saveWpSectionStyle('fitness')` atomically persists both `content_styling_config` (containing full styling attributes for both images) and `fitness_section_images` (`{ img1, img2 }`) in Supabase `website_settings`.
  - Automatically synchronizes with the `fitness-cards` tab inputs (`#fitness-img1-input`, `#fitness-img2-input`, `#fitness-img1-preview`, `#fitness-img2-preview`).
  - Saving in the `fitness-cards` tab via `handleSaveFitnessImages()` similarly updates `content_styling_config` and updates the WordPress dual image inputs.
  - Instantly broadcasts updates to public website tabs via `BroadcastChannel('mgr_cms_updates')` and `localStorage`, updating the live site without page reload.
- **4. Elimination of Hardcoded Unsplash Refresh Flashes:**
  - Replaced all Unsplash fallback URLs in `index.html` (#fitness-img-1, #fitness-img-2, #about-img, #hero-slider-track, #ga-front-image) with authentic Google Drive images.
  - Replaced all C-Panel fallbacks in `admin/js/admin.js` with the authentic Google Drive image URLs.
  - Synchronous inline pre-hydration script in `<head>` and directly after image tags ensures 0ms delay with zero flash of placeholder imagery on refresh.

### 6.16. Cross-Module Data Persistence & Verified Error Handling (Implemented)
- **1. Strict Supabase Error Trapping & Reporting:**
  - Audited and updated `saveSettingsItem`, `batchSaveSettings`, and `saveSection` in `admin/js/admin.js`:
    - Checks `{ error }` returned from Supabase client operations (`upsert`, `update`, `insert`).
    - Explicitly throws descriptive errors upon failure rather than silently failing and triggering misleading success toasts.
    - Logs detailed error context to the developer console and displays error toasts to the administrator.
- **2. Multi-Tiered Storage Reliability:**
  - First tier: Supabase PostgreSQL cloud database (`website_settings`, `website_sections`, `website_offers`).
  - Second tier: Local browser storage (`localStorage.mgr_setting_*`) for instant client-side offline hydration and zero-latency page loads.
  - Third tier: Real-time broadcast channel (`BroadcastChannel('mgr_cms_updates')`) for immediate cross-tab live synchronization.



