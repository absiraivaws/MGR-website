/**
 * MANNAR GREEN RIDE - CMS BRIDGE
 * Connects Public Website to Supabase CMS Content & Live Database Metrics
 * Strictly Non-Financial Data | Zero Visual Disruption | Static HTML Fallback
 */

(function () {
  'use strict';

  const CMS_CONFIG = {
    url: "https://szzhzpjfmyeulxjhbbov.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6emh6cGpmbXlldWx4amhiYm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzI4NDksImV4cCI6MjEwMzg0ODg0OX0.Xo3-i1H_rbX0DYhtw5C5-i4kQYsB1mXHYJzckhOYu1g"
  };

  let supabaseClient = null;

  function initCMS() {
    // Fast initial check for Launch Ceremony (cached in localStorage or URL query param)
    try {
      const cachedCeremony = localStorage.getItem('mgr_setting_launch_ceremony_config');
      const isUrlCeremony = window.location.search.includes('ceremony=true') || window.location.search.includes('launch=true');
      if (cachedCeremony || isUrlCeremony) {
        initLaunchCeremony(cachedCeremony || { active: true });
      }
    } catch (e) {}

    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(CMS_CONFIG.url, CMS_CONFIG.anonKey);
      syncWebsiteContent();
    } else {
      console.log("Supabase client not yet loaded. Using hardcoded content fallback.");
    }
  }

  async function syncWebsiteContent() {
    if (!supabaseClient) return;

    try {
      // 1. Fetch Non-Financial Live Public Business Stats (Rides, Customers, Fleet)
      try {
        const { data: publicStats, error: statsErr } = await supabaseClient.rpc('get_public_business_stats');
        if (!statsErr && publicStats && publicStats[0]) {
          applyPublicStats(publicStats[0]);
        }
      } catch (statsErr) {
        console.warn("Public stats RPC note:", statsErr.message);
      }

      // 2. Fetch Global Settings
      const { data: settings } = await supabaseClient
        .from('website_settings')
        .select('setting_key, setting_value')
        .eq('is_public', true);

      // Overlay with any active localStorage settings
      const settingsMap = {};
      if (settings && settings.length) {
        settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
      }
      ['hero_layout_config', 'currency_config', 'hero_slider_config', 'offer_animation_config', 'content_styling_config', 'floating_booking_config', 'transport_categories', 'statistics_counters_config', 'join_us_config', 'reviews_slider_config', 'host_whatsapp_group_url', 'host_vehicle_cards', 'fitness_feature_cards', 'about_feature_cards'].forEach(k => {
        try {
          const val = localStorage.getItem('mgr_setting_' + k);
          if (val) settingsMap[k] = val;
        } catch (e) {}
      });

      const combinedSettings = Object.keys(settingsMap).map(k => ({ setting_key: k, setting_value: settingsMap[k] }));
      if (combinedSettings.length) {
        applySettings(combinedSettings);
      }

      // 3. Fetch Published Sections (Hero, Fitness, About)
      const { data: sections } = await supabaseClient
        .from('website_sections')
        .select('*')
        .eq('status', 'published')
        .eq('is_visible', true);

      if (sections && sections.length) {
        applySections(sections);
      }

      // 4. Fetch Published Services & Pricing (Ordered by display_order)
      const { data: services } = await supabaseClient
        .from('website_services')
        .select('*')
        .eq('status', 'published')
        .order('display_order');

      if (services && services.length) {
        applyServices(services);
      }

      // 5. Fetch Active Promotional Offers (Ordered by display_order)
      try {
        let offers = null;
        try {
          const { data, error } = await supabaseClient
            .from('website_offers')
            .select('*')
            .eq('status', 'active')
            .order('display_order', { ascending: true });
          if (!error && data && data.length) offers = data;
        } catch (e) {}

        if (!offers) {
          const { data } = await supabaseClient
            .from('website_offers')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
          offers = data;
        }

        if (offers && offers.length) {
          applyOffers(offers);
        }
      } catch (offersErr) {
        console.warn("Offers fetch note:", offersErr.message);
      }

      // 6. Fetch Dedicated SEO & Keyword Metadata
      const { data: seoData } = await supabaseClient
        .from('seo_metadata')
        .select('*')
        .in('page_slug', ['global', 'home']);

      if (seoData && seoData.length) {
        applySeoMetadata(seoData);
      }

      // 7. Fetch Published Testimonials (Ordered by display_order)
      const { data: testimonials } = await supabaseClient
        .from('website_testimonials')
        .select('*')
        .eq('status', 'published')
        .order('display_order');

      if (testimonials && testimonials.length) {
        applyTestimonials(testimonials);
      }

      // 8. Fetch Published Blogs (Ordered by display_order)
      let blogs = null;
      try {
        const { data, error } = await supabaseClient
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .order('display_order', { ascending: true })
          .limit(3);
        if (!error && data && data.length) blogs = data;
      } catch (e) {}

      if (!blogs) {
        const { data } = await supabaseClient
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3);
        blogs = data;
      }

      if (blogs && blogs.length) {
        applyBlogs(blogs);
      }

    } catch (err) {
      console.warn("CMS Bridge sync completed with local fallback active:", err.message);
    }
  }

  /* ----------------- Apply Public Stats (Live Database Counts) ----------------- */
  function applyPublicStats(stats) {
    if (typeof window.renderLiveStats === 'function') {
      window.renderLiveStats(stats);
    } else if (typeof window.STATS_CONFIG !== 'undefined' && Array.isArray(window.STATS_CONFIG)) {
      if (stats.completed_services !== undefined && window.STATS_CONFIG[0]) {
        window.STATS_CONFIG[0].target = Number(stats.completed_services);
      }
      if (stats.total_customers !== undefined && window.STATS_CONFIG[1]) {
        window.STATS_CONFIG[1].target = Number(stats.total_customers);
      }
      if (stats.registered_vehicles !== undefined && window.STATS_CONFIG[2]) {
        window.STATS_CONFIG[2].target = Number(stats.registered_vehicles);
      }
      if (typeof window.renderStats === 'function') {
        window.renderStats(window.STATS_CONFIG, true);
      }
    }
  }

  /* ----------------- Apply Settings ----------------- */
  function applySettings(settingsList) {
    const map = {};
    settingsList.forEach(item => { map[item.setting_key] = item.setting_value; });

    // Phone
    if (map.phone) {
      document.querySelectorAll('[data-cms-phone]').forEach(el => el.textContent = map.phone);
      const footerPhone = document.getElementById('footer-phone');
      if (footerPhone) footerPhone.textContent = map.phone;
    }

    // Email
    if (map.email) {
      const emailEl = document.getElementById('footer-email');
      if (emailEl) emailEl.textContent = map.email;
    }

    // Location
    if (map.location) {
      const locEl = document.getElementById('footer-location');
      if (locEl) locEl.textContent = map.location;
    }

    // WhatsApp links
    if (map.whatsapp_url) {
      const linkWa = document.getElementById('link-wa');
      const floatWa = document.getElementById('floating-wa');
      if (linkWa) linkWa.href = map.whatsapp_url;
      if (floatWa) floatWa.href = map.whatsapp_url;
    }

    // Host WhatsApp Group
    if (map.host_whatsapp_group_url) {
      const hostWa = document.getElementById('host-whatsapp-link');
      if (hostWa) hostWa.href = map.host_whatsapp_group_url;
    }

    // Social URLs
    if (map.facebook_url) {
      const linkFb = document.getElementById('link-fb');
      if (linkFb) linkFb.href = map.facebook_url;
    }
    if (map.instagram_url) {
      const linkIg = document.getElementById('link-ig');
      if (linkIg) linkIg.href = map.instagram_url;
    }
    if (map.youtube_url) {
      const linkYt = document.getElementById('link-yt');
      if (linkYt) linkYt.href = map.youtube_url;
    }
    if (map.tiktok_url) {
      const linkTt = document.getElementById('link-tt');
      if (linkTt) linkTt.href = map.tiktok_url;
    }

    // Floating Booking & Explorer Button Configuration
    if (map.floating_booking_config) {
      try {
        localStorage.setItem('mgr_setting_floating_booking_config', typeof map.floating_booking_config === 'string' ? map.floating_booking_config : JSON.stringify(map.floating_booking_config));
        const floatConfig = typeof map.floating_booking_config === 'string'
          ? JSON.parse(map.floating_booking_config)
          : map.floating_booking_config;
        
        const floatBtn = document.getElementById('floating-booking');
        if (floatBtn) {
          if (floatConfig.enabled === false) {
            floatBtn.style.display = 'none';
          } else {
            floatBtn.style.display = 'flex';
          }
          if (floatConfig.target_url) {
            floatBtn.href = floatConfig.target_url;
          }
        }

        if (Array.isArray(floatConfig.words) && floatConfig.words.length > 0) {
          window.FLOATING_BOOKING_PHRASES = floatConfig.words;
          if (typeof window.updateFloatingBookingPhrases === 'function') {
            window.updateFloatingBookingPhrases(floatConfig.words, floatConfig.interval_seconds || 2.6);
          }
        }
      } catch (e) {
        console.warn("Could not apply floating_booking_config:", e);
      }
    }

    // Promotional Offer Banner Animation Configuration (Item 3)
    if (map.offer_animation_config) {
      try {
        localStorage.setItem('mgr_setting_offer_animation_config', typeof map.offer_animation_config === 'string' ? map.offer_animation_config : JSON.stringify(map.offer_animation_config));
        const animConfig = typeof map.offer_animation_config === 'string'
          ? JSON.parse(map.offer_animation_config)
          : map.offer_animation_config;
        window.OFFER_ANIMATION_CONFIG = animConfig;
        applyOfferAnimation(animConfig);
      } catch (e) {
        console.warn("Could not apply offer_animation_config:", e);
      }
    }

    // Hero Multi-Image Carousel & Slider Configuration (Item 5)
    if (map.hero_slider_config) {
      try {
        localStorage.setItem('mgr_setting_hero_slider_config', typeof map.hero_slider_config === 'string' ? map.hero_slider_config : JSON.stringify(map.hero_slider_config));
      } catch (e) {}
      initHeroSlider(map.hero_slider_config);
    } else {
      try {
        const localSlider = localStorage.getItem('mgr_setting_hero_slider_config');
        initHeroSlider(localSlider);
      } catch (e) {
        initHeroSlider(null);
      }
    }

    // WordPress-Style Content Typography & Image Styling Configuration
    if (map.content_styling_config) {
      try {
        localStorage.setItem('mgr_setting_content_styling_config', typeof map.content_styling_config === 'string' ? map.content_styling_config : JSON.stringify(map.content_styling_config));
        const styleConfig = typeof map.content_styling_config === 'string'
          ? JSON.parse(map.content_styling_config)
          : map.content_styling_config;
        applyContentStyling(styleConfig);
      } catch (e) {
        console.warn("Could not apply content_styling_config:", e);
      }
    }

    // Hero Background & Layout Configuration (Request 2 & 3)
    if (map.hero_layout_config) {
      try {
        localStorage.setItem('mgr_setting_hero_layout_config', typeof map.hero_layout_config === 'string' ? map.hero_layout_config : JSON.stringify(map.hero_layout_config));
        const layoutCfg = typeof map.hero_layout_config === 'string'
          ? JSON.parse(map.hero_layout_config)
          : map.hero_layout_config;
        applyHeroLayout(layoutCfg);
      } catch (e) {
        console.warn("Could not apply hero_layout_config:", e);
      }
    } else {
      try {
        const cachedLayout = localStorage.getItem('mgr_setting_hero_layout_config');
        if (cachedLayout) applyHeroLayout(JSON.parse(cachedLayout));
      } catch (e) {}
    }

    // Launch Ceremony Configuration
    if (map.launch_ceremony_config) {
      try {
        localStorage.setItem('mgr_setting_launch_ceremony_config', typeof map.launch_ceremony_config === 'string' ? map.launch_ceremony_config : JSON.stringify(map.launch_ceremony_config));
      } catch (e) {}
      initLaunchCeremony(map.launch_ceremony_config);
    }

    // Fitness Section Images
    if (map.fitness_section_images) {
      try {
        const fitImgs = typeof map.fitness_section_images === 'string' ? JSON.parse(map.fitness_section_images) : map.fitness_section_images;
        if (fitImgs) {
          if (fitImgs.img1) {
            const el1 = document.getElementById('fitness-img-1');
            if (el1) el1.src = normalizeImageUrl(fitImgs.img1);
          }
          if (fitImgs.img2) {
            const el2 = document.getElementById('fitness-img-2');
            if (el2) el2.src = normalizeImageUrl(fitImgs.img2);
          }
        }
      } catch (e) {}
    }

    // Currency & Pricing Format Configuration (Item 6)
    if (map.currency_config) {
      try {
        localStorage.setItem('mgr_setting_currency_config', typeof map.currency_config === 'string' ? map.currency_config : JSON.stringify(map.currency_config));
        const currConfig = typeof map.currency_config === 'string'
          ? JSON.parse(map.currency_config)
          : map.currency_config;
        if (currConfig && typeof window.applyCurrencyToPricing === 'function') {
          window.applyCurrencyToPricing(currConfig);
        }
      } catch (e) {
        console.warn("Could not apply currency_config:", e);
      }
    }

    // Duration Pricing Matrix (Hourly, Half-Day, Full-Day)
    if (map.pricing_matrix) {
      try {
        const matrix = typeof map.pricing_matrix === 'string' ? JSON.parse(map.pricing_matrix) : map.pricing_matrix;
        if (matrix) {
          if (typeof window.applyCurrencyToPricing === 'function') {
            window.applyCurrencyToPricing(null, matrix);
          } else if (window.PRICING_CONFIG) {
            const fmt = (amt, isFrom) => typeof window.formatRentalPrice === 'function' ? window.formatRentalPrice(amt, isFrom) : (isFrom ? 'From Rs. ' : 'Rs. ') + Number(amt).toLocaleString();
            if (matrix.hourly) {
              if (matrix.hourly.bicycle) window.PRICING_CONFIG.hourly.bicycle = fmt(matrix.hourly.bicycle, false);
              if (matrix.hourly.moto) window.PRICING_CONFIG.hourly.moto = fmt(matrix.hourly.moto, false);
              if (matrix.hourly.car) window.PRICING_CONFIG.hourly.car = fmt(matrix.hourly.car, true);
            }
            if (matrix.halfday) {
              if (matrix.halfday.bicycle) window.PRICING_CONFIG.halfday.bicycle = fmt(matrix.halfday.bicycle, false);
              if (matrix.halfday.moto) window.PRICING_CONFIG.halfday.moto = fmt(matrix.halfday.moto, false);
              if (matrix.halfday.car) window.PRICING_CONFIG.halfday.car = fmt(matrix.halfday.car, true);
            }
            if (matrix.fullday) {
              if (matrix.fullday.bicycle) window.PRICING_CONFIG.fullday.bicycle = fmt(matrix.fullday.bicycle, false);
              if (matrix.fullday.moto) window.PRICING_CONFIG.fullday.moto = fmt(matrix.fullday.moto, false);
              if (matrix.fullday.car) window.PRICING_CONFIG.fullday.car = fmt(matrix.fullday.car, true);
            }
            if (typeof window.switchPricingDuration === 'function') {
              window.switchPricingDuration(window.currentDurationTab || 'hourly');
            }
          }
        }
      } catch (err) {
        console.warn("Could not apply pricing_matrix from website_settings:", err);
      }
    }

    // Dynamic Multi-Language Configuration
    if (map.website_languages) {
      try {
        const list = typeof map.website_languages === 'string' ? JSON.parse(map.website_languages) : map.website_languages;
        if (Array.isArray(list) && list.length) {
          const activeLangs = list.filter(l => l.status === 'active');
          const langSelect = document.getElementById('lang-select');
          const langSelectMobile = document.getElementById('lang-select-mobile');
          const currentLang = localStorage.getItem('mgr_lang') || 'en';

          if (langSelect && activeLangs.length) {
            langSelect.innerHTML = activeLangs.map(l => 
              `<option value="${escapeHtml(l.code)}" ${l.code === currentLang ? 'selected' : ''}>${escapeHtml(l.native || l.name)} (${escapeHtml(l.name)})</option>`
            ).join('');
          }
          if (langSelectMobile && activeLangs.length) {
            langSelectMobile.innerHTML = activeLangs.map(l => 
              `<option value="${escapeHtml(l.code)}" ${l.code === currentLang ? 'selected' : ''}>${escapeHtml(l.flag || '')} ${escapeHtml(l.code.toUpperCase())}</option>`
            ).join('');
          }
        }
      } catch (err) {
        console.warn("Could not apply website_languages:", err);
      }
    }

    // Transport Categories Configuration
    if (map.transport_categories) {
      try {
        const catList = typeof map.transport_categories === 'string' ? JSON.parse(map.transport_categories) : map.transport_categories;
        if (Array.isArray(catList) && catList.length && typeof window.renderTransportCategories === 'function') {
          window.renderTransportCategories(catList);
        }
      } catch (err) {
        console.warn("Could not apply transport_categories:", err);
      }
    }

    // Statistics / Counters Configuration
    if (map.statistics_counters_config) {
      try {
        const statsList = typeof map.statistics_counters_config === 'string' ? JSON.parse(map.statistics_counters_config) : map.statistics_counters_config;
        if (Array.isArray(statsList) && statsList.length && typeof window.renderStats === 'function') {
          window.renderStats(statsList, true);
        }
      } catch (err) {
        console.warn("Could not apply statistics_counters_config:", err);
      }
    }

    // Review Slider & Marquee Speed Configuration
    if (map.reviews_slider_config) {
      try {
        const revCfg = typeof map.reviews_slider_config === 'string' ? JSON.parse(map.reviews_slider_config) : map.reviews_slider_config;
        if (revCfg && typeof window.applyReviewSliderConfig === 'function') {
          window.applyReviewSliderConfig(revCfg);
        }
      } catch (err) {
        console.warn("Could not apply reviews_slider_config:", err);
      }
    }

    // Join Us Section Configuration
    if (map.join_us_config) {
      try {
        const joinCfg = typeof map.join_us_config === 'string' ? JSON.parse(map.join_us_config) : map.join_us_config;
        if (joinCfg) {
          const hostSec = document.getElementById('partner-vehicles');
          const navHost = document.getElementById('nav-partner-vehicles');
          if (joinCfg.status === 'inactive') {
            if (hostSec) hostSec.classList.add('hidden');
            if (navHost) navHost.classList.add('hidden');
          } else {
            if (hostSec) hostSec.classList.remove('hidden');
            if (navHost) navHost.classList.remove('hidden');
          }

          if (joinCfg.title) {
            const el = document.getElementById('host-title');
            if (el) el.textContent = joinCfg.title;
            propagateToAllTranslations('host_title', joinCfg.title);
          }
          if (joinCfg.badge) {
            const el = document.getElementById('host-badge');
            if (el) el.textContent = joinCfg.badge;
            propagateToAllTranslations('host_badge', joinCfg.badge);
          }
          if (joinCfg.description) {
            const el = document.getElementById('host-desc');
            if (el) el.textContent = joinCfg.description;
            propagateToAllTranslations('host_desc', joinCfg.description);
          }
          if (joinCfg.button_text) {
            const el = document.getElementById('host-btn-text');
            if (el) el.textContent = joinCfg.button_text;
            propagateToAllTranslations('host_btn', joinCfg.button_text);
          }
          const waUrl = joinCfg.whatsapp_url || map.host_whatsapp_group_url;
          if (waUrl) {
            const el = document.getElementById('host-whatsapp-link');
            if (el) el.href = waUrl;
          }
        }
      } catch (err) {
        console.warn("Could not apply join_us_config:", err);
      }
    }

    // Host Vehicle Community Cards (Cars, Vans, Buses subcards)
    if (map.host_vehicle_cards) {
      try {
        const list = typeof map.host_vehicle_cards === 'string' ? JSON.parse(map.host_vehicle_cards) : map.host_vehicle_cards;
        if (Array.isArray(list) && list.length) {
          const activeCards = list.filter(c => c.status !== 'inactive').sort((a, b) => (a.order || 0) - (b.order || 0));
          const subcardsContainer = document.getElementById('host-vehicles-subcards-container');
          if (subcardsContainer && activeCards.length) {
            subcardsContainer.innerHTML = activeCards.map(c => `
              <div class="bg-amber-50/80 p-4 rounded-2xl text-center border border-amber-200">
                <i class="${escapeHtml(c.icon || 'fa-solid fa-car')} text-2xl mb-1.5" style="color: #065f46;"></i>
                <p class="text-sm font-bold text-gray-900">${escapeHtml(c.name)}</p>
                <span class="text-xs text-gray-500">${escapeHtml(c.subtitle || '')}</span>
              </div>
            `).join('');
          }
        }
      } catch (err) {
        console.warn("Could not apply host_vehicle_cards:", err);
      }
    }

    // Tourist & Body Fitness Feature Cards
    if (map.fitness_feature_cards) {
      try {
        const list = typeof map.fitness_feature_cards === 'string' ? JSON.parse(map.fitness_feature_cards) : map.fitness_feature_cards;
        if (Array.isArray(list) && list.length) {
          const activeList = list.filter(c => c.status !== 'inactive').sort((a, b) => (a.order || 0) - (b.order || 0));
          const fitContainer = document.getElementById('fitness-features-container');
          if (fitContainer && activeList.length) {
            fitContainer.innerHTML = activeList.map(c => `
              <div class="flex items-start space-x-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-brand-primary flex-shrink-0 text-xl">
                  <i class="${escapeHtml(c.icon || 'fa-solid fa-heart-pulse')}"></i>
                </div>
                <div>
                  <h4 class="font-bold text-gray-900 text-base">${escapeHtml(c.title)}</h4>
                  <p class="text-xs sm:text-sm text-gray-600 mt-1">${escapeHtml(c.description || '')}</p>
                </div>
              </div>
            `).join('');
          }
        }
      } catch (err) {
        console.warn("Could not apply fitness_feature_cards:", err);
      }
    }

    // About Us Highlight Cards
    if (map.about_feature_cards) {
      try {
        const list = typeof map.about_feature_cards === 'string' ? JSON.parse(map.about_feature_cards) : map.about_feature_cards;
        if (Array.isArray(list) && list.length) {
          const activeList = list.filter(c => c.status !== 'inactive').sort((a, b) => (a.order || 0) - (b.order || 0));
          const abtContainer = document.getElementById('about-highlights-container');
          if (abtContainer && activeList.length) {
            abtContainer.innerHTML = activeList.map(c => `
              <div class="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <h4 class="font-bold text-gray-900 text-sm">${escapeHtml(c.title)}</h4>
                <p class="text-xs text-gray-500 mt-1">${escapeHtml(c.description || '')}</p>
              </div>
            `).join('');
          }
        }
      } catch (err) {
        console.warn("Could not apply about_feature_cards:", err);
      }
    }

    // AI Travel Assistant Settings & API Key
    if (map.ai_assistant_config) {
      try {
        const aiCfg = typeof map.ai_assistant_config === 'string' ? JSON.parse(map.ai_assistant_config) : map.ai_assistant_config;
        if (aiCfg) {
          if (aiCfg.gemini_api_key) {
            window.MGR_GEMINI_API_KEY = aiCfg.gemini_api_key;
          }
          const aiSec = document.getElementById('ai-planner');
          if (aiSec && aiCfg.status === 'inactive') {
            aiSec.classList.add('hidden');
          } else if (aiSec) {
            aiSec.classList.remove('hidden');
          }

          if (aiCfg.title) {
            document.querySelectorAll('[data-i18n="ai_title"]').forEach(el => el.textContent = aiCfg.title);
            propagateToAllTranslations('ai_title', aiCfg.title);
          }
          if (aiCfg.badge) {
            document.querySelectorAll('[data-i18n="ai_badge"]').forEach(el => el.textContent = aiCfg.badge);
            propagateToAllTranslations('ai_badge', aiCfg.badge);
          }
          if (aiCfg.description) {
            document.querySelectorAll('[data-i18n="ai_desc"]').forEach(el => el.textContent = aiCfg.description);
            propagateToAllTranslations('ai_desc', aiCfg.description);
          }
        }
      } catch (err) {
        console.warn("Could not apply ai_assistant_config:", err);
      }
    }

    // Hero Multi-Image Slider Engine
    if (map.hero_slider_config) {
      try {
        initHeroSlider(map.hero_slider_config);
      } catch (err) {
        console.warn("Could not apply hero_slider_config:", err);
      }
    } else if (map.content_styling_config) {
      try {
        const sc = typeof map.content_styling_config === 'string' ? JSON.parse(map.content_styling_config) : map.content_styling_config;
        if (sc && sc.hero && sc.hero.imgUrl) {
          initHeroSlider({
            enabled: true,
            slides: [{ id: "slide_1", url: sc.hero.imgUrl, title: "Explore Mannar Sustainably", subtitle: "Eco-Friendly Passenger Transport & Rentals" }]
          });
        } else {
          initHeroSlider(null);
        }
      } catch (e) {
        initHeroSlider(null);
      }
    } else {
      initHeroSlider(null);
    }
  }

  /* ----------------- Hero Multi-Image Slider Engine (Item 5) ----------------- */
  let heroSliderTimer = null;
  let heroCurrentSlideIdx = 0;
  let heroSlidesData = [];

  function initHeroSlider(config) {
    const track = document.getElementById('hero-slider-track');
    const dotsContainer = document.getElementById('hero-slider-dots');
    const prevBtn = document.getElementById('hero-slider-prev');
    const nextBtn = document.getElementById('hero-slider-next');
    const sliderBox = document.getElementById('hero-slider');
    const titleEl = document.getElementById('hero-slide-title');
    const subEl = document.getElementById('hero-slide-subtitle');
    const captionBox = document.getElementById('hero-slider-caption');

    if (!track) return;

    let cfg = {
      enabled: true,
      interval: 4000,
      auto_slide: true,
      slides: [
        {
          id: "slide_1",
          url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=1200",
          title: "Eco-Friendly Cycling Across Mannar Causeway",
          subtitle: "Bicycles from Rs. 100/hr with free helmet & lock"
        },
        {
          id: "slide_2",
          url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=1200",
          title: "Scenic Coastal Exploration & Flamingo Dunes",
          subtitle: "Comfortable rides designed for health and eco-tourism"
        },
        {
          id: "slide_3",
          url: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=1200",
          title: "Island-Wide Passenger Transport Fleet",
          subtitle: "Cars, KDH vans, and tourist buses with trusted local drivers"
        }
      ]
    };

    if (config) {
      if (typeof config === 'string') {
        try {
          const parsed = JSON.parse(config);
          if (parsed) cfg = { ...cfg, ...parsed };
        } catch (e) {}
      } else if (typeof config === 'object') {
        cfg = { ...cfg, ...config };
      }
    }

    if (!Array.isArray(cfg.slides) || cfg.slides.length === 0) {
      cfg.slides = [
        {
          id: "slide_default",
          url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=1200",
          title: "Explore Mannar Sustainably",
          subtitle: "Mannar Green Ride Passenger Transport"
        }
      ];
    }

    heroSlidesData = cfg.slides;
    heroCurrentSlideIdx = 0;

    // Render slides into track
    track.innerHTML = heroSlidesData.map((s, idx) => `
      <div class="hero-slide ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
        <img src="${normalizeImageUrl(s.url)}" alt="${s.title ? escapeHtml(s.title) : 'Mannar Green Ride Hero Slide'}" loading="${idx === 0 ? 'eager' : 'lazy'}">
      </div>
    `).join('');

    // Render dots
    if (dotsContainer) {
      if (heroSlidesData.length > 1) {
        dotsContainer.style.display = 'flex';
        dotsContainer.innerHTML = heroSlidesData.map((_, idx) => `
          <button type="button" class="hero-slider-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}" aria-label="Go to slide ${idx + 1}"></button>
        `).join('');

        dotsContainer.querySelectorAll('.hero-slider-dot').forEach(dot => {
          dot.onclick = () => {
            goToSlide(parseInt(dot.dataset.idx, 10));
          };
        });
      } else {
        dotsContainer.style.display = 'none';
      }
    }

    // Prev / Next button setup
    if (prevBtn && nextBtn) {
      const showControls = heroSlidesData.length > 1;
      prevBtn.style.display = showControls ? 'flex' : 'none';
      nextBtn.style.display = showControls ? 'flex' : 'none';

      prevBtn.onclick = () => {
        const prevIdx = (heroCurrentSlideIdx - 1 + heroSlidesData.length) % heroSlidesData.length;
        goToSlide(prevIdx);
      };
      nextBtn.onclick = () => {
        const nextIdx = (heroCurrentSlideIdx + 1) % heroSlidesData.length;
        goToSlide(nextIdx);
      };
    }

    function updateCaption(idx) {
      const cur = heroSlidesData[idx];
      if (captionBox && cur) {
        if (cur.title || cur.subtitle) {
          captionBox.style.display = 'block';
          if (titleEl) titleEl.textContent = cur.title || '';
          if (subEl) subEl.textContent = cur.subtitle || '';
        } else {
          captionBox.style.display = 'none';
        }
      }
    }

    function goToSlide(idx) {
      heroCurrentSlideIdx = idx;
      track.querySelectorAll('.hero-slide').forEach((sl, i) => {
        sl.classList.toggle('active', i === idx);
      });
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.hero-slider-dot').forEach((dt, i) => {
          dt.classList.toggle('active', i === idx);
        });
      }
      updateCaption(idx);
      resetAutoPlay();
    }

    function resetAutoPlay() {
      if (heroSliderTimer) clearInterval(heroSliderTimer);
      if (cfg.auto_slide && heroSlidesData.length > 1) {
        const intervalMs = Math.max(2000, parseInt(cfg.interval || 4000, 10));
        heroSliderTimer = setInterval(() => {
          const next = (heroCurrentSlideIdx + 1) % heroSlidesData.length;
          goToSlide(next);
        }, intervalMs);
      }
    }

    if (sliderBox) {
      sliderBox.onmouseenter = () => { if (heroSliderTimer) clearInterval(heroSliderTimer); };
      sliderBox.onmouseleave = () => { resetAutoPlay(); };
    }

    updateCaption(0);
    resetAutoPlay();
  }

  /**
   * Apply WordPress-Style Typography and Image Styling to Website
   */
  function applyContentStyling(cfg) {
    if (!cfg || typeof cfg !== 'object') return;

    // Helper: Apply text typography styles
    const applyTextStyles = (el, tCfg) => {
      if (!el || !tCfg) return;
      if (tCfg.fontSize) el.style.fontSize = `${tCfg.fontSize}px`;
      if (tCfg.fontStyle) el.style.fontStyle = tCfg.fontStyle;
      if (tCfg.fontWeight) el.style.fontWeight = tCfg.fontWeight;
      if (tCfg.alignment) el.style.textAlign = tCfg.alignment;
      
      if (tCfg.gradientEnabled) {
        const start = tCfg.gradientStart || '#059669';
        const end = tCfg.gradientEnd || '#10b981';
        el.style.backgroundImage = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
        el.style.webkitBackgroundClip = 'text';
        el.style.webkitTextFillColor = 'transparent';
        el.style.color = 'transparent';
        el.style.display = 'inline-block';
      } else if (tCfg.color) {
        el.style.backgroundImage = 'none';
        el.style.webkitBackgroundClip = '';
        el.style.webkitTextFillColor = '';
        el.style.color = tCfg.color;
        el.style.display = '';
      }
    };

    // Helper: Apply image styles (size, radius, border, padding, margin, brightness, blur)
    const applyImageStyles = (imgEl, iCfg) => {
      if (!imgEl || !iCfg) return;
      if (iCfg.imgWidth) imgEl.style.width = `${iCfg.imgWidth}%`;
      if (iCfg.imgRadius !== undefined) imgEl.style.borderRadius = `${iCfg.imgRadius}px`;
      if (iCfg.imgBorderWidth > 0 && iCfg.imgBorderColor) {
        imgEl.style.border = `${iCfg.imgBorderWidth}px solid ${iCfg.imgBorderColor}`;
      } else {
        imgEl.style.border = '';
      }
      if (iCfg.imgPadding !== undefined) imgEl.style.padding = `${iCfg.imgPadding}px`;

      // Brightness & Blur filters
      const bright = iCfg.imgBrightness !== undefined ? iCfg.imgBrightness : 100;
      const blur = iCfg.imgBlur !== undefined ? iCfg.imgBlur : 0;
      imgEl.style.filter = `brightness(${bright}%) blur(${blur}px)`;

      // Margin / Alignment
      if (iCfg.imgMarginAlign === 'left') {
        imgEl.style.marginLeft = '0';
        imgEl.style.marginRight = 'auto';
        imgEl.style.display = 'block';
      } else if (iCfg.imgMarginAlign === 'right') {
        imgEl.style.marginLeft = 'auto';
        imgEl.style.marginRight = '0';
        imgEl.style.display = 'block';
      } else if (iCfg.imgMarginAlign === 'center') {
        imgEl.style.marginLeft = 'auto';
        imgEl.style.marginRight = 'auto';
        imgEl.style.display = 'block';
      }

      // Elevation / Styles
      if (iCfg.imgStyle === 'elevated') {
        imgEl.style.boxShadow = '0 20px 35px -10px rgba(0, 0, 0, 0.3)';
      } else if (iCfg.imgStyle === 'glow') {
        imgEl.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.55)';
      } else if (iCfg.imgStyle === 'glass') {
        imgEl.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.25)';
        imgEl.style.border = '2px solid rgba(255, 255, 255, 0.6)';
      }
    };

    // 1. Hero Section
    if (cfg.hero) {
      applyTextStyles(document.getElementById('hero-main-title'), cfg.hero);
      const sliderBox = document.getElementById('hero-slider');
      if (sliderBox) {
        applyImageStyles(sliderBox, cfg.hero);
      }
      if (cfg.hero.imgUrl) {
        // If single image was set in WP Image Editor, replace active slide or first slide
        const firstSlideImg = document.querySelector('#hero-slider-track .hero-slide img');
        if (firstSlideImg) {
          firstSlideImg.src = normalizeImageUrl(cfg.hero.imgUrl);
        }
      }
    }

    // 2. Fitness Section
    if (cfg.fitness) {
      applyTextStyles(document.getElementById('fitness-title'), cfg.fitness);
      if (cfg.fitness.imgUrl) {
        const fit1 = document.getElementById('fitness-img-1');
        if (fit1) fit1.src = normalizeImageUrl(cfg.fitness.imgUrl);
      }
      applyImageStyles(document.getElementById('fitness-img-1'), cfg.fitness);
      applyImageStyles(document.getElementById('fitness-img-2'), cfg.fitness);
    }

    // 3. About Section
    if (cfg.about) {
      applyTextStyles(document.getElementById('about-title'), cfg.about);
      if (cfg.about.imgUrl) {
        const abImg = document.getElementById('about-img');
        if (abImg) abImg.src = normalizeImageUrl(cfg.about.imgUrl);
      }
      applyImageStyles(document.getElementById('about-img'), cfg.about);
    }
  }

  /**
   * Apply Hero Background Image / Color and Detail Layout Positioning (Top, Bottom, Left, Right)
   */
  function applyHeroLayout(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    const heroSection = document.getElementById('home');
    const heroOverlay = document.getElementById('hero-bg-overlay');
    const heroContainer = document.getElementById('hero-content-container');
    if (!heroSection || !heroContainer) return;

    // 1. Background image or theme color
    const bgType = cfg.bg_type || 'default';
    if (bgType === 'color' && cfg.bg_color) {
      heroSection.style.backgroundImage = 'none';
      heroSection.style.backgroundColor = cfg.bg_color;
    } else if (bgType === 'image' && cfg.bg_image_url) {
      const normUrl = normalizeImageUrl(cfg.bg_image_url);
      heroSection.style.backgroundImage = `url('${normUrl}')`;
      heroSection.style.backgroundSize = 'cover';
      heroSection.style.backgroundPosition = cfg.bg_position || 'center';
      heroSection.style.backgroundRepeat = 'no-repeat';
      heroSection.style.backgroundAttachment = cfg.bg_attachment === 'fixed' ? 'fixed' : 'scroll';
    } else if (bgType === 'gradient' && cfg.bg_gradient) {
      heroSection.style.backgroundImage = cfg.bg_gradient;
    } else {
      // Default: clean gradient with subtle pattern
      heroSection.style.backgroundImage = '';
      heroSection.style.backgroundColor = '';
      heroSection.style.backgroundSize = '';
      heroSection.style.backgroundPosition = '';
    }

    // 2. Background Overlay
    if (heroOverlay) {
      const overlayOpacity = cfg.overlay_opacity !== undefined ? Number(cfg.overlay_opacity) : 0;
      if (overlayOpacity > 0 && (bgType === 'image' || bgType === 'color')) {
        const overlayColor = cfg.overlay_color || '#000000';
        heroOverlay.style.backgroundColor = overlayColor;
        heroOverlay.style.opacity = (overlayOpacity / 100).toFixed(2);
      } else {
        heroOverlay.style.opacity = '0';
      }
    }

    // 3. Contrast Mode (Light text on dark backgrounds)
    const isDarkBg = (bgType === 'color' && isColorDark(cfg.bg_color)) || (bgType === 'image' && Number(cfg.overlay_opacity || 0) >= 35);
    if (cfg.contrast_mode === 'light' || (cfg.contrast_mode !== 'dark' && isDarkBg)) {
      heroSection.classList.add('hero-contrast-light');
    } else {
      heroSection.classList.remove('hero-contrast-light');
    }

    // 4. Adjust Hero Section Details: Top, Bottom, Left, Right
    // Spacing (Top & Bottom padding)
    if (cfg.padding_top !== undefined && cfg.padding_top !== '') {
      heroSection.style.paddingTop = `${cfg.padding_top}px`;
    }
    if (cfg.padding_bottom !== undefined && cfg.padding_bottom !== '') {
      heroSection.style.paddingBottom = `${cfg.padding_bottom}px`;
    }

    // Horizontal bounds & inner padding (Left & Right)
    if (cfg.max_width) {
      heroContainer.style.maxWidth = cfg.max_width;
    }
    if (cfg.padding_x !== undefined && cfg.padding_x !== '') {
      heroContainer.style.paddingLeft = `${cfg.padding_x}px`;
      heroContainer.style.paddingRight = `${cfg.padding_x}px`;
    }

    // Details Alignment: Left, Center, Right
    const align = cfg.alignment || 'center';
    heroContainer.classList.remove('hero-align-left', 'hero-align-center', 'hero-align-right');
    heroContainer.classList.add(`hero-align-${align}`);
  }

  function isColorDark(hex) {
    if (!hex || typeof hex !== 'string') return false;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return false;
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128;
  }

  // Helper to ensure English details update all active languages
  function propagateToAllTranslations(key, value) {
    if (!value) return;
    if (window.translations) {
      Object.keys(window.translations).forEach(lang => {
        if (!window.translations[lang]) window.translations[lang] = {};
        window.translations[lang][key] = value;
      });
    }
  }

  /* ----------------- Apply Sections ----------------- */
  function applySections(sections) {
    sections.forEach(sec => {
      if (sec.section_key === 'hero') {
        // Hero Title
        const heroTitleEls = document.querySelectorAll('#home h1, [data-i18n="hero_main_title"]');
        heroTitleEls.forEach(el => {
          if (sec.title) el.textContent = sec.title;
        });
        if (sec.title) propagateToAllTranslations('hero_main_title', sec.title);

        // Hero Subtitle / Tamil
        const heroSubEls = document.querySelectorAll('#home .hero-subtitle, [data-i18n="hero_tamil_title"]');
        heroSubEls.forEach(el => {
          if (sec.subtitle) el.textContent = sec.subtitle;
        });
        if (sec.subtitle) propagateToAllTranslations('hero_tamil_title', sec.subtitle);

        // Hero Description / Content
        const heroDescEls = document.querySelectorAll('[data-i18n="hero_description"], #home p[data-i18n="hero_description"]');
        heroDescEls.forEach(el => {
          if (sec.content) el.textContent = sec.content;
        });
        if (sec.content) propagateToAllTranslations('hero_description', sec.content);

        // CTA Button
        const heroCta = document.getElementById('hero-cta-btn');
        if (heroCta) {
          if (sec.button_text) {
            const span = heroCta.querySelector('span');
            if (span) span.textContent = sec.button_text;
            propagateToAllTranslations('cta_rates', sec.button_text);
          }
          if (sec.button_url) {
            heroCta.href = sec.button_url;
          }
        }
      } else if (sec.section_key === 'fitness') {
        const fitTitleEls = document.querySelectorAll('[data-i18n="fitness_title"]');
        fitTitleEls.forEach(el => {
          if (sec.title) el.textContent = sec.title;
        });
        if (sec.title) propagateToAllTranslations('fitness_title', sec.title);

        const fitDescEls = document.querySelectorAll('[data-i18n="fitness_desc"]');
        fitDescEls.forEach(el => {
          if (sec.content) el.textContent = sec.content;
        });
        if (sec.content) propagateToAllTranslations('fitness_desc', sec.content);
      } else if (sec.section_key === 'about') {
        const aboutTitleEls = document.querySelectorAll('[data-i18n="about_title"]');
        aboutTitleEls.forEach(el => {
          if (sec.title) el.textContent = sec.title;
        });
        if (sec.title) propagateToAllTranslations('about_title', sec.title);

        const aboutDescEls = document.querySelectorAll('[data-i18n="about_desc1"]');
        aboutDescEls.forEach(el => {
          if (sec.subtitle) el.textContent = sec.subtitle;
        });
        if (sec.subtitle) propagateToAllTranslations('about_desc1', sec.subtitle);

        if (sec.content) {
          const aboutContentEls = document.querySelectorAll('[data-i18n="about_desc2"]');
          aboutContentEls.forEach(el => el.textContent = sec.content);
          propagateToAllTranslations('about_desc2', sec.content);
        }
      }
    });
  }

  /* ----------------- Apply Services ----------------- */
  function applyServices(services) {
    if (!services || !services.length) return;

    // Filter active/published services and sort by display_order
    const activeServices = services.filter(s => s.status === 'published' || s.status === 'active')
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const container = document.getElementById('services-fleet-container');
    if (container && activeServices.length) {
      container.innerHTML = activeServices.map(svc => {
        const nameLower = (svc.service_name || '').toLowerCase();
        const slugLower = (svc.slug || '').toLowerCase();
        const isBicycle = slugLower.includes('bicycle') || nameLower.includes('bicycle');
        const isMotorcycle = slugLower.includes('moto') || nameLower.includes('moto') || nameLower.includes('scooter');
        const isPassenger = slugLower.includes('car') || slugLower.includes('passenger') || nameLower.includes('car') || nameLower.includes('van') || nameLower.includes('bus');

        let badgeClass = 'text-brand-dark bg-emerald-100';
        let priceClass = 'text-brand-primary';
        let btnClass = 'bg-brand-primary hover:bg-brand-dark';
        let btnText = `Reserve ${escapeHtml(svc.service_name)}`;

        if (isBicycle) {
          badgeClass = 'text-brand-dark bg-emerald-100';
          priceClass = 'text-brand-primary';
          btnClass = 'bg-brand-primary hover:bg-brand-dark';
          btnText = 'Reserve Bicycle';
        } else if (isMotorcycle) {
          badgeClass = 'text-sky-800 bg-sky-100';
          priceClass = 'text-sky-700';
          btnClass = 'bg-sky-700 hover:bg-sky-800';
          btnText = 'Reserve Motorcycle';
        } else if (isPassenger) {
          badgeClass = 'text-amber-800 bg-amber-100';
          priceClass = 'text-amber-700';
          btnClass = 'bg-amber-600 hover:bg-amber-700';
          btnText = 'Inquire Car / Van / Bus';
        } else {
          badgeClass = 'text-emerald-800 bg-emerald-100';
          priceClass = 'text-emerald-700';
          btnClass = 'bg-emerald-600 hover:bg-emerald-700';
          btnText = `Inquire ${escapeHtml(svc.service_name)}`;
        }

        const badgeLabel = svc.icon_reference || (isBicycle ? 'Eco & Cardio' : (isMotorcycle ? 'Fast Island Travel' : (isPassenger ? 'Groups & Families' : 'Island Transport')));
        const formattedPrice = typeof window.formatRentalPrice === 'function' ? window.formatRentalPrice(svc.manual_price, true) : `From Rs. ${Number(svc.manual_price).toLocaleString()}`;
        const rateText = svc.manual_price ? `${formattedPrice}/${escapeHtml(svc.price_unit || 'hr')}` : 'Inquire for Rates';
        
        // Category-specific high-resolution fallbacks
        const defaultImg = isBicycle 
          ? 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800'
          : (isMotorcycle 
              ? 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800' 
              : 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800');

        const rawImgUrl = (svc.image_url && svc.image_url.trim()) ? svc.image_url.trim() : defaultImg;
        const imgUrl = normalizeImageUrl(rawImgUrl) || defaultImg;

        return `
          <div id="service-card-${escapeHtml(svc.id)}"
            class="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between card-hover">
            <div class="h-48 overflow-hidden relative bg-gray-100">
              <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(svc.service_name)}" 
                class="w-full h-full object-cover transition duration-300 hover:scale-105"
                onerror="this.onerror=null; this.src='${defaultImg}';">
            </div>
            <div class="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs font-bold uppercase ${badgeClass} px-3 py-1 rounded-full">${escapeHtml(badgeLabel)}</span>
                  <span class="text-base font-extrabold ${priceClass}">${rateText}</span>
                </div>
                <h3 class="text-lg font-bold text-gray-900">${escapeHtml(svc.service_name)}</h3>
                <p class="mt-2 text-gray-600 text-xs sm:text-sm leading-relaxed">${escapeHtml(svc.short_description || '')}</p>
              </div>
              <a href="#booking" onclick="preselectVehicle('${escapeHtml(svc.service_name).replace(/'/g, "\\'")}', 'Hourly Rental')"
                class="mt-6 block text-center ${btnClass} text-white font-bold py-2.5 rounded-xl transition text-xs sm:text-sm shadow">${btnText}</a>
            </div>
          </div>
        `;
      }).join('');
    }

    // Keep duration pricing configs updated
    services.forEach(svc => {
      const nameLower = (svc.service_name || '').toLowerCase();
      const slugLower = (svc.slug || '').toLowerCase();
      const isBicycle = slugLower.includes('bicycle') || nameLower.includes('bicycle');
      const isMotorcycle = slugLower.includes('moto') || nameLower.includes('moto') || nameLower.includes('scooter');
      const isPassenger = slugLower.includes('car') || slugLower.includes('passenger') || nameLower.includes('car') || nameLower.includes('van') || nameLower.includes('bus');

      if (window.PRICING_CONFIG && window.PRICING_CONFIG.hourly && svc.manual_price) {
        const fmt = (amt, isFrom) => typeof window.formatRentalPrice === 'function' ? window.formatRentalPrice(amt, isFrom) : (isFrom ? 'From Rs. ' : 'Rs. ') + Number(amt).toLocaleString();
        if (isBicycle) window.PRICING_CONFIG.hourly.bicycle = fmt(svc.manual_price, false);
        if (isMotorcycle) window.PRICING_CONFIG.hourly.moto = fmt(svc.manual_price, false);
        if (isPassenger) window.PRICING_CONFIG.hourly.car = fmt(svc.manual_price, true);
      }
    });
  }

  /* ----------------- Apply Promotional Offers ----------------- */
  function applyOffers(offers) {
    const banner = document.getElementById('promo-offer-banner');
    if (!banner || !offers || !offers.length) return;

    const offer = offers[0]; // Active top offer
    const badge = document.getElementById('promo-discount-badge');
    const title = document.getElementById('promo-offer-title');
    const desc = document.getElementById('promo-offer-desc');
    const btn = document.getElementById('promo-offer-btn');
    const btnText = document.getElementById('promo-offer-btn-text');

    if (badge && offer.discount_value) badge.textContent = offer.discount_value;
    if (title && offer.title) title.textContent = offer.title;
    if (desc && offer.description) desc.textContent = offer.description;
    if (btn) {
      if (offer.button_url) btn.href = offer.button_url;
      if (btnText && offer.button_text) btnText.textContent = offer.button_text;
    }

    banner.classList.remove('hidden');

    // Attach Offer Section Animation (Item 3)
    let animConfig = window.OFFER_ANIMATION_CONFIG;
    if (!animConfig) {
      try {
        const cached = localStorage.getItem('mgr_setting_offer_animation_config');
        if (cached) animConfig = JSON.parse(cached);
      } catch (e) {}
    }
    applyOfferAnimation(animConfig || { enabled: true, style: 'all-combined', speed: 'normal', badge_pulse: true, button_bounce: true });
  }

  /* ----------------- Apply Offer Animation (Item 3) ----------------- */
  function applyOfferAnimation(config) {
    const banner = document.getElementById('promo-offer-banner');
    const badge = document.getElementById('promo-discount-badge');
    const btn = document.getElementById('promo-offer-btn');
    if (!banner) return;

    // Reset previous animation classes
    banner.classList.remove(
      'offer-animated',
      'offer-anim-shimmer',
      'offer-anim-glow',
      'offer-speed-fast',
      'offer-speed-normal',
      'offer-speed-gentle'
    );
    if (badge) badge.classList.remove('offer-badge-pulse');
    if (btn) btn.classList.remove('offer-btn-bounce');

    const cfg = config || { enabled: true, style: 'all-combined', speed: 'normal', badge_pulse: true, button_bounce: true };

    if (cfg.enabled === false) {
      return; // Disabled: banner remains clean and static
    }

    banner.classList.add('offer-animated');

    // Speed class
    const speed = cfg.speed || 'normal';
    banner.classList.add(`offer-speed-${speed}`);

    // Style class
    const style = cfg.style || 'all-combined';
    if (style === 'shimmer-wave') {
      banner.classList.add('offer-anim-shimmer');
    } else if (style === 'pulse-glow') {
      banner.classList.add('offer-anim-glow');
    } else if (style === 'bounce-cta') {
      // CTA & Badge bounce only
    } else { // 'all-combined'
      banner.classList.add('offer-anim-shimmer', 'offer-anim-glow');
    }

    // Badge Pulse
    if (cfg.badge_pulse !== false && badge) {
      badge.classList.add('offer-badge-pulse');
    }

    // Button Bounce
    if (cfg.button_bounce !== false && btn) {
      btn.classList.add('offer-btn-bounce');
    }
  }

  /* ----------------- Apply Dedicated SEO & Keywords ----------------- */
  function applySeoMetadata(seoList) {
    const active = seoList.find(s => s.page_slug === 'home') || seoList.find(s => s.page_slug === 'global');
    if (!active) return;

    if (active.seo_title) {
      document.title = active.seo_title;
    }

    if (active.meta_description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = active.meta_description;
    }

    if (active.keywords) {
      let metaKw = document.querySelector('meta[name="keywords"]');
      if (!metaKw) {
        metaKw = document.createElement('meta');
        metaKw.name = 'keywords';
        document.head.appendChild(metaKw);
      }
      metaKw.content = active.keywords;
    }

    if (active.canonical_url) {
      let linkCanon = document.querySelector('link[rel="canonical"]');
      if (!linkCanon) {
        linkCanon = document.createElement('link');
        linkCanon.rel = 'canonical';
        document.head.appendChild(linkCanon);
      }
      linkCanon.href = active.canonical_url;
    }

    if (active.og_title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = active.og_title;
    }

    if (active.og_description) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.content = active.og_description;
    }
  }

  /* ----------------- Apply Testimonials ----------------- */
  function applyTestimonials(testimonials) {
    const track = document.querySelector('.animate-marquee');
    if (!track || !testimonials.length) return;

    const html = testimonials.map(t => `
      <div class="w-80 bg-gray-50 border border-gray-200 p-6 rounded-2xl flex-shrink-0 shadow-sm">
        <div class="flex items-center text-amber-400 text-xs mb-2">
          ${Array(t.rating || 5).fill('<i class="fa-solid fa-star"></i>').join('')}
        </div>
        <p class="text-xs text-gray-700 italic leading-relaxed">"${escapeHtml(t.quote)}"</p>
        <div class="mt-4 flex items-center space-x-3 pt-3 border-t border-gray-200">
          ${t.avatar_url 
            ? `<img src="${escapeHtml(t.avatar_url)}" alt="${escapeHtml(t.author_name)}" class="w-8 h-8 rounded-full object-cover border border-emerald-200" onerror="this.outerHTML='<div class=\\'w-8 h-8 rounded-full bg-emerald-100 text-brand-primary flex items-center justify-center font-bold text-xs\\'>${escapeHtml((t.author_name || 'U').charAt(0))}</div>'">`
            : `<div class="w-8 h-8 rounded-full bg-emerald-100 text-brand-primary flex items-center justify-center font-bold text-xs">
                ${escapeHtml((t.author_name || 'U').charAt(0))}
               </div>`
          }
          <div>
            <p class="text-xs font-bold text-gray-900">${escapeHtml(t.author_name)}</p>
            <p class="text-[10px] text-gray-500">${escapeHtml(t.author_role || 'Rider')}</p>
          </div>
        </div>
      </div>
    `).join('');

    track.innerHTML = html + html;
  }

  /* ----------------- Apply Blogs ----------------- */
  function applyBlogs(blogs) {
    const blogContainer = document.querySelector('#blogs .grid');
    if (!blogContainer || !blogs.length) return;

    const defaultBlogImg = 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=800';

    blogContainer.innerHTML = blogs.map(blog => {
      const rawImg = (blog.featured_image_url && blog.featured_image_url.trim()) ? blog.featured_image_url.trim() : defaultBlogImg;
      const imgUrl = normalizeImageUrl(rawImg) || defaultBlogImg;

      return `
        <article class="bg-white rounded-2xl overflow-hidden border border-gray-200 flex flex-col hover:shadow-md transition card-hover">
          <div class="h-44 w-full overflow-hidden relative bg-gray-100">
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(blog.title)}" 
              class="w-full h-full object-cover transition duration-300 hover:scale-105"
              onerror="this.onerror=null; this.src='${defaultBlogImg}';">
          </div>
          <div class="p-6 flex-1 flex flex-col justify-between">
            <div>
              <span class="text-xs text-brand-primary font-bold uppercase">${escapeHtml(blog.category_id || 'Route Guide')}</span>
              <h3 class="text-base font-bold text-gray-900 mt-1">${escapeHtml(blog.title)}</h3>
              <p class="text-gray-600 text-xs mt-2 leading-relaxed">${escapeHtml(blog.summary || '')}</p>
            </div>
            <a href="#contact" class="mt-4 text-brand-primary font-semibold text-xs hover:underline">Read Article &rarr;</a>
          </div>
        </article>
      `;
    }).join('');
  }

  /* ----------------- URL Normalization ----------------- */
  function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();
    if (!url) return '';

    // Convert Google Drive view or open links to direct thumbnail CDN
    const driveMatch1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const driveMatch2 = url.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
    const driveId = (driveMatch1 && driveMatch1[1]) || (driveMatch2 && driveMatch2[1]);

    if (driveId) {
      return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
    }

    return url;
  }

  /* ----------------- Mannar GA Grand Launch Ceremony ----------------- */
  function initLaunchCeremony(config) {
    let cfg = {
      active: false,
      countdown_seconds: 5,
      front_image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800',
      title: 'Official Website Launch Ceremony',
      subtitle: 'Mannar Green Ride Eco-Mobility & Tourism Network',
      guest_name: 'Inaugurated by Hon. Government Agent / District Secretary of Mannar',
      button_text: 'START',
      enable_sound: true
    };

    if (config) {
      if (typeof config === 'string') {
        try { cfg = { ...cfg, ...JSON.parse(config) }; } catch (e) {}
      } else if (typeof config === 'object') {
        cfg = { ...cfg, ...config };
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isRehearsal = urlParams.get('ceremony') === 'true' || urlParams.get('launch') === 'true' || urlParams.get('rehearse') === '1';

    // If rehearsal requested, clear any previous launched flag
    if (isRehearsal) {
      sessionStorage.removeItem('mgr_ceremony_launched');
    }

    const alreadyLaunched = sessionStorage.getItem('mgr_ceremony_launched') === 'true';

    // Determine whether to display the ceremony screen
    const shouldShow = (cfg.active || isRehearsal) && !alreadyLaunched;

    const screen = document.getElementById('ga-launch-screen');
    if (!screen) return;

    if (!shouldShow) {
      screen.classList.add('hidden');
      screen.style.display = 'none';
      document.body.style.overflow = '';
      return;
    }

    // Populate ceremony elements
    screen.classList.remove('hidden');
    screen.classList.remove('launch-unveil');
    screen.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const titleEl = document.getElementById('ga-ceremony-title');
    if (titleEl && cfg.title) titleEl.textContent = cfg.title;

    const subtitleEl = document.getElementById('ga-ceremony-subtitle');
    if (subtitleEl && cfg.subtitle) subtitleEl.textContent = cfg.subtitle;

    const guestEl = document.getElementById('ga-guest-name');
    if (guestEl && cfg.guest_name) guestEl.textContent = cfg.guest_name;

    const btnTextEl = document.getElementById('ga-btn-text');
    if (btnTextEl && cfg.button_text) btnTextEl.textContent = cfg.button_text;

    const frontImg = document.getElementById('ga-front-image');
    if (frontImg) {
      const defaultImg = 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800';
      const resolved = normalizeImageUrl(cfg.front_image) || defaultImg;
      frontImg.src = resolved;
      frontImg.onerror = () => { frontImg.src = defaultImg; };
    }

    const btnStart = document.getElementById('btn-ga-launch-start');
    const buttonZone = document.getElementById('ga-button-zone');
    const countdownZone = document.getElementById('ga-countdown-zone');
    const countdownNum = document.getElementById('ga-countdown-number');
    const progressBar = document.getElementById('ga-progress-bar');
    const celebrationZone = document.getElementById('ga-celebration-zone');
    const btnEnter = document.getElementById('btn-enter-site');

    // Reset view states
    if (buttonZone) buttonZone.classList.remove('hidden');
    if (countdownZone) countdownZone.classList.add('hidden');
    if (celebrationZone) celebrationZone.classList.add('hidden');

    // Audio synthesizer context (initialized on user gesture)
    let audioCtx = null;
    function playBeep(freq = 880, duration = 0.12, type = 'sine') {
      if (cfg.enable_sound === false) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    function playFanfare() {
      if (cfg.enable_sound === false) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.8);
          }, idx * 140);
        });
      } catch (e) {}
    }

    // Canvas Confetti / Fireworks
    function launchCelebrationFireworks() {
      const canvas = document.getElementById('ga-fireworks-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#10b981', '#34d399', '#fef08a', '#38bdf8', '#fbbf24', '#ffffff'];

      for (let i = 0; i < 200; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 26,
          vy: (Math.random() - 0.5) * 26 - 4,
          radius: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.012 + 0.006
        });
      }

      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeCount = 0;
        particles.forEach(p => {
          if (p.alpha > 0) {
            activeCount++;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.25; // gravity
            p.alpha -= p.decay;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
        if (activeCount > 0) {
          requestAnimationFrame(animate);
        }
      }
      animate();
    }

    // Finish Launch and Reveal Live Website
    function completeLaunch() {
      sessionStorage.setItem('mgr_ceremony_launched', 'true');
      screen.classList.add('launch-unveil');
      document.body.style.overflow = '';
      setTimeout(() => {
        screen.classList.add('hidden');
        screen.style.display = 'none';
      }, 1200);
    }

    if (btnEnter) {
      btnEnter.onclick = completeLaunch;
    }

    // Start Button Action
    if (btnStart) {
      btnStart.onclick = () => {
        if (buttonZone) buttonZone.classList.add('hidden');
        if (countdownZone) countdownZone.classList.remove('hidden');

        let duration = parseInt(cfg.countdown_seconds, 10) || 5;
        if (duration < 3) duration = 3;
        const total = duration;
        const circumference = 565.48; // 2 * PI * 90

        if (countdownNum) countdownNum.textContent = duration;
        playBeep(880, 0.15);

        const timer = setInterval(() => {
          duration--;
          if (countdownNum) countdownNum.textContent = duration;

          if (progressBar) {
            const fraction = (total - duration) / total;
            progressBar.style.strokeDashoffset = (circumference * fraction).toFixed(2);
          }

          if (duration > 0) {
            playBeep(880 + (total - duration) * 120, 0.15);
          } else {
            clearInterval(timer);
            if (countdownZone) countdownZone.classList.add('hidden');
            if (celebrationZone) celebrationZone.classList.remove('hidden');
            playFanfare();
            launchCelebrationFireworks();
            setTimeout(completeLaunch, 3200);
          }
        }, 1000);
      };
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Self-initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCMS);
  } else {
    initCMS();
  }
})();
