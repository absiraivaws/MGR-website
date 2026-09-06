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

const STATS_CONFIG = [
  { target: 100, suffix: "%", label: "Fitness Ready" },
  { target: 50,  suffix: "+", label: "Local Passenger Fleet" },
  { target: 24,  suffix: "/7", label: "Customer Support" },
  { target: 6,   suffix: "+", label: "Languages Supported" }
];

let statsAnimated = false;

/**
 * Animated statistics counters triggered on scroll
 */
function renderStats() {
  const container = document.getElementById('stats-container');
  if (!container) return;

  container.innerHTML = STATS_CONFIG.map((item, idx) => `
    <div class="p-4 bg-white/70 rounded-2xl border border-emerald-100 shadow-sm backdrop-blur-sm">
      <p class="text-3xl sm:text-4xl font-black text-brand-primary tracking-tight">
        <span id="counter-${idx}">0</span>${item.suffix}
      </p>
      <p class="text-xs text-gray-600 uppercase font-bold tracking-wider mt-1">${item.label}</p>
    </div>
  `).join('');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsAnimated) {
        statsAnimated = true;
        STATS_CONFIG.forEach((item, idx) => {
          let start = 0;
          const stepTime = Math.max(10, Math.floor(1400 / item.target));
          const counterEl = document.getElementById(`counter-${idx}`);
          if (!counterEl) return;
          const timer = setInterval(() => {
            start += 1;
            counterEl.innerText = start;
            if (start >= item.target) {
              counterEl.innerText = item.target;
              clearInterval(timer);
            }
          }, stepTime);
        });
      }
    });
  }, { threshold: 0.2 });

  observer.observe(container);
}

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
