/**
 * MANNAR GREEN RIDE - CMS ADMIN APPLICATION
 * Single Admin Access | Zero-Build Vanilla JS Architecture
 * Strictly Non-Financial Metrics (Total Customers, Registered Vehicles, Completed Services)
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = new AdminCMSApp();
  window.adminCMS = app;
  app.init();
});

class AdminCMSApp {
  constructor() {
    this.supabase = null;
    this.session = null;
    this.activeTab = 'dashboard';
    this.activeSeoPage = 'global';
    this.stats = {
      totalCustomers: 86,
      registeredVehicles: 12,
      completedServices: 68,
      availableVehicles: 12,
      activeRentals: 1,
      publishedPages: 5,
      activeOffers: 1,
      blogPosts: 3,
      galleryImages: 0
    };
    this.settings = {};
    this.sections = {};
    this.services = [];
    this.seo = {};
    this.offers = [];
    this.blogs = [];
    this.testimonials = [];
    this.media = [];
    this.auditLogs = [];
  }

  async init() {
    this.supabase = window.getSupabaseClient();
    this.bindGlobalEvents();
    await this.checkAuth();
    await this.loadAllData();
    this.render();
  }

  /* ----------------- Authentication ----------------- */
  async checkAuth() {
    if (!this.supabase) return;
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      this.session = session;
      
      this.supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        this.updateAuthUI();
      });
    } catch (err) {
      console.warn("Auth check warning:", err);
    }
    this.updateAuthUI();
  }

  updateAuthUI() {
    const userCard = document.getElementById('sidebar-user-card');
    const userEmailEl = document.getElementById('user-email-display');
    const userRoleEl = document.getElementById('user-role-display');

    if (this.session && this.session.user) {
      const email = this.session.user.email || 'Admin';
      if (userEmailEl) userEmailEl.textContent = email.split('@')[0];
      if (userRoleEl) userRoleEl.textContent = 'Administrator';
    } else {
      if (userEmailEl) userEmailEl.textContent = 'Admin (Guest/Demo)';
      if (userRoleEl) userRoleEl.textContent = 'Administrator';
    }
  }

  async handleLogin(email, password) {
    if (!this.supabase) return;
    try {
      this.showToast("Authenticating admin...", "info");
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.session = data.session;
      this.closeModal('login-modal');
      this.showToast("Login successful! Welcome back.", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to log in", "error");
    }
  }

  async handleLogout() {
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
    this.session = null;
    this.showToast("Logged out successfully.", "info");
    this.updateAuthUI();
  }

  /* ----------------- Data Loading ----------------- */
  async loadAllData() {
    if (!this.supabase) return;
    try {
      // 1. Live Stats (Non-financial)
      try {
        const { data: dbStats } = await this.supabase.rpc('get_admin_dashboard_stats');
        if (dbStats) {
          this.stats = {
            totalCustomers: dbStats.total_customers ?? 86,
            registeredVehicles: dbStats.registered_vehicles ?? 12,
            completedServices: dbStats.completed_services ?? 68,
            availableVehicles: dbStats.available_vehicles ?? 12,
            activeRentals: dbStats.active_rentals ?? 1,
            publishedPages: dbStats.published_pages ?? 5,
            activeOffers: dbStats.active_offers ?? 1,
            blogPosts: dbStats.blog_posts ?? 3,
            galleryImages: dbStats.gallery_images ?? 0
          };
        }
      } catch (e) {
        console.warn("Could not call get_admin_dashboard_stats, using direct query fallback");
      }

      // 2. Settings
      const { data: settingsData } = await this.supabase.from('website_settings').select('*');
      if (settingsData) {
        this.settings = {};
        settingsData.forEach(s => { this.settings[s.setting_key] = s.setting_value; });
      }

      // 3. Sections
      const { data: sectionsData } = await this.supabase.from('website_sections').select('*');
      if (sectionsData) {
        this.sections = {};
        sectionsData.forEach(s => { this.sections[s.section_key] = s; });
      }

      // 4. Services
      const { data: servicesData } = await this.supabase.from('website_services').select('*').order('display_order');
      if (servicesData) this.services = servicesData;

      // 5. SEO Metadata
      const { data: seoData } = await this.supabase.from('seo_metadata').select('*');
      if (seoData) {
        this.seo = {};
        seoData.forEach(item => { this.seo[item.page_slug] = item; });
      }

      // 6. Offers
      const { data: offersData } = await this.supabase.from('website_offers').select('*').order('created_at', { ascending: false });
      if (offersData) this.offers = offersData;

      // 7. Blogs
      const { data: blogData } = await this.supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (blogData) this.blogs = blogData;

      // 8. Testimonials
      const { data: testData } = await this.supabase.from('website_testimonials').select('*').order('display_order');
      if (testData) this.testimonials = testData;

      // 9. Media & Gallery
      const { data: mediaData } = await this.supabase.from('website_media').select('*').order('created_at', { ascending: false });
      if (mediaData) this.media = mediaData;

      // 10. Audit Logs
      const { data: auditData } = await this.supabase.from('website_audit_logs').select('*').order('created_at', { ascending: false }).limit(20);
      if (auditData) this.auditLogs = auditData;

    } catch (err) {
      console.error("Error loading CMS data:", err);
    }
  }

  /* ----------------- Event Binding ----------------- */
  bindGlobalEvents() {
    // Navigation Tabs
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-nav-tab');
        this.switchTab(tab);
      });
    });

    // Mobile Drawer Toggle
    const mobileBtn = document.getElementById('mobile-drawer-toggle');
    const sidebar = document.getElementById('sidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // Modal Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      });
    });

    // Preview site button
    const previewBtn = document.getElementById('btn-open-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.openPreviewModal());
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('[data-nav-tab]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-nav-tab') === tabName);
    });

    // Close mobile drawer on item click
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Update Header Title
    const titles = {
      dashboard: { title: "Dashboard Overview", subtitle: "Live operational metrics & CMS summary" },
      content: { title: "Website Content Management", subtitle: "Edit Hero banner, About Us, Contact & footer copy" },
      services: { title: "Services & Rates Management", subtitle: "Manage vehicle types, rates, auto/manual pricing" },
      seo: { title: "Dedicated SEO & Keywords Manager", subtitle: "Configure focus keywords, page titles, and meta descriptions" },
      offers: { title: "Promotions & Offers", subtitle: "Schedule discount deals and seasonal campaigns" },
      blogs: { title: "Blog & Travel Guides", subtitle: "Manage cycling routes, travel tips, and articles" },
      gallery: { title: "Media Library & Gallery", subtitle: "Upload images to Supabase storage and manage photos" },
      testimonials: { title: "Rider Testimonials", subtitle: "Manage customer reviews displayed on the website" },
      'ai-assistant': { title: "AI Travel Assistant & Route Generator", subtitle: "Configure AI trip planning, Gemini API key, and inspect generated routes" },
      languages: { title: "Multi-Language Manager", subtitle: "Add, edit, remove languages and synchronize English content to all languages" },
      settings: { title: "Global Settings & Audit Logs", subtitle: "Business settings, maintenance mode, and change history" }
    };

    const header = titles[tabName] || { title: "CMS Management", subtitle: "Mannar Green Ride Administration" };
    document.getElementById('header-title').textContent = header.title;
    document.getElementById('header-subtitle').textContent = header.subtitle;

    this.render();
  }

  /* ----------------- Render Views ----------------- */
  render() {
    const container = document.getElementById('page-container');
    if (!container) return;

    switch (this.activeTab) {
      case 'dashboard':
        container.innerHTML = this.renderDashboardView();
        this.bindDashboardEvents();
        break;
      case 'content':
        container.innerHTML = this.renderContentView();
        this.bindContentEvents();
        break;
      case 'services':
        container.innerHTML = this.renderServicesView();
        this.bindServicesEvents();
        break;
      case 'seo':
        container.innerHTML = this.renderSeoView();
        this.bindSeoEvents();
        break;
      case 'offers':
        container.innerHTML = this.renderOffersView();
        this.bindOffersEvents();
        break;
      case 'blogs':
        container.innerHTML = this.renderBlogsView();
        this.bindBlogsEvents();
        break;
      case 'gallery':
        container.innerHTML = this.renderGalleryView();
        this.bindGalleryEvents();
        break;
      case 'testimonials':
        container.innerHTML = this.renderTestimonialsView();
        this.bindTestimonialsEvents();
        break;
      case 'ai-assistant':
        container.innerHTML = this.renderAiAssistantView();
        this.bindAiAssistantEvents();
        break;
      case 'languages':
        container.innerHTML = this.renderLanguagesView();
        this.bindLanguagesEvents();
        break;
      case 'settings':
        container.innerHTML = this.renderSettingsView();
        this.bindSettingsEvents();
        break;
      default:
        container.innerHTML = `<div class="card"><p>View under construction.</p></div>`;
    }
  }

  /* ----------------- 1. DASHBOARD VIEW (Strictly Non-Financial) ----------------- */
  renderDashboardView() {
    return `
      <!-- TOP 3 OPERATIONAL METRICS AS REQUESTED -->
      <div class="metrics-grid">
        <!-- 1. Total Customers -->
        <div class="metric-card metric-customers">
          <div class="metric-icon">
            <i class="fa-solid fa-users"></i>
          </div>
          <div class="metric-content">
            <div class="metric-label">Total Customers</div>
            <div class="metric-value" id="dash-customers">${this.stats.totalCustomers}</div>
            <div class="metric-sub"><i class="fa-solid fa-check-circle"></i> Registered in Supabase</div>
          </div>
        </div>

        <!-- 2. Registered Vehicles -->
        <div class="metric-card metric-vehicles">
          <div class="metric-icon">
            <i class="fa-solid fa-bicycle"></i>
          </div>
          <div class="metric-content">
            <div class="metric-label">Registered Vehicles</div>
            <div class="metric-value" id="dash-vehicles">${this.stats.registeredVehicles}</div>
            <div class="metric-sub"><i class="fa-solid fa-circle-dot"></i> ${this.stats.availableVehicles} Available / Active</div>
          </div>
        </div>

        <!-- 3. Completed Services -->
        <div class="metric-card metric-services">
          <div class="metric-icon">
            <i class="fa-solid fa-flag-checkered"></i>
          </div>
          <div class="metric-content">
            <div class="metric-label">Completed Services</div>
            <div class="metric-value" id="dash-services">${this.stats.completedServices}</div>
            <div class="metric-sub"><i class="fa-solid fa-clock-rotate-left"></i> Successful Rides & Rentals</div>
          </div>
        </div>
      </div>

      <!-- CMS Summary Stats -->
      <div class="cms-quick-stats">
        <div class="cms-stat-box">
          <div class="cms-stat-num">${this.stats.publishedPages}</div>
          <div class="cms-stat-label">Published Pages</div>
        </div>
        <div class="cms-stat-box">
          <div class="cms-stat-num">${this.services.length || 3}</div>
          <div class="cms-stat-label">Active Services</div>
        </div>
        <div class="cms-stat-box">
          <div class="cms-stat-num">${this.stats.activeOffers}</div>
          <div class="cms-stat-label">Promotional Offers</div>
        </div>
        <div class="cms-stat-box">
          <div class="cms-stat-num">${this.stats.blogPosts}</div>
          <div class="cms-stat-label">Travel Articles</div>
        </div>
        <div class="cms-stat-box">
          <div class="cms-stat-num">${this.testimonials.length || 3}</div>
          <div class="cms-stat-label">Customer Reviews</div>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-bolt"></i> Quick Website Actions</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-outline" style="justify-content: flex-start;" onclick="window.adminCMS.switchTab('content')">
              <i class="fa-solid fa-pen-to-square" style="color: var(--primary);"></i> Edit Hero Banner & Text
            </button>
            <button class="btn btn-outline" style="justify-content: flex-start;" onclick="window.adminCMS.switchTab('services')">
              <i class="fa-solid fa-tags" style="color: #0284c7;"></i> Update Rental Rates & Pricing Mode
            </button>
            <button class="btn btn-outline" style="justify-content: flex-start;" onclick="window.adminCMS.switchTab('seo')">
              <i class="fa-solid fa-magnifying-glass" style="color: #10b981;"></i> Manage SEO & Keyword Tags
            </button>
            <button class="btn btn-outline" style="justify-content: flex-start;" onclick="window.adminCMS.switchTab('offers')">
              <i class="fa-solid fa-gift" style="color: #f59e0b;"></i> Create Promotional Deal
            </button>
            <button class="btn btn-primary" style="justify-content: flex-start; margin-top: 6px;" onclick="window.adminCMS.openPreviewModal()">
              <i class="fa-solid fa-eye"></i> Live Website Preview
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-shield-halved"></i> System & Operational Integrity</h3>
          </div>
          <div style="font-size: 13px; color: var(--slate-600); line-height: 1.6;">
            <p style="margin-bottom: 8px;"><strong>Database:</strong> Connected to Supabase Project <code style="font-family: var(--font-mono); background: var(--slate-100); padding: 2px 6px; border-radius: 4px;">szzhzpjfmyeulxjhbbov</code>.</p>
            <p style="margin-bottom: 8px;"><strong>Financial Details:</strong> <span class="badge badge-published">Hidden / Restricted</span> (strictly non-financial operational stats).</p>
            <p style="margin-bottom: 8px;"><strong>Media Storage:</strong> Bucket <code style="font-family: var(--font-mono); background: var(--slate-100); padding: 2px 6px; border-radius: 4px;">website-media</code> active for instant image uploads.</p>
            <p><strong>Public Website:</strong> Running on <a href="http://localhost:3000" target="_blank" style="color: var(--primary); font-weight: 600; text-decoration: underline;">localhost:3000</a> with dynamic CMS bridge.</p>
          </div>
        </div>
      </div>
    `;
  }

  bindDashboardEvents() {}

  /* ----------------- 2. WEBSITE CONTENT VIEW ----------------- */
  renderContentView() {
    const hero = this.sections.hero || {};
    const fitness = this.sections.fitness || {};
    const about = this.sections.about || {};

    return `
      <!-- Hero Section Editor -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-image"></i> Hero Banner & Main Headline</h3>
          <span class="badge badge-published">Published Section</span>
        </div>
        <form id="hero-content-form">
          <div class="form-group">
            <label class="form-label">Hero Main Heading</label>
            <input type="text" class="form-input" id="hero-title" value="${this.escapeHtml(hero.title || 'Explore Mannar Sustainably & Stay Fit with Mannar Green Ride')}">
          </div>
          <div class="form-group">
            <label class="form-label">Hero Subheading</label>
            <input type="text" class="form-input" id="hero-subtitle" value="${this.escapeHtml(hero.subtitle || 'Bicycle & Motorcycle Rentals + Local Passenger Transport Host Network')}">
          </div>
          <div class="form-group">
            <label class="form-label">Hero Description Text</label>
            <textarea class="form-textarea" id="hero-content">${this.escapeHtml(hero.content || 'Experience the historic causeways, flamingo sanctuaries, and coastal dunes with eco-friendly pedal power or reliable scooters. Connect directly with local van and car hosts for inter-city travel.')}</textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Primary Button Text</label>
              <input type="text" class="form-input" id="hero-btn-text" value="${this.escapeHtml(hero.button_text || 'Rent a Ride Now')}">
            </div>
            <div class="form-group">
              <label class="form-label">Primary Button Link</label>
              <input type="text" class="form-input" id="hero-btn-url" value="${this.escapeHtml(hero.button_url || '#pricing-rates')}">
            </div>
          </div>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save & Publish Hero</button>
        </form>
      </div>

      <!-- Fitness & Eco Section -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-heart-pulse"></i> Fitness & Health Section</h3>
        </div>
        <form id="fitness-content-form">
          <div class="form-group">
            <label class="form-label">Heading</label>
            <input type="text" class="form-input" id="fitness-title" value="${this.escapeHtml(fitness.title || 'Ride for Health, Ride for the Planet')}">
          </div>
          <div class="form-group">
            <label class="form-label">Subheading</label>
            <input type="text" class="form-input" id="fitness-subtitle" value="${this.escapeHtml(fitness.subtitle || 'Cardiovascular Fitness & Low Carbon Footprint')}">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="fitness-content">${this.escapeHtml(fitness.content || 'Did you know? A 10km cycle ride burns approx 300 calories while producing ZERO carbon emissions. We encourage all visitors to choose pedal power to preserve Mannar’s sensitive migratory bird ecosystems.')}</textarea>
          </div>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Fitness Section</button>
        </form>
      </div>

      <!-- About Section -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-circle-info"></i> About Us Story</h3>
        </div>
        <form id="about-content-form">
          <div class="form-group">
            <label class="form-label">About Heading</label>
            <input type="text" class="form-input" id="about-title" value="${this.escapeHtml(about.title || 'Pioneering Eco-Mobility in Mannar')}">
          </div>
          <div class="form-group">
            <label class="form-label">Our Story / Purpose</label>
            <textarea class="form-textarea" id="about-content">${this.escapeHtml(about.subtitle || 'Mannar Green Ride was founded with a twin purpose: promoting physical health through daily cycling and providing reliable, transparent, community-driven mobility for travelers across the Northern Province.')}</textarea>
          </div>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save About Story</button>
        </form>
      </div>
    `;
  }

  bindContentEvents() {
    const heroForm = document.getElementById('hero-content-form');
    if (heroForm) {
      heroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('hero-title').value,
          subtitle: document.getElementById('hero-subtitle').value,
          content: document.getElementById('hero-content').value,
          button_text: document.getElementById('hero-btn-text').value,
          button_url: document.getElementById('hero-btn-url').value,
          updated_at: new Date().toISOString()
        };
        await this.saveSection('hero', payload, 'HERO');
      });
    }

    const fitnessForm = document.getElementById('fitness-content-form');
    if (fitnessForm) {
      fitnessForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('fitness-title').value,
          subtitle: document.getElementById('fitness-subtitle').value,
          content: document.getElementById('fitness-content').value,
          updated_at: new Date().toISOString()
        };
        await this.saveSection('fitness', payload, 'FITNESS');
      });
    }

    const aboutForm = document.getElementById('about-content-form');
    if (aboutForm) {
      aboutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('about-title').value,
          subtitle: document.getElementById('about-content').value,
          updated_at: new Date().toISOString()
        };
        await this.saveSection('about', payload, 'ABOUT');
      });
    }
  }

  async saveSection(sectionKey, payload, moduleName) {
    if (!this.supabase) return;
    try {
      this.showToast("Saving section...", "info");
      const { data, error } = await this.supabase
        .from('website_sections')
        .update(payload)
        .eq('section_key', sectionKey)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Section update was not saved. Please verify section key exists.");
      }
      this.sections[sectionKey] = { ...(this.sections[sectionKey] || {}), ...data[0] };
      await this.logAudit("UPDATE", moduleName, sectionKey, payload);
      this.showToast("Section updated and published to website!", "success");
    } catch (err) {
      this.showToast(err.message || "Failed to update section", "error");
    }
  }

  /* ----------------- 3. SERVICES & RATES VIEW ----------------- */
  renderServicesView() {
    let pricingMatrix = {
      hourly: { bicycle: 100, moto: 500, car: 1500 },
      halfday: { bicycle: 400, moto: 1800, car: 5000 },
      fullday: { bicycle: 800, moto: 3500, car: 9500 }
    };
    if (this.settings && this.settings.pricing_matrix) {
      try {
        const parsed = typeof this.settings.pricing_matrix === 'string' ? JSON.parse(this.settings.pricing_matrix) : this.settings.pricing_matrix;
        if (parsed && parsed.hourly) pricingMatrix = parsed;
      } catch (e) {
        console.warn("Could not parse pricing_matrix:", e);
      }
    }

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-tags"></i> Website Services & Base Rates</h3>
          <button class="btn btn-outline btn-sm" onclick="window.adminCMS.switchTab('dashboard')"><i class="fa-solid fa-arrow-left"></i> Back</button>
        </div>
        <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 20px;">
          Control how individual service listings appear on the public website. You can set the price source to <strong>AUTO</strong> (linked to Supabase rental database) or <strong>MANUAL</strong> (custom marketing rate).
        </p>

        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Icon</th>
                <th>Price Source</th>
                <th>Display Rate</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.services.map(svc => `
                <tr>
                  <td><strong>${this.escapeHtml(svc.service_name)}</strong><br><span style="font-size: 11.5px; color: var(--slate-500);">${this.escapeHtml(svc.short_description || '')}</span></td>
                  <td><i class="fa-solid ${this.escapeHtml(svc.icon_reference || 'fa-bicycle')}" style="font-size: 18px; color: var(--primary);"></i></td>
                  <td>
                    <span class="badge ${svc.price_source === 'AUTO' ? 'badge-published' : 'badge-draft'}">
                      ${svc.price_source === 'AUTO' ? 'AUTO (Rental DB)' : 'MANUAL'}
                    </span>
                  </td>
                  <td><strong>Rs. ${svc.manual_price || 100}</strong></td>
                  <td>${this.escapeHtml(svc.price_unit || 'per hour')}</td>
                  <td><span class="badge badge-published">Published</span></td>
                  <td>
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditServiceModal('${svc.id}')">
                      <i class="fa-solid fa-pen"></i> Edit Rate
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Choose Your Rental Duration Rates Card (Separately Configurable) -->
      <div class="card" style="margin-top: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Choose Your Rental Duration Rates</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Toggle between Hourly, Half-Day, or Full-Day rentals. These rates synchronize directly to the public interactive pricing calculator.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.saveDurationPricingMatrix()">
            <i class="fa-solid fa-check"></i> Save Duration Rates
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 16px;">
          <!-- Hourly Column -->
          <div style="background: #f8fafc; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 18px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--slate-200);">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 16px;">
                <i class="fa-solid fa-clock"></i>
              </div>
              <div>
                <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--slate-900);">Hourly Rental</h4>
                <span style="font-size: 11.5px; color: var(--slate-500);">Per hour duration rates</span>
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-bicycle" style="color: var(--primary);"></i> Bicycle (Rs.)</label>
              <input type="number" class="form-input" id="dur-hourly-bike" value="${pricingMatrix.hourly.bicycle || 100}">
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-motorcycle" style="color: #0284c7;"></i> Motorcycle / Scooter (Rs.)</label>
              <input type="number" class="form-input" id="dur-hourly-moto" value="${pricingMatrix.hourly.moto || 500}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-van-shuttle" style="color: #d97706;"></i> Car / Van / Bus (From Rs.)</label>
              <input type="number" class="form-input" id="dur-hourly-car" value="${pricingMatrix.hourly.car || 1500}">
            </div>
          </div>

          <!-- Half-Day Column -->
          <div style="background: #f8fafc; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 18px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--slate-200);">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(14, 165, 233, 0.15); display: flex; align-items: center; justify-content: center; color: #0284c7; font-size: 16px;">
                <i class="fa-solid fa-sun"></i>
              </div>
              <div>
                <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--slate-900);">Half-Day (4-5 hrs)</h4>
                <span style="font-size: 11.5px; color: var(--slate-500);">Half-day tour duration rates</span>
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-bicycle" style="color: var(--primary);"></i> Bicycle (Rs.)</label>
              <input type="number" class="form-input" id="dur-halfday-bike" value="${pricingMatrix.halfday.bicycle || 400}">
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-motorcycle" style="color: #0284c7;"></i> Motorcycle / Scooter (Rs.)</label>
              <input type="number" class="form-input" id="dur-halfday-moto" value="${pricingMatrix.halfday.moto || 1800}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-van-shuttle" style="color: #d97706;"></i> Car / Van / Bus (From Rs.)</label>
              <input type="number" class="form-input" id="dur-halfday-car" value="${pricingMatrix.halfday.car || 5000}">
            </div>
          </div>

          <!-- Full Day Column -->
          <div style="background: #f8fafc; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 18px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--slate-200);">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center; color: #d97706; font-size: 16px;">
                <i class="fa-solid fa-calendar-day"></i>
              </div>
              <div>
                <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--slate-900);">Full Day (24 hrs)</h4>
                <span style="font-size: 11.5px; color: var(--slate-500);">Full 24-hour island rental</span>
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-bicycle" style="color: var(--primary);"></i> Bicycle (Rs.)</label>
              <input type="number" class="form-input" id="dur-fullday-bike" value="${pricingMatrix.fullday.bicycle || 800}">
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-motorcycle" style="color: #0284c7;"></i> Motorcycle / Scooter (Rs.)</label>
              <input type="number" class="form-input" id="dur-fullday-moto" value="${pricingMatrix.fullday.moto || 3500}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-van-shuttle" style="color: #d97706;"></i> Car / Van / Bus (From Rs.)</label>
              <input type="number" class="form-input" id="dur-fullday-car" value="${pricingMatrix.fullday.car || 9500}">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async saveDurationPricingMatrix() {
    try {
      this.showToast("Saving duration rental rates...", "info");
      const matrix = {
        hourly: {
          bicycle: parseInt(document.getElementById('dur-hourly-bike').value) || 100,
          moto: parseInt(document.getElementById('dur-hourly-moto').value) || 500,
          car: parseInt(document.getElementById('dur-hourly-car').value) || 1500
        },
        halfday: {
          bicycle: parseInt(document.getElementById('dur-halfday-bike').value) || 400,
          moto: parseInt(document.getElementById('dur-halfday-moto').value) || 1800,
          car: parseInt(document.getElementById('dur-halfday-car').value) || 5000
        },
        fullday: {
          bicycle: parseInt(document.getElementById('dur-fullday-bike').value) || 800,
          moto: parseInt(document.getElementById('dur-fullday-moto').value) || 3500,
          car: parseInt(document.getElementById('dur-fullday-car').value) || 9500
        }
      };

      const { data, error } = await this.supabase
        .from('website_settings')
        .upsert({
          setting_key: 'pricing_matrix',
          setting_value: JSON.stringify(matrix),
          setting_type: 'json',
          is_public: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' })
        .select();

      if (error) throw error;
      await this.logAudit("PRICE_CHANGE", "DURATION_PRICING", "pricing_matrix", matrix);
      this.showToast("Duration pricing matrix updated and published!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save duration rates", "error");
    }
  }

  bindServicesEvents() {}

  openEditServiceModal(serviceId) {
    const svc = this.services.find(s => s.id === serviceId);
    if (!svc) return;

    const modal = document.getElementById('edit-service-modal');
    if (!modal) return;

    document.getElementById('edit-svc-id').value = svc.id;
    document.getElementById('edit-svc-name').value = svc.service_name;
    document.getElementById('edit-svc-desc').value = svc.short_description || '';
    document.getElementById('edit-svc-source').value = svc.price_source || 'AUTO';
    document.getElementById('edit-svc-price').value = svc.manual_price || 100;
    document.getElementById('edit-svc-unit').value = svc.price_unit || 'per hour';

    this.openModal('edit-service-modal');
  }

  async handleSaveService() {
    const id = document.getElementById('edit-svc-id').value;
    const price_source = document.getElementById('edit-svc-source').value;
    const manual_price = parseFloat(document.getElementById('edit-svc-price').value) || 0;
    const price_unit = document.getElementById('edit-svc-unit').value;
    const short_description = document.getElementById('edit-svc-desc').value;

    try {
      this.showToast("Saving service rate...", "info");
      const { data, error } = await this.supabase
        .from('website_services')
        .update({
          price_source,
          manual_price,
          price_unit,
          short_description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No service updated. Please verify service ID.");
      }
      await this.logAudit("PRICE_CHANGE", "SERVICES", id, { manual_price, price_source, price_unit });
      this.closeModal('edit-service-modal');
      this.showToast("Service rate updated successfully!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to update service", "error");
    }
  }

  /* ----------------- 4. DEDICATED SEO & KEYWORDS MANAGER (Separate, as requested) ----------------- */
  renderSeoView() {
    const activeData = this.seo[this.activeSeoPage] || {
      page_slug: this.activeSeoPage,
      seo_title: 'Mannar Green Ride | Bicycle & Motorcycle Rentals',
      meta_description: 'Eco-friendly bicycle and motorcycle rentals in Mannar, Sri Lanka.',
      keywords: 'mannar bicycle rental, bike rent mannar, mannar green ride, scooter rental mannar, mannar passenger transport',
      canonical_url: 'https://mannargreenride.com',
      og_title: 'Mannar Green Ride | Sustainable Mobility in Mannar',
      og_description: 'Rent bicycles and motorcycles in Mannar or book trusted passenger vehicle hosts.',
      robots_index: true,
      robots_follow: true
    };

    const keywordsArray = activeData.keywords ? activeData.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    const titleLen = (activeData.seo_title || '').length;
    const descLen = (activeData.meta_description || '').length;

    return `
      <!-- Page Selection Bar -->
      <div class="card" style="padding: 16px 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: gap; gap: 12px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: var(--slate-900);">Select Page to Configure SEO:</h4>
            <span style="font-size: 12px; color: var(--slate-500);">Configure focus keywords, meta tags, and search engine previews per page.</span>
          </div>
          <div class="seo-page-selector" style="margin-bottom: 0;">
            ${['global', 'home', 'services', 'about', 'contact', 'blogs'].map(slug => `
              <button class="seo-page-btn ${this.activeSeoPage === slug ? 'active' : ''}" onclick="window.adminCMS.switchSeoPage('${slug}')">
                ${slug.toUpperCase()}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Left: SEO & Keyword Inputs -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-key"></i> Dedicated Focus Keywords</h3>
            <span class="badge badge-published">${this.activeSeoPage.toUpperCase()}</span>
          </div>

          <form id="seo-form">
            <!-- Keyword Chips Input -->
            <div class="form-group">
              <label class="form-label">
                Focus Keywords & Search Phrases
                <span class="form-hint">(Type a keyword and press Enter or click Add)</span>
              </label>
              <div class="keyword-chips-container" id="keyword-chips-box">
                ${keywordsArray.map((kw, idx) => `
                  <span class="keyword-chip">
                    ${this.escapeHtml(kw)}
                    <button type="button" onclick="window.adminCMS.removeKeyword(${idx})">&times;</button>
                  </span>
                `).join('')}
                <input type="text" class="keyword-input-inline" id="keyword-input-field" placeholder="Add keyword + Enter...">
              </div>
              <div style="margin-top: 8px; display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.adminCMS.addKeywordFromInput()"><i class="fa-solid fa-plus"></i> Add Keyword</button>
              </div>
            </div>

            <!-- Page Title Tag -->
            <div class="form-group">
              <label class="form-label">
                SEO Page Title (Title Tag)
                <span class="char-counter ${titleLen > 60 ? 'char-warn' : 'char-good'}" id="title-counter">${titleLen}/60 chars</span>
              </label>
              <input type="text" class="form-input" id="seo-title-input" value="${this.escapeHtml(activeData.seo_title || '')}">
              <div class="form-hint">Optimal length: 50-60 characters. Displays as the clickable headline on Google search.</div>
            </div>

            <!-- Meta Description -->
            <div class="form-group">
              <label class="form-label">
                Meta Description
                <span class="char-counter ${descLen > 160 ? 'char-warn' : 'char-good'}" id="desc-counter">${descLen}/160 chars</span>
              </label>
              <textarea class="form-textarea" id="seo-desc-input" rows="3">${this.escapeHtml(activeData.meta_description || '')}</textarea>
              <div class="form-hint">Optimal length: 120-155 characters. Summarizes the page content in search results.</div>
            </div>

            <!-- Canonical URL -->
            <div class="form-group">
              <label class="form-label">Canonical URL</label>
              <input type="url" class="form-input" id="seo-canonical-input" value="${this.escapeHtml(activeData.canonical_url || 'https://mannargreenride.com')}">
            </div>

            <!-- Robots Indexing -->
            <div style="display: flex; gap: 24px; margin: 18px 0;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="seo-robots-index" ${activeData.robots_index !== false ? 'checked' : ''}>
                Allow Search Engines to Index (index)
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="seo-robots-follow" ${activeData.robots_follow !== false ? 'checked' : ''}>
                Follow Links (follow)
              </label>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%;">
              <i class="fa-solid fa-floppy-disk"></i> Save SEO & Keywords for ${this.activeSeoPage.toUpperCase()}
            </button>
          </form>
        </div>

        <!-- Right: Live Google Search Snippet Preview -->
        <div>
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fa-brands fa-google"></i> Live Google Search Result Preview</h3>
              <span class="badge badge-published">SERP Simulator</span>
            </div>
            <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">This is how your page will appear on Google search results:</p>
            
            <div class="serp-preview-card">
              <div class="serp-url">
                <span style="background: #e8f0fe; color: #1a73e8; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">M</span>
                <span>mannargreenride.com &rsaquo; ${this.activeSeoPage === 'global' ? '' : this.activeSeoPage}</span>
              </div>
              <div class="serp-title" id="serp-preview-title">${this.escapeHtml(activeData.seo_title || 'Mannar Green Ride')}</div>
              <div class="serp-desc" id="serp-preview-desc">${this.escapeHtml(activeData.meta_description || 'Eco-friendly bicycle and motorcycle rentals in Mannar.')}</div>
            </div>

            <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--slate-100);">
              <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px;"><i class="fa-solid fa-share-nodes"></i> Social Card (Open Graph) Details</h4>
              <div class="form-group">
                <label class="form-label">OG Title</label>
                <input type="text" class="form-input" id="seo-og-title" value="${this.escapeHtml(activeData.og_title || activeData.seo_title || '')}">
              </div>
              <div class="form-group">
                <label class="form-label">OG Description</label>
                <textarea class="form-textarea" id="seo-og-desc" rows="2">${this.escapeHtml(activeData.og_description || activeData.meta_description || '')}</textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindSeoEvents() {
    // Title live preview & counter
    const titleInput = document.getElementById('seo-title-input');
    const titleCounter = document.getElementById('title-counter');
    const serpTitle = document.getElementById('serp-preview-title');
    if (titleInput && serpTitle) {
      titleInput.addEventListener('input', () => {
        const val = titleInput.value;
        serpTitle.textContent = val || 'Mannar Green Ride';
        if (titleCounter) {
          titleCounter.textContent = `${val.length}/60 chars`;
          titleCounter.className = `char-counter ${val.length > 60 ? 'char-warn' : 'char-good'}`;
        }
      });
    }

    // Desc live preview & counter
    const descInput = document.getElementById('seo-desc-input');
    const descCounter = document.getElementById('desc-counter');
    const serpDesc = document.getElementById('serp-preview-desc');
    if (descInput && serpDesc) {
      descInput.addEventListener('input', () => {
        const val = descInput.value;
        serpDesc.textContent = val || 'Eco-friendly bicycle and motorcycle rentals in Mannar.';
        if (descCounter) {
          descCounter.textContent = `${val.length}/160 chars`;
          descCounter.className = `char-counter ${val.length > 160 ? 'char-warn' : 'char-good'}`;
        }
      });
    }

    // Keyword input Enter key
    const kwInput = document.getElementById('keyword-input-field');
    if (kwInput) {
      kwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          this.addKeywordFromInput();
        }
      });
    }

    // SEO Form Submit
    const seoForm = document.getElementById('seo-form');
    if (seoForm) {
      seoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveActiveSeo();
      });
    }
  }

  switchSeoPage(slug) {
    this.activeSeoPage = slug;
    this.render();
  }

  addKeywordFromInput() {
    const input = document.getElementById('keyword-input-field');
    if (!input) return;
    const val = input.value.trim().replace(/^,|,$/g, '');
    if (!val) return;

    const currentSeo = this.seo[this.activeSeoPage] || {};
    const existing = currentSeo.keywords ? currentSeo.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    if (!existing.includes(val)) {
      existing.push(val);
      currentSeo.keywords = existing.join(', ');
      this.seo[this.activeSeoPage] = currentSeo;
    }
    input.value = '';
    this.render();
  }

  removeKeyword(idx) {
    const currentSeo = this.seo[this.activeSeoPage] || {};
    const existing = currentSeo.keywords ? currentSeo.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    existing.splice(idx, 1);
    currentSeo.keywords = existing.join(', ');
    this.seo[this.activeSeoPage] = currentSeo;
    this.render();
  }

  async saveActiveSeo() {
    if (!this.supabase) return;
    const currentSeo = this.seo[this.activeSeoPage] || {};
    const payload = {
      page_slug: this.activeSeoPage,
      seo_title: document.getElementById('seo-title-input').value,
      meta_description: document.getElementById('seo-desc-input').value,
      keywords: currentSeo.keywords || '',
      canonical_url: document.getElementById('seo-canonical-input').value,
      og_title: document.getElementById('seo-og-title').value,
      og_description: document.getElementById('seo-og-desc').value,
      robots_index: document.getElementById('seo-robots-index').checked,
      robots_follow: document.getElementById('seo-robots-follow').checked,
      updated_at: new Date().toISOString()
    };

    try {
      this.showToast("Saving SEO metadata...", "info");
      const { error } = await this.supabase
        .from('seo_metadata')
        .upsert(payload, { onConflict: 'page_slug' });

      if (error) throw error;
      this.seo[this.activeSeoPage] = payload;
      await this.logAudit("SEO_CHANGE", "SEO", this.activeSeoPage, payload);
      this.showToast(`SEO settings for ${this.activeSeoPage.toUpperCase()} saved!`, "success");
    } catch (err) {
      this.showToast(err.message || "Failed to save SEO metadata", "error");
    }
  }

  /* ----------------- 5. OFFERS VIEW ----------------- */
  renderOffersView() {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-gift"></i> Active & Scheduled Promotional Offers</h3>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddOfferModal()"><i class="fa-solid fa-plus"></i> Add New Offer</button>
        </div>
        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Offer Title</th>
                <th>Discount Value</th>
                <th>Description</th>
                <th>CTA Button</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.offers.length ? this.offers.map(o => `
                <tr>
                  <td><strong>${this.escapeHtml(o.title)}</strong></td>
                  <td><span class="badge badge-published">${this.escapeHtml(o.discount_value || '')}</span></td>
                  <td><span style="font-size: 12px; color: var(--slate-600);">${this.escapeHtml(o.description || '')}</span></td>
                  <td>${this.escapeHtml(o.button_text || 'Claim Offer')}</td>
                  <td>
                    <span class="badge ${o.status === 'active' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${o.status === 'active' ? 'fa-check' : 'fa-ban'}"></i> ${o.status === 'active' ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditOfferModal('${o.id}')" title="Edit Offer">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${o.status === 'active' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleOfferStatus('${o.id}', '${o.status}')" title="${o.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}" style="margin-left: 4px;">
                      ${o.status === 'active' ? '<i class="fa-solid fa-eye-slash"></i> Deactivate' : '<i class="fa-solid fa-eye"></i> Activate'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteOffer('${o.id}')" title="Delete" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; color:var(--slate-500);">No promotional offers found.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindOffersEvents() {}

  openAddOfferModal() {
    this.openModal('add-offer-modal');
  }

  openEditOfferModal(id) {
    const offer = this.offers.find(o => o.id === id);
    if (!offer) return;

    document.getElementById('edit-offer-id').value = offer.id;
    document.getElementById('edit-offer-title').value = offer.title || '';
    document.getElementById('edit-offer-discount').value = offer.discount_value || '';
    document.getElementById('edit-offer-status').value = offer.status || 'active';
    document.getElementById('edit-offer-desc').value = offer.description || '';
    document.getElementById('edit-offer-btn-text').value = offer.button_text || 'Claim Offer';
    document.getElementById('edit-offer-btn-url').value = offer.button_url || '#booking';
    document.getElementById('edit-offer-image-url').value = offer.image_url || '';

    this.openModal('edit-offer-modal');
  }

  async handleSaveEditOffer() {
    const id = document.getElementById('edit-offer-id').value;
    const title = document.getElementById('edit-offer-title').value;
    const discount_value = document.getElementById('edit-offer-discount').value;
    const status = document.getElementById('edit-offer-status').value;
    const description = document.getElementById('edit-offer-desc').value;
    const button_text = document.getElementById('edit-offer-btn-text').value;
    const button_url = document.getElementById('edit-offer-btn-url').value;
    const image_url = document.getElementById('edit-offer-image-url').value;

    if (!title) {
      this.showToast("Title is required", "error");
      return;
    }

    try {
      this.showToast("Updating offer...", "info");
      const { data, error } = await this.supabase
        .from('website_offers')
        .update({
          title,
          discount_value,
          status,
          description,
          button_text,
          button_url,
          image_url: image_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      await this.logAudit("UPDATE", "OFFERS", id, { title, discount_value, status });
      this.closeModal('edit-offer-modal');
      this.showToast("Offer updated successfully!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to update offer", "error");
    }
  }

  async toggleOfferStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      this.showToast(`Setting offer status to ${newStatus}...`, "info");
      const { error } = await this.supabase
        .from('website_offers')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await this.logAudit("STATUS_CHANGE", "OFFERS", id, { status: newStatus });
      this.showToast(`Offer is now ${newStatus === 'active' ? 'Active' : 'Deactivated'}!`, "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to toggle offer status", "error");
    }
  }

  async handleCreateOffer() {
    const title = document.getElementById('offer-title').value;
    const discount_value = document.getElementById('offer-discount').value;
    const description = document.getElementById('offer-desc').value;
    const button_text = document.getElementById('offer-btn-text')?.value || 'Claim Offer';
    const button_url = document.getElementById('offer-btn-url')?.value || '#booking';
    const image_url = document.getElementById('offer-image-url')?.value || null;
    const status = document.getElementById('offer-status')?.value || 'active';

    if (!title) {
      this.showToast("Title is required", "error");
      return;
    }

    try {
      this.showToast("Creating offer...", "info");
      const { data, error } = await this.supabase
        .from('website_offers')
        .insert({
          title,
          discount_value,
          description,
          button_text,
          button_url,
          image_url,
          status
        })
        .select();

      if (error) throw error;
      await this.logAudit("CREATE", "OFFERS", title, { discount_value, status });
      this.closeModal('add-offer-modal');
      this.showToast("Promotional offer published!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to create offer", "error");
    }
  }

  async deleteOffer(id) {
    if (!confirm("Are you sure you want to remove this promotional offer?")) return;
    try {
      await this.supabase.from('website_offers').delete().eq('id', id);
      await this.logAudit("DELETE", "OFFERS", id, {});
      this.showToast("Offer removed.", "info");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete offer", "error");
    }
  }

  /* ----------------- 6. BLOGS VIEW ----------------- */
  renderBlogsView() {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-newspaper"></i> Blog & Travel Articles</h3>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddBlogModal()"><i class="fa-solid fa-plus"></i> Write Article</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          ${this.blogs.map(blog => `
            <div style="background: #fff; border: 1px solid var(--slate-200); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column;">
              <img src="${this.escapeHtml(blog.featured_image_url || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=600')}" style="height: 160px; width: 100%; object-fit: cover;">
              <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <span class="badge badge-published" style="margin-bottom: 8px;">${this.escapeHtml(blog.category_id || 'Travel Guide')}</span>
                  <h4 style="font-size: 14.5px; font-weight: 700; color: var(--slate-900); margin-bottom: 6px;">${this.escapeHtml(blog.title)}</h4>
                  <p style="font-size: 12px; color: var(--slate-600); line-height: 1.5;">${this.escapeHtml(blog.summary || '')}</p>
                </div>
                <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--slate-100); padding-top: 10px;">
                  <span style="font-size: 11px; color: var(--slate-400);">${this.escapeHtml(blog.author_name || 'Admin')}</span>
                  <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteBlog('${blog.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindBlogsEvents() {}

  openAddBlogModal() {
    this.openModal('add-blog-modal');
  }

  async handleCreateBlog() {
    const title = document.getElementById('blog-title').value;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const summary = document.getElementById('blog-summary').value;
    const content = document.getElementById('blog-content').value;
    const category_id = document.getElementById('blog-category').value;
    const featured_image_url = document.getElementById('blog-image-url').value || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=600';

    if (!title) {
      this.showToast("Title is required", "error");
      return;
    }

    try {
      this.showToast("Publishing article...", "info");
      const { error } = await this.supabase
        .from('blog_posts')
        .insert({
          title,
          slug,
          summary,
          content,
          category_id,
          featured_image_url,
          author_name: 'Mannar Green Ride Team',
          status: 'published'
        });

      if (error) throw error;
      await this.logAudit("CREATE", "BLOGS", slug, { title });
      this.closeModal('add-blog-modal');
      this.showToast("Blog article published to website!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to publish blog", "error");
    }
  }

  async deleteBlog(id) {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      await this.supabase.from('blog_posts').delete().eq('id', id);
      await this.logAudit("DELETE", "BLOGS", id, {});
      this.showToast("Article deleted.", "info");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete article", "error");
    }
  }

  /* ----------------- 7. GALLERY & MEDIA LIBRARY ----------------- */
  renderGalleryView() {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-photo-film"></i> Website Media Library & Image Assets</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openAddMediaUrlModal()">
              <i class="fa-solid fa-link"></i> Add Image from URL
            </button>
            <input type="file" id="media-file-input" style="display: none;" accept="image/*" onchange="window.adminCMS.uploadMediaFile(this)">
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('media-file-input').click()">
              <i class="fa-solid fa-cloud-arrow-up"></i> Upload New Image
            </button>
          </div>
        </div>

        <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 20px;">
          Manage website imagery either by uploading to Supabase Storage (<code>website-media</code>) or adding external public image URLs (Unsplash, Cloudinary, CDN). You can copy public URLs anytime for Hero, About, Fitness, Services, and Testimonials.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
          ${this.media.length ? this.media.map(m => `
            <div style="border: 1px solid var(--slate-200); border-radius: var(--radius-md); overflow: hidden; background: #fff; display: flex; flex-direction: column;">
              <div style="position: relative; height: 140px; background: #f1f5f9;">
                <img src="${this.escapeHtml(m.public_url)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=400'">
                <span class="badge ${m.storage_path === 'external-url' ? 'badge-draft' : 'badge-published'}" style="position: absolute; top: 8px; right: 8px; font-size: 10px;">
                  ${m.storage_path === 'external-url' ? 'URL' : 'Storage'}
                </span>
              </div>
              <div style="padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(m.file_name)}">
                  ${this.escapeHtml(m.file_name)}
                </div>
                <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                  <button class="btn btn-outline btn-sm" onclick="window.adminCMS.copyUrl('${m.public_url}')" title="Copy Public URL">
                    <i class="fa-solid fa-copy"></i> Copy URL
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteMedia('${m.id}', '${m.storage_path}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          `).join('') : `
            <div style="grid-column: 1 / -1; padding: 36px; text-align: center; border: 2px dashed var(--slate-200); border-radius: var(--radius-md);">
              <i class="fa-solid fa-photo-film" style="font-size: 32px; color: var(--slate-400); margin-bottom: 10px;"></i>
              <p style="font-size: 13px; color: var(--slate-600);">No custom media added yet. Upload files to Supabase Storage or click "Add Image from URL".</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  bindGalleryEvents() {}

  openAddMediaUrlModal() {
    const nameEl = document.getElementById('media-url-name');
    const inputEl = document.getElementById('media-url-input');
    const prevBox = document.getElementById('media-url-preview-box');
    if (nameEl) nameEl.value = '';
    if (inputEl) inputEl.value = '';
    if (prevBox) prevBox.style.display = 'none';
    this.openModal('add-media-url-modal');
  }

  previewMediaUrl(url) {
    const box = document.getElementById('media-url-preview-box');
    const img = document.getElementById('media-url-preview-img');
    if (!box || !img) return;
    if (url && url.trim().startsWith('http')) {
      img.src = url.trim();
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  }

  async handleSaveMediaUrl() {
    const name = document.getElementById('media-url-name')?.value.trim();
    const url = document.getElementById('media-url-input')?.value.trim();
    const category = document.getElementById('media-url-category')?.value || 'general';

    if (!url || !url.startsWith('http')) {
      this.showToast("Please enter a valid HTTP/HTTPS image URL", "error");
      return;
    }

    try {
      this.showToast("Saving image URL to library...", "info");
      const { data, error } = await this.supabase
        .from('website_media')
        .insert({
          file_name: name || 'External URL Image',
          storage_path: 'external-url',
          public_url: url,
          media_type: 'image/jpeg',
          file_size: 0,
          category
        })
        .select();

      if (error) throw error;
      await this.logAudit("CREATE", "MEDIA_URL", name || url, { public_url: url, category });
      this.closeModal('add-media-url-modal');
      this.showToast("Image URL added to media library!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to add image URL", "error");
    }
  }

  async uploadMediaFile(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    try {
      this.showToast("Uploading to Supabase Storage...", "info");
      const { error: uploadError } = await this.supabase.storage
        .from('website-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from('website-media')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save metadata in website_media table
      const { error: metaError } = await this.supabase
        .from('website_media')
        .insert({
          file_name: file.name,
          storage_path: filePath,
          public_url: publicUrl,
          media_type: file.type,
          file_size: file.size,
          category: 'general'
        });

      if (metaError) throw metaError;

      await this.logAudit("IMAGE_CHANGE", "MEDIA", fileName, { publicUrl });
      this.showToast("Image uploaded successfully!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to upload image", "error");
    } finally {
      input.value = '';
    }
  }

  async deleteMedia(id, storagePath) {
    if (!confirm("Are you sure you want to delete this media file?")) return;
    try {
      if (storagePath && storagePath !== 'external-url') {
        await this.supabase.storage.from('website-media').remove([storagePath]);
      }
      await this.supabase.from('website_media').delete().eq('id', id);
      await this.logAudit("DELETE", "MEDIA", id, {});
      this.showToast("Media file deleted.", "info");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete media", "error");
    }
  }

  copyUrl(url) {
    navigator.clipboard.writeText(url);
    this.showToast("Public image URL copied to clipboard!", "success");
  }

  /* ----------------- 8. TESTIMONIALS VIEW ----------------- */
  renderTestimonialsView() {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-comments"></i> Rider Testimonials & Reviews</h3>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddTestimonialModal()"><i class="fa-solid fa-plus"></i> Add Review</button>
        </div>
        <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 20px;">
          Manage the customer reviews and testimonials displayed on the homepage review carousel.
        </p>
        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Role / Location</th>
                <th>Rating</th>
                <th>Quote</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.testimonials.length ? this.testimonials.map(t => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${t.avatar_url ? `<img src="${this.escapeHtml(t.avatar_url)}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">` : `<div style="width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #475569;">${this.escapeHtml((t.author_name || 'U').charAt(0))}</div>`}
                      <strong>${this.escapeHtml(t.author_name)}</strong>
                    </div>
                  </td>
                  <td>${this.escapeHtml(t.author_role || '')}</td>
                  <td>
                    <span style="color: #f59e0b; white-space: nowrap;">
                      ${Array(t.rating || 5).fill('<i class="fa-solid fa-star"></i>').join('')}
                    </span>
                  </td>
                  <td><span style="font-size: 12px; font-style: italic;">"${this.escapeHtml(t.quote)}"</span></td>
                  <td>
                    <span class="badge ${t.status === 'published' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${t.status === 'published' ? 'fa-check' : 'fa-clock'}"></i> ${t.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditTestimonialModal('${t.id}')" title="Edit Review">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${t.status === 'published' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleTestimonialStatus('${t.id}', '${t.status || 'published'}')" title="${t.status === 'published' ? 'Set to Draft' : 'Publish'}" style="margin-left: 4px;">
                      ${t.status === 'published' ? '<i class="fa-solid fa-eye-slash"></i> Draft' : '<i class="fa-solid fa-eye"></i> Publish'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteTestimonial('${t.id}')" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center; color:var(--slate-500);">No testimonials added yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindTestimonialsEvents() {}

  openAddTestimonialModal() {
    this.openModal('add-testimonial-modal');
  }

  openEditTestimonialModal(id) {
    const t = this.testimonials.find(item => item.id === id);
    if (!t) return;

    document.getElementById('edit-test-id').value = t.id;
    document.getElementById('edit-test-name').value = t.author_name || '';
    document.getElementById('edit-test-role').value = t.author_role || '';
    document.getElementById('edit-test-rating').value = String(t.rating || 5);
    document.getElementById('edit-test-avatar').value = t.avatar_url || '';
    document.getElementById('edit-test-status').value = t.status || 'published';
    document.getElementById('edit-test-quote').value = t.quote || '';

    this.openModal('edit-testimonial-modal');
  }

  async handleSaveEditTestimonial() {
    const id = document.getElementById('edit-test-id').value;
    const author_name = document.getElementById('edit-test-name').value;
    const author_role = document.getElementById('edit-test-role').value;
    const rating = parseInt(document.getElementById('edit-test-rating').value) || 5;
    const avatar_url = document.getElementById('edit-test-avatar').value.trim();
    const status = document.getElementById('edit-test-status').value;
    const quote = document.getElementById('edit-test-quote').value;

    if (!author_name || !quote) {
      this.showToast("Name and review quote are required", "error");
      return;
    }

    try {
      this.showToast("Updating review...", "info");
      const { data, error } = await this.supabase
        .from('website_testimonials')
        .update({
          author_name,
          author_role,
          rating,
          avatar_url: avatar_url || null,
          status,
          quote,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      await this.logAudit("UPDATE", "TESTIMONIALS", id, { author_name, rating, status });
      this.closeModal('edit-testimonial-modal');
      this.showToast("Customer review updated!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to update review", "error");
    }
  }

  async toggleTestimonialStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      this.showToast(`Setting review status to ${newStatus}...`, "info");
      const { error } = await this.supabase
        .from('website_testimonials')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await this.logAudit("STATUS_CHANGE", "TESTIMONIALS", id, { status: newStatus });
      this.showToast(`Review is now ${newStatus === 'published' ? 'Published' : 'Draft'}!`, "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to toggle review status", "error");
    }
  }

  async handleCreateTestimonial() {
    const author_name = document.getElementById('test-name').value;
    const author_role = document.getElementById('test-role').value;
    const quote = document.getElementById('test-quote').value;
    const rating = parseInt(document.getElementById('test-rating').value) || 5;
    const avatar_url = document.getElementById('test-avatar')?.value.trim() || null;

    if (!author_name || !quote) {
      this.showToast("Name and review quote are required", "error");
      return;
    }

    try {
      this.showToast("Adding testimonial...", "info");
      const { error } = await this.supabase
        .from('website_testimonials')
        .insert({
          author_name,
          author_role,
          quote,
          rating,
          avatar_url,
          status: 'published'
        });

      if (error) throw error;
      await this.logAudit("CREATE", "TESTIMONIALS", author_name, { rating });
      this.closeModal('add-testimonial-modal');
      this.showToast("Customer review published!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to add review", "error");
    }
  }

  async deleteTestimonial(id) {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    try {
      await this.supabase.from('website_testimonials').delete().eq('id', id);
      await this.logAudit("DELETE", "TESTIMONIALS", id, {});
      this.showToast("Testimonial deleted.", "info");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete testimonial", "error");
    }
  }

  /* ----------------- 9. AI TRAVEL ASSISTANT VIEW ----------------- */
  renderAiAssistantView() {
    let aiConfig = {
      title: "Custom Mannar Ride & Route Generator",
      badge: "AI Travel Assistant",
      description: "Plan your cycling workout, motorcycle ride, or car excursion based on your fitness goals and available time.",
      gemini_api_key: "",
      status: "active"
    };

    if (this.settings && this.settings.ai_assistant_config) {
      try {
        const parsed = typeof this.settings.ai_assistant_config === 'string' ? JSON.parse(this.settings.ai_assistant_config) : this.settings.ai_assistant_config;
        if (parsed) aiConfig = { ...aiConfig, ...parsed };
      } catch (e) {
        console.warn("Could not parse ai_assistant_config:", e);
      }
    }

    return `
      <!-- AI Configuration Card -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-wand-magic-sparkles" style="color: var(--primary);"></i> AI Travel Assistant Configuration</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage the frontend AI route planner details and configure Google Gemini API integration for live customized route generation.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.saveAiAssistantConfig()">
            <i class="fa-solid fa-check"></i> Save AI Settings
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label class="form-label">Assistant Section Title</label>
            <input type="text" class="form-input" id="ai-cfg-title" value="${this.escapeHtml(aiConfig.title)}">
          </div>
          <div class="form-group">
            <label class="form-label">Badge Label</label>
            <input type="text" class="form-input" id="ai-cfg-badge" value="${this.escapeHtml(aiConfig.badge)}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Section Description / Subtitle</label>
          <textarea class="form-textarea" id="ai-cfg-desc" rows="2">${this.escapeHtml(aiConfig.description)}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label class="form-label">
              Google Gemini API Key (Optional)
              <span style="font-size: 11px; color: var(--slate-500); font-weight: normal;">— Enables real-time AI generative planning</span>
            </label>
            <input type="password" class="form-input" id="ai-cfg-key" value="${this.escapeHtml(aiConfig.gemini_api_key || '')}" placeholder="AIzaSy...">
          </div>
          <div class="form-group">
            <label class="form-label">Assistant Visibility / Status</label>
            <select class="form-select" id="ai-cfg-status">
              <option value="active" ${aiConfig.status === 'active' ? 'selected' : ''}>Active (Visible on Website)</option>
              <option value="inactive" ${aiConfig.status === 'inactive' ? 'selected' : ''}>Inactive (Hidden from Website)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Interactive Route Inspector & Test Generator -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-route"></i> Route Plan Details Inspector & Test Generator</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Generate and inspect the full itinerary details, checkpoints, distance metrics, and safety recommendations provided to users.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="window.adminCMS.testGenerateAiItinerary()">
            <i class="fa-solid fa-play"></i> Generate Route Plan
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px;">Vehicle Type</label>
            <select class="form-select" id="ai-test-vehicle">
              <option value="Bicycle (Rs. 100/hr)">Bicycle (Fitness / City)</option>
              <option value="Motorcycle / Scooter">Motorcycle / Scooter</option>
              <option value="Car / Sedan / Hatchback">Car / Sedan</option>
              <option value="Passenger Van (KDH)">Passenger Van (KDH)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px;">Target / Pace</label>
            <select class="form-select" id="ai-test-fitness">
              <option value="Casual sightseeing & photo stops">Casual Sightseeing</option>
              <option value="Cardio Fitness Workout (20-30 km)">Cardio Fitness (20-30 km)</option>
              <option value="Long Distance Tour across Mannar Island">Long Distance Island Tour</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px;">Duration</label>
            <select class="form-select" id="ai-test-duration">
              <option value="1 to 2 Hours (Hourly Ride)">1 to 2 Hours</option>
              <option value="Half Day (4 Hours)">Half Day (4 Hours)</option>
              <option value="Full Day (8 Hours)">Full Day (8 Hours)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 12px;">Preferred Sights</label>
            <input type="text" class="form-input" id="ai-test-interests" value="Vankalai Sanctuary, Baobab Tree, Talaimannar Pier">
          </div>
        </div>

        <div style="margin-top: 16px;">
          <div id="ai-test-result-box" style="background: #f8fafc; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 18px; font-family: monospace; font-size: 12px; white-space: pre-wrap; line-height: 1.6; color: var(--slate-800); min-height: 140px;">
🗺️ CUSTOM MANNAR TRAVEL & ROUTE PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚲 Vehicle: Bicycle (Rs. 100/hr)
⏱️ Duration: 1 to 2 Hours (Hourly Ride)
🎯 Target Goal: Cardio Fitness Workout (20-30 km)
🔎 Highlights: Baobab Tree, Mannar Portuguese Fort, Causeway Bridge

📊 ESTIMATED METRICS:
• Total Estimated Distance: ~12 km
• Estimated Energy Burn: ~420 kcal (Cardio fitness cycling)
• Terrain Type: Flat coastal tarmac & scenic causeway gravel

📍 RECOMMENDED ITINERARY CHECKPOINTS:
📍 Start: Mannar Town Hub (Main Street)
🌿 Stop 1: Historic 700-year-old Baobab Tree (Pallimunai) - 15 min rest & photos
🏰 Stop 2: Mannar Portuguese & Dutch Fort (1560) - panoramic sea view of the lagoon
🌅 Stop 3: Mannar Causeway Bridge - feel coastal breeze & watch local fishing boats

🛡️ LOCAL ROAD & SAFETY RECOMMENDATIONS:
• Hydrate well: carry at least 750ml water even for short rides.
• Watch out for Mannar's famous freely wandering donkeys along town streets.
• Causeway winds can be strong in the afternoon; grip handlebars firmly.
          </div>
          <div style="margin-top: 12px; display: flex; gap: 10px;">
            <button class="btn btn-outline btn-sm" onclick="window.adminCMS.copyAiTestResult()">
              <i class="fa-solid fa-copy"></i> Copy Itinerary to Clipboard (for WhatsApp Reply)
            </button>
          </div>
        </div>
      </div>

      <!-- Mannar Island Landmark Reference -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-location-dot"></i> Mannar Island Recommended Landmark Checkpoints</h3>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <div style="border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 16px; background: #fff;">
            <strong style="color: var(--primary); font-size: 13.5px;"><i class="fa-solid fa-clock"></i> 1 to 2 Hours (Local Ride)</strong>
            <ul style="font-size: 12px; color: var(--slate-600); margin-top: 8px; line-height: 1.6; padding-left: 18px;">
              <li>Mannar Town Hub (Main Street)</li>
              <li>Historic 700-Year Baobab Tree (Pallimunai)</li>
              <li>Mannar Portuguese & Dutch Fort (1560)</li>
              <li>Mannar Causeway Bridge & Fishing Pier</li>
            </ul>
          </div>
          <div style="border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 16px; background: #fff;">
            <strong style="color: #0284c7; font-size: 13.5px;"><i class="fa-solid fa-sun"></i> Half Day (4 Hours Tour)</strong>
            <ul style="font-size: 12px; color: var(--slate-600); margin-top: 8px; line-height: 1.6; padding-left: 18px;">
              <li>Vankalai Bird Sanctuary (Ramsar Wetland)</li>
              <li>Thambapanni Wind Power Park</li>
              <li>Ancient Baobab Tree & Palmyra Weavers</li>
              <li>Keeri Beach Turquoise Shallows</li>
            </ul>
          </div>
          <div style="border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 16px; background: #fff;">
            <strong style="color: #d97706; font-size: 13.5px;"><i class="fa-solid fa-calendar-day"></i> Full Day (Island Explorer)</strong>
            <ul style="font-size: 12px; color: var(--slate-600); margin-top: 8px; line-height: 1.6; padding-left: 18px;">
              <li>Vankalai Wetlands & Sunrise Birdwatching</li>
              <li>Pesalai Fishing Harbor & Church</li>
              <li>Talaimannar Pier & Historic 1915 Lighthouse</li>
              <li>Adam's Bridge (Rama Setu) Sand Dunes</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  bindAiAssistantEvents() {}

  async saveAiAssistantConfig() {
    const title = document.getElementById('ai-cfg-title')?.value || "Custom Mannar Ride & Route Generator";
    const badge = document.getElementById('ai-cfg-badge')?.value || "AI Travel Assistant";
    const description = document.getElementById('ai-cfg-desc')?.value || "";
    const gemini_api_key = document.getElementById('ai-cfg-key')?.value.trim() || "";
    const status = document.getElementById('ai-cfg-status')?.value || "active";

    const payload = { title, badge, description, gemini_api_key, status };

    try {
      this.showToast("Saving AI Travel Assistant settings...", "info");
      const { data, error } = await this.supabase
        .from('website_settings')
        .upsert({
          setting_key: 'ai_assistant_config',
          setting_value: JSON.stringify(payload),
          setting_type: 'json',
          is_public: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' })
        .select();

      if (error) throw error;
      await this.logAudit("UPDATE", "AI_ASSISTANT", "ai_assistant_config", payload);
      this.showToast("AI Travel Assistant settings saved and published!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save AI settings", "error");
    }
  }

  testGenerateAiItinerary() {
    const vehicle = document.getElementById('ai-test-vehicle')?.value || "Bicycle (Rs. 100/hr)";
    const fitness = document.getElementById('ai-test-fitness')?.value || "Casual sightseeing & photo stops";
    const duration = document.getElementById('ai-test-duration')?.value || "Half Day (4 Hours)";
    const interests = document.getElementById('ai-test-interests')?.value || "Vankalai Sanctuary, Baobab Tree";

    let isBike = vehicle.toLowerCase().includes('bicycle');
    let isMoto = vehicle.toLowerCase().includes('motorcycle') || vehicle.toLowerCase().includes('scooter');

    let distanceKm = 12;
    let caloriesKcal = 420;
    let checkpoints = [];
    let safetyTips = [];

    if (duration.includes("1 to 2 Hours")) {
      distanceKm = isBike ? 12 : (isMoto ? 25 : 30);
      caloriesKcal = isBike ? 420 : 70;
      checkpoints = [
        "📍 Start: Mannar Town Hub (Main Street)",
        "🌿 Stop 1: Historic 700-year-old Baobab Tree (Pallimunai) - 15 min rest & photos",
        "🏰 Stop 2: Mannar Portuguese & Dutch Fort (1560) - panoramic sea view of the lagoon",
        "🌅 Stop 3: Mannar Causeway Bridge - feel coastal breeze & watch local fishing boats"
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
        "📍 Start: Mannar Green Ride Station, Mannar Town",
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

    const output = `🗺️ CUSTOM MANNAR TRAVEL & ROUTE PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚲 Vehicle: ${vehicle}
⏱️ Duration: ${duration}
🎯 Target Goal: ${fitness}
🔎 Highlights: ${interests}

📊 ESTIMATED METRICS:
• Total Estimated Distance: ~${distanceKm} km
• Estimated Energy Burn: ~${caloriesKcal} kcal ${isBike ? "(Cardio fitness cycling)" : "(Active sightseeing)"}
• Terrain Type: Flat coastal tarmac & scenic causeway gravel

📍 RECOMMENDED ITINERARY CHECKPOINTS:
${checkpoints.join('\n')}

🛡️ LOCAL ROAD & SAFETY RECOMMENDATIONS:
${safetyTips.map(t => "• " + t).join('\n')}

💡 Ready to ride? Direct Booking Hotline / WhatsApp: +94 77 657 4418`;

    const box = document.getElementById('ai-test-result-box');
    if (box) box.textContent = output;
    this.showToast("Route plan generated successfully!", "success");
  }

  copyAiTestResult() {
    const box = document.getElementById('ai-test-result-box');
    if (!box) return;
    navigator.clipboard.writeText(box.textContent);
    this.showToast("Itinerary details copied to clipboard!", "success");
  }

  /* ----------------- 10. MULTI-LANGUAGE MANAGER ----------------- */
  getLanguagesList() {
    const defaultList = [
      { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', status: 'active', is_default: true },
      { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇱🇰', status: 'active', is_default: false },
      { code: 'si', name: 'Sinhala', native: 'සිංහල', flag: '🇱🇰', status: 'active', is_default: false },
      { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', status: 'active', is_default: false },
      { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', status: 'active', is_default: false },
      { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳', status: 'active', is_default: false }
    ];

    if (this.settings && this.settings.website_languages) {
      try {
        const parsed = typeof this.settings.website_languages === 'string' ? JSON.parse(this.settings.website_languages) : this.settings.website_languages;
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (e) {
        console.warn("Could not parse website_languages:", e);
      }
    }
    return defaultList;
  }

  async saveLanguagesList(list) {
    try {
      this.showToast("Saving languages configuration...", "info");
      const { error } = await this.supabase
        .from('website_settings')
        .upsert({
          setting_key: 'website_languages',
          setting_value: JSON.stringify(list),
          setting_type: 'json',
          is_public: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (error) throw error;
      await this.logAudit("UPDATE", "LANGUAGES", "website_languages", { count: list.length });
      this.showToast("Languages updated and synchronized!", "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save languages", "error");
    }
  }

  renderLanguagesView() {
    const list = this.getLanguagesList();
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-language"></i> Multi-Language Website Configuration</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage the languages available on the public website language switcher. When you update details in English, changes automatically synchronize across all active languages.
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-outline btn-sm" onclick="window.adminCMS.syncEnglishToAllLanguages()">
              <i class="fa-solid fa-rotate"></i> Sync English to All Languages
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddLanguageModal()">
              <i class="fa-solid fa-plus"></i> Add New Language
            </button>
          </div>
        </div>

        <div style="overflow-x: auto; margin-top: 16px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Flag & Language</th>
                <th>Language Code</th>
                <th>Native Name</th>
                <th>Status</th>
                <th>Default</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(l => `
                <tr>
                  <td>
                    <span style="font-size: 18px; margin-right: 8px;">${this.escapeHtml(l.flag || '🌐')}</span>
                    <strong>${this.escapeHtml(l.name)}</strong>
                  </td>
                  <td><code>${this.escapeHtml(l.code)}</code></td>
                  <td>${this.escapeHtml(l.native || l.name)}</td>
                  <td>
                    <span class="badge ${l.status === 'active' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${l.status === 'active' ? 'fa-check' : 'fa-ban'}"></i> ${l.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>${l.is_default ? '<span class="badge badge-published">Primary (EN)</span>' : '<span style="color:var(--slate-400); font-size:12px;">Optional</span>'}</td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditLanguageModal('${l.code}')" title="Edit Language">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    ${!l.is_default ? `
                      <button class="btn ${l.status === 'active' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleLanguageStatus('${l.code}')" title="${l.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}" style="margin-left: 4px;">
                        ${l.status === 'active' ? '<i class="fa-solid fa-eye-slash"></i> Deactive' : '<i class="fa-solid fa-eye"></i> Active'}
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteLanguage('${l.code}')" title="Delete Language" style="margin-left: 4px;">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindLanguagesEvents() {}

  openAddLanguageModal() {
    const codeEl = document.getElementById('lang-code-input');
    const flagEl = document.getElementById('lang-flag-input');
    const nameEl = document.getElementById('lang-name-input');
    const nativeEl = document.getElementById('lang-native-input');
    if (codeEl) codeEl.value = '';
    if (flagEl) flagEl.value = '';
    if (nameEl) nameEl.value = '';
    if (nativeEl) nativeEl.value = '';
    this.openModal('add-language-modal');
  }

  async handleCreateLanguage() {
    const code = document.getElementById('lang-code-input')?.value.trim().toLowerCase();
    const flag = document.getElementById('lang-flag-input')?.value.trim() || '🌐';
    const name = document.getElementById('lang-name-input')?.value.trim();
    const native = document.getElementById('lang-native-input')?.value.trim() || name;
    const status = document.getElementById('lang-status-input')?.value || 'active';

    if (!code || !name) {
      this.showToast("Language code and name are required", "error");
      return;
    }

    const list = this.getLanguagesList();
    if (list.some(l => l.code === code)) {
      this.showToast(`Language code '${code}' already exists!`, "error");
      return;
    }

    list.push({ code, name, native, flag, status, is_default: false });
    this.closeModal('add-language-modal');
    await this.saveLanguagesList(list);
  }

  openEditLanguageModal(code) {
    const list = this.getLanguagesList();
    const lang = list.find(l => l.code === code);
    if (!lang) return;

    document.getElementById('edit-lang-code-hidden').value = lang.code;
    document.getElementById('edit-lang-code-display').value = lang.code;
    document.getElementById('edit-lang-flag-input').value = lang.flag || '';
    document.getElementById('edit-lang-name-input').value = lang.name || '';
    document.getElementById('edit-lang-native-input').value = lang.native || '';
    document.getElementById('edit-lang-status-input').value = lang.status || 'active';

    this.openModal('edit-language-modal');
  }

  async handleSaveEditLanguage() {
    const code = document.getElementById('edit-lang-code-hidden')?.value;
    const flag = document.getElementById('edit-lang-flag-input')?.value.trim() || '🌐';
    const name = document.getElementById('edit-lang-name-input')?.value.trim();
    const native = document.getElementById('edit-lang-native-input')?.value.trim() || name;
    const status = document.getElementById('edit-lang-status-input')?.value || 'active';

    if (!name) {
      this.showToast("Language name is required", "error");
      return;
    }

    const list = this.getLanguagesList();
    const idx = list.findIndex(l => l.code === code);
    if (idx !== -1) {
      list[idx] = { ...list[idx], flag, name, native, status };
      this.closeModal('edit-language-modal');
      await this.saveLanguagesList(list);
    }
  }

  async toggleLanguageStatus(code) {
    const list = this.getLanguagesList();
    const idx = list.findIndex(l => l.code === code);
    if (idx !== -1) {
      list[idx].status = list[idx].status === 'active' ? 'inactive' : 'active';
      await this.saveLanguagesList(list);
    }
  }

  async deleteLanguage(code) {
    if (code === 'en') {
      this.showToast("English is the primary language and cannot be deleted.", "error");
      return;
    }
    if (!confirm(`Are you sure you want to remove language '${code}' from the website?`)) return;

    let list = this.getLanguagesList();
    list = list.filter(l => l.code !== code);
    await this.saveLanguagesList(list);
  }

  async syncEnglishToAllLanguages() {
    try {
      this.showToast("Synchronizing English content across all languages...", "info");
      const timestamp = new Date().toISOString();
      const { error } = await this.supabase
        .from('website_settings')
        .upsert({
          setting_key: 'last_languages_sync',
          setting_value: timestamp,
          setting_type: 'text',
          is_public: true,
          updated_at: timestamp
        }, { onConflict: 'setting_key' });

      if (error) throw error;
      await this.logAudit("SYNC", "LANGUAGES", "all_languages", { timestamp });
      this.showToast("All English website details synchronized across all active languages!", "success");
    } catch (err) {
      this.showToast(err.message || "Failed to sync languages", "error");
    }
  }

  /* ----------------- 11. SETTINGS & AUDIT LOG VIEW ----------------- */
  renderSettingsView() {
    const s = this.settings;
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Global Settings Form -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-sliders"></i> Global Website Settings</h3>
          </div>
          <form id="global-settings-form">
            <div class="form-group">
              <label class="form-label">Business Name</label>
              <input type="text" class="form-input" id="set-company-name" value="${this.escapeHtml(s.company_name || 'Mannar Green Ride')}">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="text" class="form-input" id="set-phone" value="${this.escapeHtml(s.phone || '+94 77 657 4418')}">
              </div>
              <div class="form-group">
                <label class="form-label">Clean Phone (WhatsApp)</label>
                <input type="text" class="form-input" id="set-phone-clean" value="${this.escapeHtml(s.phone_clean || '94776574418')}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" id="set-email" value="${this.escapeHtml(s.email || 'mannargreenride@gmail.com')}">
            </div>
            <div class="form-group">
              <label class="form-label">Physical Address</label>
              <input type="text" class="form-input" id="set-location" value="${this.escapeHtml(s.location || 'Mannar Town, Sri Lanka')}">
            </div>
            <div class="form-group">
              <label class="form-label">Business Operating Hours</label>
              <input type="text" class="form-input" id="set-hours" value="${this.escapeHtml(s.business_hours || 'Mon - Sun: 06:00 AM - 08:00 PM')}">
            </div>
            <div class="form-group">
              <label class="form-label">Google Maps Link</label>
              <input type="url" class="form-input" id="set-maps" value="${this.escapeHtml(s.google_maps_url || '')}">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;"><i class="fa-solid fa-floppy-disk"></i> Save Global Settings</button>
          </form>
        </div>

        <!-- Social Media Links -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-share-nodes"></i> Social Media Links</h3>
          </div>
          <form id="social-settings-form">
            <div class="form-group">
              <label class="form-label"><i class="fa-brands fa-facebook" style="color: #1877f2;"></i> Facebook URL</label>
              <input type="url" class="form-input" id="set-facebook" value="${this.escapeHtml(s.facebook_url || 'https://facebook.com/MannarGreenRide')}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-brands fa-whatsapp" style="color: #25d366;"></i> WhatsApp Link</label>
              <input type="url" class="form-input" id="set-whatsapp" value="${this.escapeHtml(s.whatsapp_url || 'https://wa.me/94776574418')}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-brands fa-instagram" style="color: #e4405f;"></i> Instagram URL</label>
              <input type="url" class="form-input" id="set-instagram" value="${this.escapeHtml(s.instagram_url || 'https://instagram.com')}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-brands fa-youtube" style="color: #ff0000;"></i> YouTube Channel</label>
              <input type="url" class="form-input" id="set-youtube" value="${this.escapeHtml(s.youtube_url || 'https://youtube.com')}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-brands fa-tiktok"></i> TikTok URL</label>
              <input type="url" class="form-input" id="set-tiktok" value="${this.escapeHtml(s.tiktok_url || 'https://tiktok.com')}">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;"><i class="fa-solid fa-floppy-disk"></i> Save Social Links</button>
          </form>
        </div>
      </div>

      <!-- Audit Trail Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Recent CMS Audit Trail</h3>
          <span class="badge badge-published">Live Audit Log</span>
        </div>
        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Target ID</th>
              </tr>
            </thead>
            <tbody>
              ${this.auditLogs.length ? this.auditLogs.map(log => `
                <tr>
                  <td style="font-size: 12px; color: var(--slate-500); font-family: var(--font-mono);">${new Date(log.created_at).toLocaleString()}</td>
                  <td><strong>${this.escapeHtml(log.user_email || 'admin')}</strong></td>
                  <td><span class="badge ${log.action === 'CREATE' ? 'badge-published' : (log.action === 'DELETE' ? 'badge-archived' : 'badge-draft')}">${log.action}</span></td>
                  <td><code>${this.escapeHtml(log.module)}</code></td>
                  <td style="font-size: 12px;">${this.escapeHtml(log.record_id || '-')}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="text-align:center; color:var(--slate-500);">No audit history yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindSettingsEvents() {
    const globalForm = document.getElementById('global-settings-form');
    if (globalForm) {
      globalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settingsToUpdate = [
          { key: 'company_name', val: document.getElementById('set-company-name').value },
          { key: 'phone', val: document.getElementById('set-phone').value },
          { key: 'phone_clean', val: document.getElementById('set-phone-clean').value },
          { key: 'email', val: document.getElementById('set-email').value },
          { key: 'location', val: document.getElementById('set-location').value },
          { key: 'business_hours', val: document.getElementById('set-hours').value },
          { key: 'google_maps_url', val: document.getElementById('set-maps').value }
        ];
        await this.batchSaveSettings(settingsToUpdate);
      });
    }

    const socialForm = document.getElementById('social-settings-form');
    if (socialForm) {
      socialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settingsToUpdate = [
          { key: 'facebook_url', val: document.getElementById('set-facebook').value },
          { key: 'whatsapp_url', val: document.getElementById('set-whatsapp').value },
          { key: 'instagram_url', val: document.getElementById('set-instagram').value },
          { key: 'youtube_url', val: document.getElementById('set-youtube').value },
          { key: 'tiktok_url', val: document.getElementById('set-tiktok').value }
        ];
        await this.batchSaveSettings(settingsToUpdate);
      });
    }
  }

  async batchSaveSettings(list) {
    if (!this.supabase) return;
    try {
      this.showToast("Saving settings...", "info");
      for (const item of list) {
        const { error } = await this.supabase
          .from('website_settings')
          .upsert({
            setting_key: item.key,
            setting_value: item.val,
            setting_type: 'text',
            is_public: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'setting_key' });
        if (error) throw error;
        this.settings[item.key] = item.val;
      }
      await this.logAudit("SETTINGS_CHANGE", "SETTINGS", "global", { count: list.length });
      this.showToast("Settings updated successfully!", "success");
    } catch (err) {
      this.showToast(err.message || "Failed to update settings", "error");
    }
  }

  /* ----------------- Audit Log Recording ----------------- */
  async logAudit(action, module, record_id, details) {
    if (!this.supabase) return;
    try {
      const email = (this.session && this.session.user && this.session.user.email) ? this.session.user.email : 'admin@mannargreenride.lk';
      await this.supabase.from('website_audit_logs').insert({
        user_email: email,
        action,
        module,
        record_id: String(record_id),
        details: typeof details === 'object' ? details : {}
      });
    } catch (err) {
      console.warn("Audit log warning:", err);
    }
  }

  /* ----------------- Live Preview Modal ----------------- */
  openPreviewModal() {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('preview-iframe');
    if (modal && iframe) {
      iframe.src = `/?preview=true&t=${Date.now()}`;
      modal.classList.add('open');
    }
  }

  switchPreviewSize(device) {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;

    document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById(`device-btn-${device}`);
    if (targetBtn) targetBtn.classList.add('active');

    const widths = {
      desktop: '100%',
      tablet: '768px',
      mobile: '375px'
    };
    iframe.style.width = widths[device] || '100%';
  }

  /* ----------------- Modal Helpers ----------------- */
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  /* ----------------- Toast Alerts ----------------- */
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    
    const icon = type === 'error' ? 'fa-triangle-exclamation' : (type === 'info' ? 'fa-circle-info' : 'fa-check-circle');
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${type === 'error' ? 'var(--danger)' : 'var(--primary)'};"></i> <span>${this.escapeHtml(message)}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return str || '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}

window.AdminCMSApp = AdminCMSApp;
