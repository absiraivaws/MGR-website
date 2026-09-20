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
      ['transport_categories', 'statistics_counters_config', 'join_us_config', 'reviews_slider_config', 'host_whatsapp_group_url', 'host_vehicle_cards', 'fitness_feature_cards', 'about_feature_cards'].forEach(k => {
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

    // Duration Pricing Matrix (Hourly, Half-Day, Full-Day)
    if (map.pricing_matrix) {
      try {
        const matrix = typeof map.pricing_matrix === 'string' ? JSON.parse(map.pricing_matrix) : map.pricing_matrix;
        if (matrix && window.PRICING_CONFIG) {
          if (matrix.hourly) {
            if (matrix.hourly.bicycle) window.PRICING_CONFIG.hourly.bicycle = `Rs. ${matrix.hourly.bicycle}`;
            if (matrix.hourly.moto) window.PRICING_CONFIG.hourly.moto = `Rs. ${matrix.hourly.moto}`;
            if (matrix.hourly.car) window.PRICING_CONFIG.hourly.car = `From Rs. ${Number(matrix.hourly.car).toLocaleString()}`;
          }
          if (matrix.halfday) {
            if (matrix.halfday.bicycle) window.PRICING_CONFIG.halfday.bicycle = `Rs. ${matrix.halfday.bicycle}`;
            if (matrix.halfday.moto) window.PRICING_CONFIG.halfday.moto = `Rs. ${matrix.halfday.moto}`;
            if (matrix.halfday.car) window.PRICING_CONFIG.halfday.car = `From Rs. ${Number(matrix.halfday.car).toLocaleString()}`;
          }
          if (matrix.fullday) {
            if (matrix.fullday.bicycle) window.PRICING_CONFIG.fullday.bicycle = `Rs. ${matrix.fullday.bicycle}`;
            if (matrix.fullday.moto) window.PRICING_CONFIG.fullday.moto = `Rs. ${matrix.fullday.moto}`;
            if (matrix.fullday.car) window.PRICING_CONFIG.fullday.car = `From Rs. ${Number(matrix.fullday.car).toLocaleString()}`;
          }
          if (typeof window.switchPricingDuration === 'function') {
            window.switchPricingDuration(window.currentDurationTab || 'hourly');
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
        const rateText = svc.manual_price ? `From Rs. ${Number(svc.manual_price).toLocaleString()}/${escapeHtml(svc.price_unit || 'hr')}` : 'Inquire for Rates';
        const imgUrl = svc.image_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';

        return `
          <div id="service-card-${escapeHtml(svc.id)}"
            class="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between card-hover">
            <div class="h-48 bg-cover bg-center" style="background-image: url('${escapeHtml(imgUrl)}');"></div>
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
        if (isBicycle) window.PRICING_CONFIG.hourly.bicycle = `Rs. ${svc.manual_price}`;
        if (isMotorcycle) window.PRICING_CONFIG.hourly.moto = `Rs. ${svc.manual_price}`;
        if (isPassenger) window.PRICING_CONFIG.hourly.car = `From Rs. ${Number(svc.manual_price).toLocaleString()}`;
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

    blogContainer.innerHTML = blogs.map(blog => `
      <article class="bg-white rounded-2xl overflow-hidden border border-gray-200 flex flex-col hover:shadow-md transition card-hover">
        <img src="${escapeHtml(blog.featured_image_url || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=600')}" alt="${escapeHtml(blog.title)}" class="h-44 w-full object-cover">
        <div class="p-6 flex-1 flex flex-col justify-between">
          <div>
            <span class="text-xs text-brand-primary font-bold uppercase">${escapeHtml(blog.category_id || 'Route Guide')}</span>
            <h3 class="text-base font-bold text-gray-900 mt-1">${escapeHtml(blog.title)}</h3>
            <p class="text-gray-600 text-xs mt-2 leading-relaxed">${escapeHtml(blog.summary || '')}</p>
          </div>
          <a href="#contact" class="mt-4 text-brand-primary font-semibold text-xs hover:underline">Read Article &rarr;</a>
        </div>
      </article>
    `).join('');
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
