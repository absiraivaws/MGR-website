/**
 * MANNAR GREEN RIDE (MGR) - AI ROUTE PLANNER & HOST LISTING GENERATOR
 * Powered by Mannar Local Knowledge Base with optional Gemini AI API Support
 */

/**
 * High-quality localized itinerary generator for Mannar Island
 */
function buildLocalMannarItinerary(vehicle, fitness, duration, interests) {
  let isBike = vehicle.toLowerCase().includes('bicycle');
  let isMoto = vehicle.toLowerCase().includes('motorcycle') || vehicle.toLowerCase().includes('scooter');
  let isCarVan = vehicle.toLowerCase().includes('car') || vehicle.toLowerCase().includes('van') || vehicle.toLowerCase().includes('bus');

  let distanceKm = 0;
  let caloriesKcal = 0;
  let checkpoints = [];
  let safetyTips = [];

  if (duration.includes("1 to 2 Hours")) {
    distanceKm = isBike ? 12 : (isMoto ? 25 : 30);
    caloriesKcal = isBike ? 420 : 70;
    checkpoints = [
      "📍 Start: Mannar Town Hub (Main Street)",
      "🌿 Stop 1: Historic 700-year-old Baobab Tree (Pallimunai) - 15 min rest & photos",
      "🏰 Stop 2: Mannar Portuguese & Dutch Fort (1560) - panoramic sea view of the lagoon",
      "🌅 Stop 3: Mannar Causeway Bridge - feel the coastal breeze & watch local fishing boats"
    ];
    safetyTips = [
      "Hydrate well: carry at least 750ml water even for short rides.",
      "Watch out for Mannar's famous freely wandering donkeys along town streets.",
      "Causeway winds can be strong in the afternoon; grip handlebars firmly."
    ];
  } else if (duration.includes("Half Day")) {
    distanceKm = isBike ? 28 : (isMoto ? 55 : 65);
    caloriesKcal = isBike ? 890 : 180;
    checkpoints = [
      "📍 Start: Mannar Green Ride Hub, Mannar Town",
      "🦩 Stop 1: Vankalai Bird Sanctuary (Ramsar Site) - Flamingos, painted storks & migratory waders",
      "🌳 Stop 2: Ancient Baobab Tree & Pallimunai coastal village",
      "💨 Stop 3: Thambapanni Wind Farm - Sri Lanka's largest coastal wind energy park",
      "🏖️ Stop 4: Keeri Beach - shallow calm turquoise water & coconut refreshments"
    ];
    safetyTips = [
      "Best start time is 06:30 AM to capture birds active at sunrise and avoid noon sun.",
      "Wear sunglasses and high SPF sunscreen; UV levels along the coast are intense.",
      "Keep helmets strapped securely at all times."
    ];
  } else {
    // Full Day
    distanceKm = isBike ? 52 : (isMoto ? 85 : 110);
    caloriesKcal = isBike ? 1650 : 320;
    checkpoints = [
      "📍 07:00 AM: Start at Mannar Green Ride Station",
      "🦩 07:45 AM: Vankalai Wetland Bird Watching & Causeway ride",
      "🏰 09:30 AM: Mannar Fort exploration & Palmyra handicraft stalls",
      "💨 11:00 AM: Coastal Highway ride past Pesalai fishing harbor",
      "⚓ 01:30 PM: Talaimannar Pier & Historic 1915 Lighthouse (Historic Indo-Ceylon link)",
      "🌊 03:30 PM: Adam's Bridge (Rama Setu) Sand Dunes & Marine Reserve view",
      "🥥 05:30 PM: Sunset return via Keeri Beach & King Coconut break"
    ];
    safetyTips = [
      "Carry electrolytes and hydration packs for high cardio endurance.",
      "Talaimannar pier area can get windy; secure phone and hats.",
      "Save the Mannar Green Ride 24/7 hotline (+94 77 657 4418) for roadside assist."
    ];
  }

  return `🗺️ CUSTOM MANNAR TRAVEL & ROUTE PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚲 Vehicle: ${vehicle}
⏱️ Duration: ${duration}
🎯 Target Goal: ${fitness}
🔎 Highlights: ${interests || "Mannar Causeway, Baobab tree, Bird sanctuary, Talaimannar Pier"}

📊 ESTIMATED METRICS:
• Total Estimated Distance: ~${distanceKm} km
• Estimated Energy Burn: ~${caloriesKcal} kcal ${isBike ? "(Cardio fitness cycling)" : "(Active sightseeing)"}
• Terrain Type: Flat coastal tarmac & scenic causeway gravel

📍 RECOMMENDED ITINERARY CHECKPOINTS:
${checkpoints.join('\n')}

🛡️ LOCAL ROAD & SAFETY RECOMMENDATIONS:
${safetyTips.map(t => "• " + t).join('\n')}

💡 Ready to ride? Click "Select Vehicle" or book directly on WhatsApp (+94 77 657 4418)!`;
}

/**
 * Generate AI Route Plan (calls Gemini API if key is present, otherwise uses intelligent local generator)
 */
async function generateAIRoute() {
  const vehicle = document.getElementById('ai-vehicle')?.value || "Bicycle (Rs. 100/hr)";
  const fitness = document.getElementById('ai-fitness')?.value || "Cardio Fitness Workout (20-30 km)";
  const duration = document.getElementById('ai-duration')?.value || "Half Day (4 Hours)";
  const interests = document.getElementById('ai-interest')?.value || "Mannar Causeway, Baobab tree, Bird sanctuary, Lighthouse";

  const placeholder = document.getElementById('ai-placeholder');
  const loading = document.getElementById('ai-loading');
  const result = document.getElementById('ai-result');

  if (placeholder) placeholder.classList.add('hidden');
  if (result) result.classList.add('hidden');
  if (loading) loading.classList.remove('hidden');

  // Check for optional user Gemini API key
  let apiKey = window.MGR_GEMINI_API_KEY || "";
  let itineraryText = "";

  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const prompt = `You are the local travel and passenger transport planner for Mannar Green Ride in Mannar Town, Sri Lanka.
Generate a practical travel and fitness itinerary for:
- Vehicle: ${vehicle}
- Pace / Goal: ${fitness}
- Available Time: ${duration}
- Sights of Interest: ${interests}
Provide estimated distances (KM), fitness benefit (calories burned if cycling), scenic rest spots, and road safety advice in Mannar. Format neatly with bullet points.`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (res.ok) {
        const data = await res.json();
        itineraryText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } catch (e) {
      console.warn("AI service call failed, using built-in Mannar intelligence engine.", e);
    }
  }

  // Fallback to rich local Mannar itinerary if no API key or network failure
  if (!itineraryText) {
    // Artificial small delay for realistic UX
    await new Promise(r => setTimeout(r, 600));
    itineraryText = buildLocalMannarItinerary(vehicle, fitness, duration, interests);
  }

  if (loading) loading.classList.add('hidden');
  if (result) {
    result.innerText = itineraryText;
    result.classList.remove('hidden');
  }
}
