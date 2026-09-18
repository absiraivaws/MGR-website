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
function switchPricingDuration(duration) {
  currentDurationTab = duration;
  ['hourly', 'halfday', 'fullday'].forEach(d => {
    const btn = document.getElementById(`tab-${d}`);
    if (btn) {
      if (d === duration) {
        btn.className = "px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-brand-primary text-white shadow-sm transition";
      } else {
        btn.className = "px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition";
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
    vehicleInput.value = vehicleName;
  }
  if (packageInput && packageType) {
    packageInput.value = packageType;
  }

  const bookingSection = document.getElementById('booking');
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: 'smooth' });
  }
}
