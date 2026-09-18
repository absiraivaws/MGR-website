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

      if (settings && settings.length) {
        applySettings(settings);
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

      // 4. Fetch Published Services & Pricing
      const { data: services } = await supabaseClient
        .from('website_services')
        .select('*')
        .eq('status', 'published')
        .order('display_order');

      if (services && services.length) {
        applyServices(services);
      }

      // 5. Fetch Active Promotional Offers
      try {
        const { data: offers } = await supabaseClient
          .from('website_offers')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

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

      // 7. Fetch Published Testimonials
      const { data: testimonials } = await supabaseClient
        .from('website_testimonials')
        .select('*')
        .eq('status', 'published')
        .order('display_order');

      if (testimonials && testimonials.length) {
        applyTestimonials(testimonials);
      }

      // 8. Fetch Published Blogs
      const { data: blogs } = await supabaseClient
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);

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
        if (window.translations && window.translations.en && sec.title) {
          window.translations.en.hero_main_title = sec.title;
        }

        // Hero Subtitle / Tamil
        const heroSubEls = document.querySelectorAll('#home .hero-subtitle, [data-i18n="hero_tamil_title"]');
        heroSubEls.forEach(el => {
          if (sec.subtitle) el.textContent = sec.subtitle;
        });
        if (window.translations && window.translations.en && sec.subtitle) {
          window.translations.en.hero_tamil_title = sec.subtitle;
        }

        // Hero Description / Content
        const heroDescEls = document.querySelectorAll('[data-i18n="hero_description"], #home p[data-i18n="hero_description"]');
        heroDescEls.forEach(el => {
          if (sec.content) el.textContent = sec.content;
        });
        if (window.translations && window.translations.en && sec.content) {
          window.translations.en.hero_description = sec.content;
        }

        // CTA Button
        const heroCta = document.getElementById('hero-cta-btn');
        if (heroCta) {
          if (sec.button_text) {
            const span = heroCta.querySelector('span');
            if (span) span.textContent = sec.button_text;
            if (window.translations && window.translations.en) {
              window.translations.en.cta_rates = sec.button_text;
            }
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
        if (window.translations && window.translations.en && sec.title) {
          window.translations.en.fitness_title = sec.title;
        }

        const fitDescEls = document.querySelectorAll('[data-i18n="fitness_desc"]');
        fitDescEls.forEach(el => {
          if (sec.content) el.textContent = sec.content;
        });
        if (window.translations && window.translations.en && sec.content) {
          window.translations.en.fitness_desc = sec.content;
        }
      } else if (sec.section_key === 'about') {
        const aboutTitleEls = document.querySelectorAll('[data-i18n="about_title"]');
        aboutTitleEls.forEach(el => {
          if (sec.title) el.textContent = sec.title;
        });
        if (window.translations && window.translations.en && sec.title) {
          window.translations.en.about_title = sec.title;
        }

        const aboutDescEls = document.querySelectorAll('[data-i18n="about_desc1"]');
        aboutDescEls.forEach(el => {
          if (sec.subtitle) el.textContent = sec.subtitle;
        });
        if (window.translations && window.translations.en && sec.subtitle) {
          window.translations.en.about_desc1 = sec.subtitle;
        }

        if (sec.content) {
          const aboutContentEls = document.querySelectorAll('[data-i18n="about_desc2"]');
          aboutContentEls.forEach(el => el.textContent = sec.content);
          if (window.translations && window.translations.en) {
            window.translations.en.about_desc2 = sec.content;
          }
        }
      }
    });
  }

  /* ----------------- Apply Services ----------------- */
  function applyServices(services) {
    services.forEach(svc => {
      const isBicycle = svc.slug === 'bicycle-rental' || svc.service_name.toLowerCase().includes('bicycle');
      const isMotorcycle = svc.slug === 'motorcycle-rental' || svc.service_name.toLowerCase().includes('motorcycle');
      const isPassenger = svc.slug === 'passenger-transport' || svc.service_name.toLowerCase().includes('passenger');

      if (isBicycle) {
        const rateEl = document.getElementById('price-bicycle');
        const unitEl = document.getElementById('unit-bicycle');
        if (rateEl && svc.manual_price) {
          rateEl.textContent = `Rs. ${svc.manual_price}`;
        }
        if (unitEl && svc.price_unit) {
          unitEl.textContent = `/ ${svc.price_unit}`;
        }
        if (window.PRICING_CONFIG && window.PRICING_CONFIG.hourly && svc.manual_price) {
          window.PRICING_CONFIG.hourly.bicycle = `Rs. ${svc.manual_price}`;
        }
      } else if (isMotorcycle) {
        const rateEl = document.getElementById('price-moto');
        const unitEl = document.getElementById('unit-moto');
        if (rateEl && svc.manual_price) {
          rateEl.textContent = `Rs. ${svc.manual_price}`;
        }
        if (unitEl && svc.price_unit) {
          unitEl.textContent = `/ ${svc.price_unit}`;
        }
        if (window.PRICING_CONFIG && window.PRICING_CONFIG.hourly && svc.manual_price) {
          window.PRICING_CONFIG.hourly.moto = `Rs. ${svc.manual_price}`;
        }
      } else if (isPassenger) {
        const rateEl = document.getElementById('price-car');
        const unitEl = document.getElementById('unit-car');
        if (rateEl && svc.manual_price) {
          rateEl.textContent = `From Rs. ${Number(svc.manual_price).toLocaleString()}`;
        }
        if (unitEl && svc.price_unit) {
          unitEl.textContent = `/ ${svc.price_unit}`;
        }
        if (window.PRICING_CONFIG && window.PRICING_CONFIG.hourly && svc.manual_price) {
          window.PRICING_CONFIG.hourly.car = `From Rs. ${Number(svc.manual_price).toLocaleString()}`;
        }
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
          <div class="w-8 h-8 rounded-full bg-emerald-100 text-brand-primary flex items-center justify-center font-bold text-xs">
            ${escapeHtml((t.author_name || 'U').charAt(0))}
          </div>
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
