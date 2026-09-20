/**
 * MANNAR GREEN RIDE (MGR) - RENTAL PRICING & VEHICLE PRESELECTION
 */

const PRICING_CONFIG = {
  hourly: {
    bicycle: "Rs. 100",
    bicycleUnit: "/ per hour",
    moto: "Rs. 500",
    motoUnit: "/ per hour",
    car: "From Rs. 1,500",
    carUnit: "/ per hour"
  },
  halfday: {
    bicycle: "Rs. 400",
    bicycleUnit: "/ 4-5 hours",
    moto: "Rs. 1,800",
    motoUnit: "/ 4-5 hours",
    car: "From Rs. 5,000",
    carUnit: "/ 4-5 hours"
  },
  fullday: {
    bicycle: "Rs. 800",
    bicycleUnit: "/ 24 hours",
    moto: "Rs. 3,500",
    motoUnit: "/ 24 hours",
    car: "From Rs. 9,500",
    carUnit: "/ 24 hours"
  }
};

window.PRICING_CONFIG = PRICING_CONFIG;

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
function preselectVehicle(vehicleName, packageType) {
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

  const bookingSection = document.getElementById('booking');
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: 'smooth' });
  }
}
