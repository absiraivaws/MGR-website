/**
 * MANNAR GREEN RIDE (MGR) - MAIN APPLICATION SCRIPT
 */

const SITE_CONFIG = {
  companyName: "Mannar Green Ride",
  phone: "+94 77 657 4418",
  phoneClean: "94776574418",
  email: "mannargreenride@gmail.com",
  location: "Mannar Town, Sri Lanka",
  hostWhatsAppGroupUrl: "https://chat.whatsapp.com/ExampleMannarGreenRideGroup",
  socials: {
    facebook: "https://facebook.com/MannarGreenRide",
    whatsapp: "https://wa.me/94776574418",
    youtube: "https://youtube.com",
    instagram: "https://instagram.com",
    tiktok: "https://tiktok.com"
  }
};

/**
 * Milestone rounding helper (10, 100, 1,000, 10K, 1M...)
 * Formats rounded milestone target and display string
 */
function getMilestoneTarget(rawNum) {
  const n = Number(rawNum) || 0;
  if (n <= 0) return { target: 0, display: "0", isAbbreviated: false };

  const tiers = [
    { threshold: 10, target: 10, display: "10", isAbbreviated: false },
    { threshold: 50, target: 50, display: "50", isAbbreviated: false },
    { threshold: 100, target: 100, display: "100", isAbbreviated: false },
    { threshold: 250, target: 250, display: "250", isAbbreviated: false },
    { threshold: 500, target: 500, display: "500", isAbbreviated: false },
    { threshold: 1000, target: 1000, display: "1,000", isAbbreviated: false },
    { threshold: 2500, target: 2500, display: "2.5K", isAbbreviated: true },
    { threshold: 5000, target: 5000, display: "5K", isAbbreviated: true },
    { threshold: 10000, target: 10000, display: "10K", isAbbreviated: true },
    { threshold: 25000, target: 25000, display: "25K", isAbbreviated: true },
    { threshold: 50000, target: 50000, display: "50K", isAbbreviated: true },
    { threshold: 100000, target: 100000, display: "100K", isAbbreviated: true },
    { threshold: 500000, target: 500000, display: "500K", isAbbreviated: true },
    { threshold: 1000000, target: 1000000, display: "1M", isAbbreviated: true }
  ];

  for (let i = 0; i < tiers.length; i++) {
    if (n <= tiers[i].threshold) {
      return tiers[i];
    }
  }

  const m = Math.ceil(n / 1000000);
  return { target: n, display: `${m}M`, isAbbreviated: true };
}

const STATS_CONFIG = [
  { id: "stat-rides", target: 100, suffix: "+", label: "Completed Rides & Tours", icon: "fa-solid fa-route", key: "completed_services", enabled: true, order: 1 },
  { id: "stat-customers", target: 100, suffix: "+", label: "Happy Riders & Customers", icon: "fa-solid fa-users", key: "total_customers", enabled: true, order: 2 },
  { id: "stat-fleet", target: 50, suffix: "+", label: "Passenger Fleet Vehicles", icon: "fa-solid fa-van-shuttle", key: "registered_vehicles", enabled: true, order: 3 },
  { id: "stat-eco", target: 100, suffix: "%", label: "Fitness & Eco", icon: "fa-solid fa-leaf", key: "fitness_ready", enabled: true, order: 4 }
];

window.STATS_CONFIG = STATS_CONFIG;
let statsAnimated = false;

/**
 * Animated statistics counters triggered on scroll or dynamic database hydration
 */
function renderStats(config, forceAnimate = false) {
  const container = document.getElementById('stats-container');
  if (!container) return;

  let currentConfig = config || window.STATS_CONFIG || STATS_CONFIG;
  if (!Array.isArray(currentConfig)) currentConfig = STATS_CONFIG;

  // Filter enabled and sort by order
  const activeStats = currentConfig
    .filter(item => item.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  window.STATS_CONFIG = activeStats;

  container.innerHTML = activeStats.map((item, idx) => {
    const isMilestone = item.suffix === '+';
    const milestoneInfo = isMilestone ? getMilestoneTarget(item.target) : { target: Number(item.target) || 0, display: String(item.target) };
    const displayVal = statsAnimated && !forceAnimate ? milestoneInfo.display : 0;
    const suffixHtml = item.suffix === '+' 
      ? `<span class="inline-flex items-center text-brand-primary ml-1" style="font-size: 0.72em; vertical-align: middle;" title="Milestone Target"><i class="fa-solid fa-plus font-black"></i></span>`
      : (item.suffix || '');

    const iconHtml = item.image 
      ? `<img src="${item.image}" alt="Icon" class="w-8 h-8 object-contain mx-auto mb-2">`
      : (item.icon ? `<div class="w-9 h-9 mx-auto mb-2 rounded-xl bg-emerald-50 text-brand-primary flex items-center justify-center text-base"><i class="${item.icon}"></i></div>` : '');

    return `
      <div class="p-4 bg-white/80 rounded-2xl border border-emerald-100 shadow-sm backdrop-blur-sm flex flex-col items-center justify-between">
        ${iconHtml}
        <p class="text-3xl sm:text-4xl font-black text-brand-primary tracking-tight flex items-center justify-center">
          <span id="counter-${idx}">${displayVal}</span>${suffixHtml}
        </p>
        <p class="text-xs text-gray-600 uppercase font-bold tracking-wider mt-1 text-center">${item.label || item.title || ''}</p>
      </div>
    `;
  }).join('');

  function runCounterAnimation() {
    activeStats.forEach((item, idx) => {
      const counterEl = document.getElementById(`counter-${idx}`);
      if (!counterEl) return;

      const isMilestone = item.suffix === '+';
      const milestoneInfo = isMilestone ? getMilestoneTarget(item.target) : { target: Number(item.target) || 0, display: String(item.target) };
      const targetVal = milestoneInfo.target;
      if (targetVal <= 0) return;

      let start = 0;
      const step = Math.max(1, Math.floor(targetVal / 40));
      const stepTime = Math.max(15, Math.floor(1000 / (targetVal / step)));

      const timer = setInterval(() => {
        start += step;
        if (start >= targetVal) {
          counterEl.innerText = milestoneInfo.display;
          clearInterval(timer);
        } else {
          counterEl.innerText = milestoneInfo.isAbbreviated ? `${Math.floor(start / 1000)}K` : start;
        }
      }, stepTime);
    });
  }

  if (forceAnimate) {
    statsAnimated = true;
    runCounterAnimation();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsAnimated) {
        statsAnimated = true;
        runCounterAnimation();
      }
    });
  }, { threshold: 0.15 });

  observer.observe(container);
}

/**
 * Global live stats update hook called by CMS bridge
 */
window.renderLiveStats = function(liveStats) {
  if (!liveStats) return;
  const cfg = window.STATS_CONFIG || STATS_CONFIG;
  if (liveStats.completed_services !== undefined && cfg[0]) {
    cfg[0].target = Number(liveStats.completed_services);
  }
  if (liveStats.total_customers !== undefined && cfg[1]) {
    cfg[1].target = Number(liveStats.total_customers);
  }
  if (liveStats.registered_vehicles !== undefined && cfg[2]) {
    cfg[2].target = Number(liveStats.registered_vehicles);
  }
  renderStats(cfg, statsAnimated);
};

/**
 * Dynamic Transport Categories Renderer (Used by CMS Bridge)
 */
function renderTransportCategories(categories) {
  const container = document.getElementById('transport-categories-container');
  if (!container || !Array.isArray(categories) || !categories.length) return;

  const activeCategories = categories
    .filter(cat => cat.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Update grid columns dynamically based on count
  const count = activeCategories.length;
  container.className = `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${Math.min(6, count)} gap-3`;

  container.innerHTML = activeCategories.map(cat => {
    const isPrimary = cat.isPrimary || cat.id === 'cat-bike';
    let badgeText = cat.badge || '';
    if (badgeText && window.CURRENT_CURRENCY && window.CURRENT_CURRENCY.symbol && badgeText.includes('Rs.')) {
      badgeText = badgeText.replace(/Rs\./g, window.CURRENT_CURRENCY.symbol);
    }
    const badgeIdAttr = (cat.id === 'cat-bike' || (cat.name || '').toLowerCase().includes('bicycle')) ? 'id="hero-cat-badge-bike"' : '';
    const badgeHtml = badgeText ? `<span ${badgeIdAttr} class="absolute -top-2.5 right-2 bg-brand-primary text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">${badgeText}</span>` : '';
    const iconClass = cat.icon || 'fa-solid fa-car';
    const colorBg = cat.color ? `bg-${cat.color}-50 text-${cat.color}-600` : 'bg-emerald-50 text-brand-primary';
    // Determine navigation target: Bicycle & Motorcycle go to #pricing-rates, Car, Van, Bus, Boat navigate to https://booking.mannargreenride.com/bicycle-pos/finance
    const nameLower = (cat.name || '').toLowerCase();
    const idLower = (cat.id || '').toLowerCase();
    const isRates = nameLower.includes('bike') || nameLower.includes('bicycle') || nameLower.includes('motorcycle') || nameLower.includes('scooter') || idLower.includes('bike') || idLower.includes('moto');
    
    let targetHref = '#pricing-rates';
    let targetAttr = '';
    let onclickCall = '';

    if (isRates || cat.target_url === '#pricing-rates') {
      targetHref = '#pricing-rates';
      onclickCall = `onclick="preselectVehicle('${(cat.preselect || cat.name).replace(/'/g, "\\'")}', '${(cat.package || 'Hourly Rental').replace(/'/g, "\\'")}', '#pricing-rates')"`;
    } else {
      // Top Booking destination (#booking) maps to online booking finance portal
      targetHref = 'https://booking.mannargreenride.com/bicycle-pos/finance';
      targetAttr = 'target="_blank" rel="noopener noreferrer"';
    }

    return `
      <a href="${targetHref}" ${targetAttr} ${onclickCall} class="category-card bg-white hover:bg-emerald-50 ${borderClass} rounded-2xl p-4 shadow-sm hover:shadow-md transition text-center group card-hover relative">
        ${badgeHtml}
        <div class="w-11 h-11 mx-auto rounded-xl ${colorBg} flex items-center justify-center text-xl group-hover:scale-110 transition">
          <i class="${iconClass}"></i>
        </div>
        <h3 class="text-sm font-bold text-gray-900 mt-2" ${cat.i18n ? `data-i18n="${cat.i18n}"` : ''}>${cat.name}</h3>
        <p class="text-[11px] text-gray-500">${cat.subtext || ''}</p>
      </a>
    `;
  }).join('');
}

/**
 * Review slider speed & autoplay controller
 */
function applyReviewSliderConfig(config) {
  if (!config) return;
  const track = document.getElementById('reviews-marquee-track') || document.querySelector('.animate-marquee');
  const container = document.getElementById('reviews-marquee-container') || document.querySelector('.marquee-scroll-container');

  if (config.speed) {
    const duration = typeof config.speed === 'number' ? `${config.speed}s` : config.speed;
    document.documentElement.style.setProperty('--marquee-speed', duration);
  }

  if (config.auto_slide === false) {
    if (track) track.classList.add('marquee-paused');
    if (container) container.classList.add('manual-scroll');
  } else {
    if (track) track.classList.remove('marquee-paused');
    if (container) container.classList.remove('manual-scroll');
  }
}

window.renderTransportCategories = renderTransportCategories;
window.applyReviewSliderConfig = applyReviewSliderConfig;
window.renderStats = renderStats;

/**
 * Mobile Navigation Drawer Toggle
 */
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

/**
 * Direct WhatsApp Booking Form Handler
 */
function handleBookingSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('book-name')?.value || '';
  const phone = document.getElementById('book-phone')?.value || '';
  const vehicle = document.getElementById('book-vehicle')?.value || '';
  const pkg = document.getElementById('book-package')?.value || '';
  const date = document.getElementById('book-start-date')?.value || '';
  const qty = document.getElementById('book-qty')?.value || '1';
  const notes = document.getElementById('book-notes')?.value || '';

  const text = 
    `*NEW PASSENGER TRANSPORT BOOKING - MANNAR GREEN RIDE*%0A%0A` +
    `👤 *Customer Name:* ${encodeURIComponent(name)}%0A` +
    `📞 *Phone / WhatsApp:* ${encodeURIComponent(phone)}%0A` +
    `🚗 *Vehicle Type:* ${encodeURIComponent(vehicle)}%0A` +
    `⏱️ *Rental Package:* ${encodeURIComponent(pkg)}%0A` +
    `🔢 *Quantity:* ${encodeURIComponent(qty)}%0A` +
    `📅 *Date:* ${encodeURIComponent(date)}%0A` +
    `🏨 *Pickup / Questions:* ${encodeURIComponent(notes || 'None')}%0A%0A` +
    `Sent from Mannar Green Ride Online Portal`;

  const url = `https://wa.me/${SITE_CONFIG.phoneClean}?text=${text}`;
  window.open(url, '_blank');
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  // Current Year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.innerText = new Date().getFullYear();

  // Populate Contact Details from SITE_CONFIG
  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };
  const setElHref = (id, href) => {
    const el = document.getElementById(id);
    if (el) el.href = href;
  };

  setElText('display-phone', SITE_CONFIG.phone);
  setElText('display-email', SITE_CONFIG.email);
  setElText('footer-phone', SITE_CONFIG.phone);
  setElText('footer-email', SITE_CONFIG.email);

  setElHref('host-whatsapp-link', SITE_CONFIG.hostWhatsAppGroupUrl);
  setElHref('floating-wa', `https://wa.me/${SITE_CONFIG.phoneClean}?text=Hi%20Mannar%20Green%20Ride%2C%20I%20would%20like%20to%20inquire%20about%20passenger%20transport%20in%20Mannar.`);
  setElHref('link-fb', SITE_CONFIG.socials.facebook);
  setElHref('link-wa', SITE_CONFIG.socials.whatsapp);
  setElHref('link-yt', SITE_CONFIG.socials.youtube);
  setElHref('link-ig', SITE_CONFIG.socials.instagram);
  setElHref('link-tt', SITE_CONFIG.socials.tiktok);

  // Set min date for booking to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('book-start-date');
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }

  // Render Animated Stats Counters
  renderStats();

  // Initialize Navigation Hover, Active State & Scroll Spy
  initNavigation();

  // Restore saved language or default to 'en'
  let savedLang = 'en';
  try {
    savedLang = localStorage.getItem('mgr_lang') || 'en';
  } catch (e) {}

  if (typeof changeLanguage === 'function') {
    changeLanguage(savedLang);
  }

  // Initialize Floating Action Booking Button (Pulsing Icon & Rotating Text)
  initFloatingBookingButton();
});

/**
 * Header Navigation Active State & Scroll-Spy System
 */
function initNavigation() {
  const sections = [
    { id: 'home', btn: document.getElementById('nav-home') },
    { id: 'services', btn: document.getElementById('nav-services') },
    { id: 'about', btn: document.getElementById('nav-about') },
    { id: 'partner-vehicles', btn: document.getElementById('nav-partner-vehicles') },
    { id: 'ai-planner', btn: document.getElementById('nav-ai-planner') },
    { id: 'contact', btn: document.getElementById('nav-contact') }
  ];

  function setActiveButton(targetId) {
    sections.forEach(item => {
      if (item.btn) {
        if (item.id === targetId) {
          item.btn.classList.add('active');
        } else {
          item.btn.classList.remove('active');
        }
      }
    });
  }

  // Handle direct clicks on desktop and mobile navigation links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href')?.replace('#', '');
      if (targetId && sections.some(s => s.id === targetId)) {
        setActiveButton(targetId);
      }
    });
  });

  // Smooth Scroll-Spy: detect which section is currently centered/active in viewport
  let isThrottled = false;
  window.addEventListener('scroll', () => {
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => { isThrottled = false; }, 80);

    // Near bottom of page: highlight Contact
    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 100)) {
      setActiveButton('contact');
      return;
    }

    const scrollPos = window.scrollY + 140; // accounts for 96px header + buffer
    let activeId = 'home';

    sections.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          activeId = item.id;
        }
      }
    });

    setActiveButton(activeId);
  }, { passive: true });

  // Initial active button based on URL hash
  const initialHash = window.location.hash.replace('#', '') || 'home';
  if (sections.some(s => s.id === initialHash)) {
    setActiveButton(initialHash);
  }
}

/**
 * Floating Action Booking Button
 * - Continuous pulsing icon
 * - Automatically rotating text: "Book Now" -> "Ride Now" -> "Explore Mannar" (Customizable via C-Panel)
 * - Navigates directly to https://booking.mannargreenride.com/
 */
window.FLOATING_BOOKING_PHRASES = ['Book Now', 'Ride Now', 'Explore Mannar'];
let floatingBookingIntervalTimer = null;

function initFloatingBookingButton() {
  const bookingBtn = document.getElementById('floating-booking');
  const textEl = document.getElementById('floating-booking-text');
  if (!bookingBtn || !textEl) return;

  // Check localStorage for CMS configured words/URL
  try {
    const savedConfigStr = localStorage.getItem('mgr_setting_floating_booking_config');
    if (savedConfigStr) {
      const cfg = JSON.parse(savedConfigStr);
      if (cfg.enabled === false) {
        bookingBtn.style.display = 'none';
      }
      if (cfg.target_url) {
        bookingBtn.href = cfg.target_url;
      }
      if (Array.isArray(cfg.words) && cfg.words.length > 0) {
        window.FLOATING_BOOKING_PHRASES = cfg.words;
      }
    }
  } catch (e) {}

  // Function to start/restart rotation
  window.updateFloatingBookingPhrases = function(words, customInterval) {
    if (Array.isArray(words) && words.length > 0) {
      window.FLOATING_BOOKING_PHRASES = words;
    }
    if (floatingBookingIntervalTimer) clearInterval(floatingBookingIntervalTimer);

    let phraseIndex = 0;
    const intervalMs = (customInterval && customInterval > 0) ? customInterval * 1000 : 2600;

    // Set initial text if empty
    if (!textEl.textContent.trim()) {
      textEl.textContent = window.FLOATING_BOOKING_PHRASES[0] || 'Book Now';
    }

    floatingBookingIntervalTimer = setInterval(() => {
      textEl.classList.add('text-fade-out');
      setTimeout(() => {
        const phrases = window.FLOATING_BOOKING_PHRASES || ['Book Now', 'Ride Now', 'Explore Mannar'];
        phraseIndex = (phraseIndex + 1) % phrases.length;
        textEl.textContent = phrases[phraseIndex];
        textEl.classList.remove('text-fade-out');
        textEl.classList.add('text-fade-in');
        void textEl.offsetWidth; // Force reflow
        textEl.classList.remove('text-fade-in');
      }, 300);
    }, intervalMs);
  };

  // Start rotation
  window.updateFloatingBookingPhrases(window.FLOATING_BOOKING_PHRASES, 2.6);

  // Ensure native link navigation to https://booking.mannargreenride.com/
  if (!bookingBtn.getAttribute('href') || bookingBtn.getAttribute('href') === '#booking') {
    bookingBtn.setAttribute('href', 'https://booking.mannargreenride.com/');
  }
  bookingBtn.setAttribute('target', '_blank');
  bookingBtn.setAttribute('rel', 'noopener noreferrer');
}


