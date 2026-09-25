// Active Currency Configuration (Configurable via Admin C-Panel Global Settings)
window.CURRENT_CURRENCY = {
  symbol: "Rs.",
  code: "LKR",
  position: "prefix" // 'prefix' (e.g. Rs. 100, $100) or 'suffix' (e.g. 100 LKR)
};

// Check localStorage for CMS cached currency
try {
  const cachedCurr = localStorage.getItem('mgr_setting_currency_config');
  if (cachedCurr) {
    const parsedCurr = JSON.parse(cachedCurr);
    if (parsedCurr && parsedCurr.symbol) {
      window.CURRENT_CURRENCY = { ...window.CURRENT_CURRENCY, ...parsedCurr };
    }
  }
} catch (e) {}

// Raw Numeric Duration Pricing Matrix
window.RAW_PRICING_MATRIX = {
  hourly: { bicycle: 100, moto: 500, car: 1500 },
  halfday: { bicycle: 400, moto: 1800, car: 5000 },
  fullday: { bicycle: 800, moto: 3500, car: 9500 }
};

/**
 * Format a rental price with active currency symbol and placement
 */
window.formatRentalPrice = function(amount, isStartingFrom = false) {
  const curr = window.CURRENT_CURRENCY || { symbol: "Rs.", code: "LKR", position: "prefix" };
  const num = Number(amount || 0);
  const numStr = isNaN(num) ? String(amount) : num.toLocaleString();
  const fromPrefix = isStartingFrom ? 'From ' : '';
  
  if (curr.position === 'suffix') {
    return `${fromPrefix}${numStr} ${curr.symbol}`;
  }
  return `${fromPrefix}${curr.symbol} ${numStr}`;
};

const PRICING_CONFIG = {
  hourly: {
    bicycle: window.formatRentalPrice(100),
    bicycleUnit: "/ per hour",
    moto: window.formatRentalPrice(500),
    motoUnit: "/ per hour",
    car: window.formatRentalPrice(1500, true),
    carUnit: "/ per hour"
  },
  halfday: {
    bicycle: window.formatRentalPrice(400),
    bicycleUnit: "/ 4-5 hours",
    moto: window.formatRentalPrice(1800),
    motoUnit: "/ 4-5 hours",
    car: window.formatRentalPrice(5000, true),
    carUnit: "/ 4-5 hours"
  },
  fullday: {
    bicycle: window.formatRentalPrice(800),
    bicycleUnit: "/ 24 hours",
    moto: window.formatRentalPrice(3500),
    motoUnit: "/ 24 hours",
    car: window.formatRentalPrice(9500, true),
    carUnit: "/ 24 hours"
  }
};

window.PRICING_CONFIG = PRICING_CONFIG;

/**
 * Update PRICING_CONFIG with new currency and/or matrix values, then re-render cards
 */
window.applyCurrencyToPricing = function(currencyConfig, newMatrix) {
  if (currencyConfig && typeof currencyConfig === 'object') {
    window.CURRENT_CURRENCY = { ...window.CURRENT_CURRENCY, ...currencyConfig };
  }
  if (newMatrix && typeof newMatrix === 'object') {
    window.RAW_PRICING_MATRIX = { ...window.RAW_PRICING_MATRIX, ...newMatrix };
  }

  const raw = window.RAW_PRICING_MATRIX;
  if (raw && window.PRICING_CONFIG) {
    if (raw.hourly) {
      window.PRICING_CONFIG.hourly.bicycle = window.formatRentalPrice(raw.hourly.bicycle);
      window.PRICING_CONFIG.hourly.moto = window.formatRentalPrice(raw.hourly.moto);
      window.PRICING_CONFIG.hourly.car = window.formatRentalPrice(raw.hourly.car, true);
    }
    if (raw.halfday) {
      window.PRICING_CONFIG.halfday.bicycle = window.formatRentalPrice(raw.halfday.bicycle);
      window.PRICING_CONFIG.halfday.moto = window.formatRentalPrice(raw.halfday.moto);
      window.PRICING_CONFIG.halfday.car = window.formatRentalPrice(raw.halfday.car, true);
    }
    if (raw.fullday) {
      window.PRICING_CONFIG.fullday.bicycle = window.formatRentalPrice(raw.fullday.bicycle);
      window.PRICING_CONFIG.fullday.moto = window.formatRentalPrice(raw.fullday.moto);
      window.PRICING_CONFIG.fullday.car = window.formatRentalPrice(raw.fullday.car, true);
    }
  }

  // Update Hero Bicycle badge if present
  const heroBikeBadge = document.getElementById('hero-cat-badge-bike');
  if (heroBikeBadge) {
    heroBikeBadge.textContent = `${window.formatRentalPrice(raw?.hourly?.bicycle || 100)}/hr`;
  }

  // Refresh active duration view
  if (typeof switchPricingDuration === 'function') {
    switchPricingDuration(currentDurationTab || 'hourly');
  }
};

let currentDurationTab = 'hourly';

/**
 * Switch pricing duration cards between hourly, halfday, fullday
 */
/**
 * Switch pricing duration cards between hourly, halfday, fullday
 */
function switchPricingDuration(duration) {
  currentDurationTab = duration;
  ['hourly', 'halfday', 'fullday'].forEach(d => {
    const btn = document.getElementById(`tab-${d}`);
    if (btn) {
      if (d === duration) {
        btn.classList.add('active', 'border-brand-primary', 'bg-emerald-50/90', 'text-brand-dark', 'ring-2', 'ring-brand-primary/20', 'shadow-md');
        btn.classList.remove('border-gray-200', 'bg-white', 'text-gray-700');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active', 'border-brand-primary', 'bg-emerald-50/90', 'text-brand-dark', 'ring-2', 'ring-brand-primary/20', 'shadow-md');
        btn.classList.add('border-gray-200', 'bg-white', 'text-gray-700');
        btn.setAttribute('aria-selected', 'false');
      }
    }
  });

  const data = PRICING_CONFIG[duration];
  if (!data) return;

  const bPrice = document.getElementById('price-bicycle');
  const bUnit = document.getElementById('unit-bicycle');
  if (bPrice && bUnit) {
    bPrice.innerText = data.bicycle;
    bUnit.innerText = data.bicycleUnit;
  }

  const mPrice = document.getElementById('price-moto');
  const mUnit = document.getElementById('unit-moto');
  if (mPrice && mUnit) {
    mPrice.innerText = data.moto;
    mUnit.innerText = data.motoUnit;
  }

  const cPrice = document.getElementById('price-car');
  const cUnit = document.getElementById('unit-car');
  if (cPrice && cUnit) {
    cPrice.innerText = data.car;
    cUnit.innerText = data.carUnit;
  }
}

/**
 * Helper to preselect vehicle in the booking form and scroll smoothly
 */
function preselectVehicle(vehicleName, packageType, targetSection) {
  const vehicleInput = document.getElementById('book-vehicle');
  const packageInput = document.getElementById('book-package');
  
  if (vehicleInput && vehicleName) {
    // Check if option exists, if not add it dynamically
    let optionExists = false;
    for (let i = 0; i < vehicleInput.options.length; i++) {
      if (vehicleInput.options[i].value === vehicleName || vehicleInput.options[i].text.includes(vehicleName)) {
        vehicleInput.selectedIndex = i;
        optionExists = true;
        break;
      }
    }
    if (!optionExists) {
      const newOpt = document.createElement('option');
      newOpt.value = vehicleName;
      newOpt.textContent = vehicleName;
      vehicleInput.appendChild(newOpt);
      vehicleInput.value = vehicleName;
    }
  }
  if (packageInput && packageType) {
    packageInput.value = packageType;
  }

  // Scroll to designated section (defaults to targetSection, or #pricing-rates for bikes/motos, or #booking for others)
  let targetId = targetSection;
  if (!targetId) {
    const vLower = (vehicleName || '').toLowerCase();
    if (vLower.includes('bike') || vLower.includes('bicycle') || vLower.includes('motorcycle') || vLower.includes('scooter')) {
      targetId = 'pricing-rates';
    } else {
      targetId = 'booking';
    }
  } else {
    targetId = targetId.replace('#', '');
  }

  const section = document.getElementById(targetId);
  if (section) {
    if (window.history && window.history.pushState && window.location.hash !== '#' + targetId) {
      window.history.pushState({ section: targetId, vehicle: vehicleName, package: packageType }, '', '#' + targetId);
    }
    section.scrollIntoView({ behavior: 'smooth' });
  }
}
