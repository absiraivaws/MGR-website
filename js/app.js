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
  { target: 68, suffix: "+", label: "Completed Rides & Tours", key: "completed_services" },
  { target: 86, suffix: "+", label: "Happy Riders & Customers", key: "total_customers" },
  { target: 12, suffix: "+", label: "Passenger Fleet Vehicles", key: "registered_vehicles" },
  { target: 100, suffix: "%", label: "Fitness & Eco Friendly", key: "fitness_ready" }
];

window.STATS_CONFIG = STATS_CONFIG;
let statsAnimated = false;

/**
 * Animated statistics counters triggered on scroll or dynamic database hydration
 */
function renderStats(config, forceAnimate = false) {
  const container = document.getElementById('stats-container');
  if (!container) return;

  const currentConfig = config || window.STATS_CONFIG || STATS_CONFIG;
  window.STATS_CONFIG = currentConfig;

  container.innerHTML = currentConfig.map((item, idx) => {
    const isMilestone = item.suffix === '+';
    const milestoneInfo = isMilestone ? getMilestoneTarget(item.target) : { target: Number(item.target) || 0, display: String(item.target) };
    const displayVal = statsAnimated && !forceAnimate ? milestoneInfo.display : 0;
    const suffixHtml = item.suffix === '+' 
      ? `<span class="inline-flex items-center text-brand-primary ml-1" style="font-size: 0.72em; vertical-align: middle;" title="Milestone Target"><i class="fa-solid fa-plus font-black"></i></span>`
      : item.suffix;

    return `
      <div class="p-4 bg-white/70 rounded-2xl border border-emerald-100 shadow-sm backdrop-blur-sm">
        <p class="text-3xl sm:text-4xl font-black text-brand-primary tracking-tight flex items-center justify-center">
          <span id="counter-${idx}">${displayVal}</span>${suffixHtml}
        </p>
        <p class="text-xs text-gray-600 uppercase font-bold tracking-wider mt-1 text-center">${item.label}</p>
      </div>
    `;
  }).join('');

  function runCounterAnimation() {
    currentConfig.forEach((item, idx) => {
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
