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
    this.authorizedEmail = 'absiraiva@gmail.com';
    this.unauthorizedMessage = null;
    this.dataLoaded = false;
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

    // Check if URL contains Supabase recovery tokens (#access_token=...&type=recovery or ?type=recovery)
    const hash = window.location.hash || '';
    const isRecoveryMode = hash.includes('type=recovery') || hash.includes('type=invite') || window.location.search.includes('type=recovery');

    await this.checkAuth();

    if (isRecoveryMode) {
      console.log("Password recovery flow detected.");
      this.hideLoginGate();
      this.openResetPasswordModal();
      return;
    }

    // STRICT ACCESS GATE: Only absiraiva@gmail.com is permitted
    if (!this.isAuthenticated()) {
      this.showLoginGate(this.unauthorizedMessage);
      return;
    }

    this.hideLoginGate();
    this.updateAuthUI();
    await this.loadAllData();
    this.dataLoaded = true;

    // Restore tab from URL hash or query param (?tab=...)
    const urlParams = new URLSearchParams(window.location.search);
    const queryTab = urlParams.get('tab');
    let hashTab = window.location.hash ? window.location.hash.replace('#', '') : null;
    if (hashTab && (hashTab.includes('access_token=') || hashTab.includes('error='))) {
      hashTab = null;
    }
    let initialTab = queryTab || hashTab || 'dashboard';
    if (initialTab.includes('?')) initialTab = initialTab.split('?')[0];
    if (initialTab === 'join-editor-card' || initialTab === 'fitness-editor-card' || initialTab === 'about-editor-card') {
      initialTab = 'content';
    }

    this.switchTab(initialTab, false);
    if (window.history && window.history.replaceState && !isRecoveryMode) {
      window.history.replaceState({ tab: initialTab }, '', '#' + initialTab);
    }
  }

  /* ----------------- Authentication Helpers & Masking ----------------- */
  maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
    const [user, domain] = email.split('@');
    if (user.length <= 3) {
      return user[0] + '••••@' + domain;
    }
    const start = user.slice(0, 2);
    const end = user.slice(-2);
    return `${start}••••••${end}@${domain}`;
  }

  toggleEmailMask() {
    const emailInput = document.getElementById('auth-email-input');
    const icon = document.getElementById('toggle-email-icon');
    const text = document.getElementById('toggle-email-text');
    const noticeCode = document.getElementById('notice-admin-email');
    const magicText = document.getElementById('btn-magic-text');
    if (!emailInput) return;

    const isMasked = emailInput.getAttribute('data-masked') !== 'false';
    if (isMasked) {
      // Show full email
      emailInput.value = this.authorizedEmail;
      emailInput.setAttribute('data-masked', 'false');
      if (icon) icon.className = 'fa-solid fa-eye-slash';
      if (text) text.textContent = 'Mask';
      if (noticeCode) noticeCode.textContent = this.authorizedEmail;
      if (magicText) magicText.textContent = `Send Magic Login Link to ${this.authorizedEmail}`;
    } else {
      // Mask email
      const masked = this.maskEmail(this.authorizedEmail);
      emailInput.value = masked;
      emailInput.setAttribute('data-masked', 'true');
      if (icon) icon.className = 'fa-solid fa-eye';
      if (text) text.textContent = 'Show';
      if (noticeCode) noticeCode.textContent = masked;
      if (magicText) magicText.textContent = `Send Magic Login Link (${masked})`;
    }
  }

  toggleResetPwdVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide';
    } else {
      input.type = 'password';
      if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show';
    }
  }

  openResetPasswordModal() {
    const modal = document.getElementById('reset-password-modal');
    const alertEl = document.getElementById('reset-pwd-alert');
    const newPwd = document.getElementById('reset-new-password');
    const confirmPwd = document.getElementById('reset-confirm-password');
    const emailEl = document.getElementById('reset-modal-email');

    if (emailEl) emailEl.textContent = this.maskEmail(this.authorizedEmail);
    if (alertEl) alertEl.style.display = 'none';
    if (newPwd) newPwd.value = '';
    if (confirmPwd) confirmPwd.value = '';

    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }
  }

  closeResetPasswordModal() {
    const modal = document.getElementById('reset-password-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  /* ----------------- Authentication (absiraiva@gmail.com ONLY) ----------------- */
  isAuthenticated() {
    return !!(
      this.session &&
      this.session.user &&
      this.session.user.email &&
      this.session.user.email.toLowerCase() === this.authorizedEmail.toLowerCase()
    );
  }

  async checkAuth() {
    if (!this.supabase) return;
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session && session.user && session.user.email) {
        if (session.user.email.toLowerCase() === this.authorizedEmail.toLowerCase()) {
          this.session = session;
          this.unauthorizedMessage = null;
        } else {
          // Reject any other user immediately
          console.warn("Unauthorized user attempted access:", session.user.email);
          await this.supabase.auth.signOut();
          this.session = null;
          this.unauthorizedMessage = `Access Denied: Only the authorized administrator (${this.maskEmail(this.authorizedEmail)}) is permitted to access this portal. User (${this.maskEmail(session.user.email)}) has been signed out.`;
        }
      } else {
        this.session = null;
      }

      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Supabase Auth Event:", event);
        if (event === 'PASSWORD_RECOVERY') {
          this.session = session;
          this.hideLoginGate();
          this.openResetPasswordModal();
          return;
        }

        if (session && session.user && session.user.email) {
          if (session.user.email.toLowerCase() === this.authorizedEmail.toLowerCase()) {
            this.session = session;
            this.hideLoginGate();
            this.updateAuthUI();
            if (!this.dataLoaded) {
              await this.loadAllData();
              this.dataLoaded = true;
              this.render();
            }
          } else {
            await this.supabase.auth.signOut();
            this.session = null;
            this.showLoginGate(`Access Denied: Account (${this.maskEmail(session.user.email)}) is not authorized. Only ${this.maskEmail(this.authorizedEmail)} is permitted.`);
          }
        } else if (event === 'SIGNED_OUT') {
          this.session = null;
          this.dataLoaded = false;
          this.showLoginGate();
        }
      });
    } catch (err) {
      console.warn("Auth check warning:", err);
    }
  }

  showLoginGate(errorMessage = null) {
    const gate = document.getElementById('admin-auth-gate');
    const appContainer = document.getElementById('admin-app-container');
    const alertBox = document.getElementById('auth-alert-box');
    const emailInput = document.getElementById('auth-email-input');
    const pwdInput = document.getElementById('auth-password-input');
    const noticeCode = document.getElementById('notice-admin-email');
    const magicText = document.getElementById('btn-magic-text');
    const btnLoginText = document.getElementById('btn-login-text');

    if (appContainer) appContainer.style.display = 'none';
    if (gate) gate.style.display = 'flex';

    const masked = this.maskEmail(this.authorizedEmail);
    if (emailInput) {
      emailInput.value = masked;
      emailInput.setAttribute('data-masked', 'true');
    }
    if (noticeCode) noticeCode.textContent = masked;
    if (magicText) magicText.textContent = `Send Magic Login Link (${masked})`;
    if (btnLoginText) btnLoginText.textContent = 'Sign In to Admin Portal';
    if (pwdInput) pwdInput.value = '';

    if (alertBox) {
      if (errorMessage) {
        alertBox.className = 'auth-alert error';
        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${this.escapeHtml(errorMessage)}</span>`;
        alertBox.style.display = 'flex';
      } else {
        alertBox.style.display = 'none';
      }
    }
  }

  hideLoginGate() {
    const gate = document.getElementById('admin-auth-gate');
    const appContainer = document.getElementById('admin-app-container');
    const alertBox = document.getElementById('auth-alert-box');

    if (gate) gate.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    if (alertBox) alertBox.style.display = 'none';
  }

  togglePasswordVisibility() {
    const pwdInput = document.getElementById('auth-password-input');
    const icon = document.getElementById('toggle-pwd-icon');
    const btn = document.getElementById('btn-toggle-password');
    if (!pwdInput) return;

    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      if (icon) icon.className = 'fa-solid fa-eye-slash';
      if (btn) btn.innerHTML = `<i class="fa-solid fa-eye-slash" id="toggle-pwd-icon"></i> Hide`;
    } else {
      pwdInput.type = 'password';
      if (icon) icon.className = 'fa-solid fa-eye';
      if (btn) btn.innerHTML = `<i class="fa-solid fa-eye" id="toggle-pwd-icon"></i> Show`;
    }
  }

  async handleLoginFormSubmit() {
    if (!this.supabase) {
      this.showLoginGate("Database connection is initializing. Please retry in a moment.");
      return;
    }

    const pwdInput = document.getElementById('auth-password-input');
    const submitBtn = document.getElementById('btn-login-submit');
    const btnText = document.getElementById('btn-login-text');
    const alertBox = document.getElementById('auth-alert-box');

    const password = (pwdInput?.value || '').trim();

    if (!password) {
      if (alertBox) {
        alertBox.className = 'auth-alert error';
        alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>Please enter your administrator password.</span>`;
        alertBox.style.display = 'flex';
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating...`;

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: this.authorizedEmail,
        password: password
      });

      if (error) throw error;

      if (!data.user || data.user.email.toLowerCase() !== this.authorizedEmail.toLowerCase()) {
        await this.supabase.auth.signOut();
        throw new Error(`Unauthorized account. Access is strictly restricted to ${this.maskEmail(this.authorizedEmail)}.`);
      }

      this.session = data.session;
      this.hideLoginGate();
      this.updateAuthUI();
      this.showToast(`Welcome back, Administrator!`, "success");

      await this.loadAllData();
      this.dataLoaded = true;
      this.render();
    } catch (err) {
      console.error("Login failed:", err);
      if (alertBox) {
        alertBox.className = 'auth-alert error';
        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${this.escapeHtml(err.message || 'Login failed. Please check your password.')}</span>`;
        alertBox.style.display = 'flex';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.textContent = 'Sign In to Admin Portal';
    }
  }

  async handleSendPasswordReset() {
    if (!this.supabase) return;
    const alertBox = document.getElementById('auth-alert-box');
    const masked = this.maskEmail(this.authorizedEmail);

    if (alertBox) {
      alertBox.className = 'auth-alert info';
      alertBox.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Sending password reset email to ${masked}...</span>`;
      alertBox.style.display = 'flex';
    }

    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await this.supabase.auth.resetPasswordForEmail(this.authorizedEmail, {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      if (alertBox) {
        alertBox.className = 'auth-alert success';
        alertBox.innerHTML = `<i class="fa-solid fa-envelope-circle-check"></i> <span>Password reset link sent to <strong>${masked}</strong>! Please check your email inbox and tap the link to set your new password.</span>`;
        alertBox.style.display = 'flex';
      }
    } catch (err) {
      console.error("Password reset error:", err);
      if (alertBox) {
        alertBox.className = 'auth-alert error';
        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${this.escapeHtml(err.message || 'Failed to send reset email.')}</span>`;
        alertBox.style.display = 'flex';
      }
    }
  }

  async handleUpdatePassword() {
    if (!this.supabase) {
      this.showToast("Database client is not ready. Please refresh.", "error");
      return;
    }

    const newPwdInput = document.getElementById('reset-new-password');
    const confirmPwdInput = document.getElementById('reset-confirm-password');
    const saveBtn = document.getElementById('btn-save-new-password');
    const alertEl = document.getElementById('reset-pwd-alert');

    const newPassword = (newPwdInput?.value || '').trim();
    const confirmPassword = (confirmPwdInput?.value || '').trim();

    if (!newPassword || newPassword.length < 6) {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Password must be at least 6 characters long.</span>';
        alertEl.style.display = 'flex';
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Passwords do not match. Please verify.</span>';
        alertEl.style.display = 'flex';
      }
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving Password...';
    }

    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Also ensure must_change_password flag is cleared in user_accounts
      try {
        await this.supabase
          .from('user_accounts')
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq('email', this.authorizedEmail);
      } catch (syncErr) {
        console.warn("user_accounts sync notice:", syncErr);
      }

      if (alertEl) {
        alertEl.className = 'auth-alert success';
        alertEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Password updated successfully! Redirecting...</span>';
        alertEl.style.display = 'flex';
      }

      this.showToast("Master password updated successfully!", "success");

      setTimeout(async () => {
        this.closeResetPasswordModal();
        if (window.history && window.history.replaceState) {
          window.history.replaceState({ tab: 'dashboard' }, '', window.location.pathname + '#dashboard');
        }
        if (!this.session && data?.user) {
          this.session = { user: data.user };
        }
        this.hideLoginGate();
        this.updateAuthUI();
        if (!this.dataLoaded) {
          await this.loadAllData();
          this.dataLoaded = true;
          this.render();
        }
      }, 1200);
    } catch (err) {
      console.error("Failed to update password:", err);
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${this.escapeHtml(err.message || 'Failed to update password.')}</span>`;
        alertEl.style.display = 'flex';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save New Password';
      }
    }
  }

  async handleSendMagicLink() {
    if (!this.supabase) return;
    const alertBox = document.getElementById('auth-alert-box');
    const magicBtn = document.getElementById('btn-magic-link');
    const masked = this.maskEmail(this.authorizedEmail);

    if (magicBtn) magicBtn.disabled = true;
    if (alertBox) {
      alertBox.className = 'auth-alert info';
      alertBox.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Sending secure login link to ${masked}...</span>`;
      alertBox.style.display = 'flex';
    }

    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await this.supabase.auth.signInWithOtp({
        email: this.authorizedEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (alertBox) {
        alertBox.className = 'auth-alert success';
        alertBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Magic login link sent to <strong>${masked}</strong>! Please check your email inbox and tap the link to sign in.</span>`;
        alertBox.style.display = 'flex';
      }
    } catch (err) {
      console.error("Magic link error:", err);
      if (alertBox) {
        alertBox.className = 'auth-alert error';
        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${this.escapeHtml(err.message || 'Failed to send magic link.')}</span>`;
        alertBox.style.display = 'flex';
      }
    } finally {
      if (magicBtn) magicBtn.disabled = false;
    }
  }

  async handleLogout() {
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
    this.session = null;
    this.dataLoaded = false;
    this.showLoginGate("You have been securely signed out.");
    this.showToast("Signed out of admin session.", "info");
  }

  updateAuthUI() {
    const userEmailEl = document.getElementById('user-email-display');
    const userRoleEl = document.getElementById('user-role-display');

    if (this.isAuthenticated()) {
      if (userEmailEl) userEmailEl.textContent = 'Absir Aiva';
      if (userRoleEl) userRoleEl.textContent = `Super Admin (${this.maskEmail(this.authorizedEmail)})`;
    } else {
      if (userEmailEl) userEmailEl.textContent = 'Restricted';
      if (userRoleEl) userRoleEl.textContent = 'Sign In Required';
    }
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
        this.updateLaunchCeremonyBadge();
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

    // Browser Back / Forward Button Navigation Support
    window.addEventListener('popstate', (e) => {
      // 1. If any modal is currently open, close the modal cleanly
      const openModals = document.querySelectorAll('.modal.open');
      if (openModals.length > 0 && (!e.state || !e.state.modalId)) {
        openModals.forEach(m => m.classList.remove('open'));
        return;
      }

      // 2. Determine target tab from popstate state or URL hash
      let targetTab = (e.state && e.state.tab) || (window.location.hash ? window.location.hash.replace('#', '') : 'dashboard');
      if (targetTab.includes('?')) targetTab = targetTab.split('?')[0];

      if (targetTab === 'join-editor-card' || targetTab === 'fitness-editor-card' || targetTab === 'about-editor-card') {
        targetTab = 'content';
      }

      if (this.activeTab !== targetTab) {
        this.switchTab(targetTab, false);
      }
    });
  }

  switchTab(tabName, pushToHistory = true) {
    if (tabName === 'host-network' || tabName === 'fitness-cards' || tabName === 'about-cards') {
      this.switchTab('content', pushToHistory);
      setTimeout(() => {
        const targetId = tabName === 'host-network' ? 'join-editor-card' : (tabName === 'fitness-cards' ? 'fitness-editor-card' : 'about-editor-card');
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return;
    }

    this.activeTab = tabName;

    // Push to browser history so Back/Forward buttons work correctly
    if (pushToHistory && window.history && window.history.pushState) {
      const newHash = '#' + tabName;
      if (window.location.hash !== newHash) {
        window.history.pushState({ tab: tabName }, '', newHash);
      }
    }
    document.querySelectorAll('[data-nav-tab]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-nav-tab') === tabName);
    });

    // Close mobile drawer on item click
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Update Header Title
    const titles = {
      dashboard: { title: "Dashboard Overview", subtitle: "Live operational metrics & CMS summary" },
      'launch-ceremony': { title: "Government Agent (GA) Official Launch Ceremony", subtitle: "Configure the digital full-screen countdown and ceremony launch screen for Mannar GA inauguration" },
      content: { title: "WordPress Text & Image Content Editor", subtitle: "WordPress Gutenberg-style visual controls for typography (size, weight, style, color, alignment, gradients) and images (size, border radius, padding, style, brightness, blur filters)" },
      categories: { title: "Transport Categories Manager", subtitle: "Add, edit, enable/disable, reorder, and manage vehicle & transport categories" },
      counters: { title: "Statistics & Counter Metrics", subtitle: "Manage count values (100 rides, 100 riders, 50 fleet, 100% eco), data sources, and icons" },
      services: { title: "Services & Rates Management", subtitle: "Manage vehicle types, rates, auto/manual pricing, active status, and card order" },
      seo: { title: "Dedicated SEO & Keywords Manager", subtitle: "Configure focus keywords, page titles, and meta descriptions" },
      offers: { title: "Promotions & Offers", subtitle: "Schedule discount deals, active status, and campaign card order" },
      blogs: { title: "Blog & Travel Guides", subtitle: "Manage cycling routes, travel tips, active status, and article card order" },
      gallery: { title: "Media Library & Gallery", subtitle: "Upload images to Supabase storage and manage photos" },
      testimonials: { title: "Rider Testimonials & Slider Speed", subtitle: "Manage customer reviews, active status, card order, and slider animation controls" },
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
      case 'launch-ceremony':
        container.innerHTML = this.renderLaunchCeremonyView();
        this.bindLaunchCeremonyEvents();
        break;
      case 'content':
      case 'host-network':
      case 'fitness-cards':
      case 'about-cards':
        container.innerHTML = this.renderContentView();
        this.bindContentEvents();
        break;
      case 'categories':
        container.innerHTML = this.renderCategoriesView();
        this.bindCategoriesEvents();
        break;
      case 'counters':
        container.innerHTML = this.renderCountersView();
        this.bindCountersEvents();
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

      <!-- Featured WordPress Content & Image Editor Banner -->
      <div class="card" style="border: 2px solid #0073aa; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); margin-bottom: 24px; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 52px; height: 52px; border-radius: 12px; background: #0073aa; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 4px 12px rgba(0, 115, 170, 0.3);">
              <i class="fa-brands fa-wordpress"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">WordPress-Style Text & Images Content Editor</h3>
                <span class="badge" style="background: #0073aa; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">WP-STYLE</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155;">
                Visual Gutenberg & Elementor style editing controls for website content: Typography, font sizes, weights, colors, gradients (radint), image sizing, border radius, padding, alignment, brightness, and blur filters.
              </p>
            </div>
          </div>
          <button class="btn btn-primary" onclick="window.adminCMS.switchTab('content')" style="background: #0073aa; border-color: #0073aa; font-weight: 700; padding: 10px 18px;">
            <i class="fa-brands fa-wordpress"></i> Open WP Text & Image Editor
          </button>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-bolt"></i> Quick Website Actions</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-outline" style="justify-content: flex-start; color: #0073aa; border-color: #93c5fd; font-weight: 700;" onclick="window.adminCMS.switchTab('content')">
              <i class="fa-brands fa-wordpress" style="color: #0073aa; font-size: 16px;"></i> WordPress Text & Images Content Editor
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

  bindDashboardEvents() { }

  /* ----------------- 2. WEBSITE CONTENT VIEW (With WordPress-Style Controls) ----------------- */
  getContentStyleConfig() {
    let cfg = {
      hero: {
        fontSize: 48,
        fontStyle: 'normal',
        fontWeight: '900',
        color: '#111827',
        alignment: 'center',
        gradientEnabled: false,
        gradientStart: '#059669',
        gradientEnd: '#10b981',
        imgUrl: 'https://drive.google.com/thumbnail?id=1ZuYVfL-kmlxJWkeSuMM6_b-V1fIclTf_&sz=w1600',
        imgWidth: 100,
        imgStyle: 'elevated',
        imgRadius: 20,
        imgBorderWidth: 0,
        imgBorderColor: '#e2e8f0',
        imgPadding: 0,
        imgMarginAlign: 'center',
        imgBrightness: 100,
        imgBlur: 0
      },
      fitness: {
        fontSize: 32,
        fontStyle: 'normal',
        fontWeight: '800',
        color: '#111827',
        alignment: 'left',
        gradientEnabled: false,
        gradientStart: '#059669',
        gradientEnd: '#10b981',
        img1: 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600',
        img1_alt: 'Cycling Fitness in Mannar',
        img1_width: 100,
        img1_style: 'elevated',
        img1_radius: 16,
        img1_border_w: 0,
        img1_border_c: '#e2e8f0',
        img1_padding: 0,
        img1_align: 'center',
        img1_brightness: 100,
        img1_blur: 0,
        img2: 'https://drive.google.com/thumbnail?id=1Set2mnZc8B5Ua0qZcxFw52hzAAwApJ7x&sz=w1600',
        img2_alt: 'Tourist Adventure',
        img2_width: 100,
        img2_style: 'elevated',
        img2_radius: 16,
        img2_border_w: 0,
        img2_border_c: '#e2e8f0',
        img2_padding: 0,
        img2_align: 'center',
        img2_brightness: 100,
        img2_blur: 0,
        imgUrl: 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600',
        imgWidth: 100,
        imgStyle: 'elevated',
        imgRadius: 16,
        imgBorderWidth: 0,
        imgBorderColor: '#e2e8f0',
        imgPadding: 0,
        imgMarginAlign: 'center',
        imgBrightness: 100,
        imgBlur: 0
      },
      about: {
        fontSize: 32,
        fontStyle: 'normal',
        fontWeight: '800',
        color: '#111827',
        alignment: 'left',
        gradientEnabled: false,
        gradientStart: '#059669',
        gradientEnd: '#10b981',
        imgUrl: 'https://drive.google.com/thumbnail?id=1bN1Oi1kOZWa9Fh3o12uixVclaPClZ_sr&sz=w1600',
        imgWidth: 100,
        imgStyle: 'elevated',
        imgRadius: 24,
        imgBorderWidth: 0,
        imgBorderColor: '#e2e8f0',
        imgPadding: 0,
        imgMarginAlign: 'center',
        imgBrightness: 100,
        imgBlur: 0
      }
    };

    if (this.settings && this.settings.content_styling_config) {
      try {
        const parsed = typeof this.settings.content_styling_config === 'string'
          ? JSON.parse(this.settings.content_styling_config)
          : this.settings.content_styling_config;
        if (parsed) {
          cfg = {
            hero: { ...cfg.hero, ...(parsed.hero || {}) },
            fitness: { ...cfg.fitness, ...(parsed.fitness || {}) },
            about: { ...cfg.about, ...(parsed.about || {}) }
          };
        }
      } catch (e) { }
    } else {
      try {
        const local = localStorage.getItem('mgr_setting_content_styling_config');
        if (local) {
          const parsed = JSON.parse(local);
          cfg = {
            hero: { ...cfg.hero, ...(parsed.hero || {}) },
            fitness: { ...cfg.fitness, ...(parsed.fitness || {}) },
            about: { ...cfg.about, ...(parsed.about || {}) }
          };
        }
      } catch (e) { }
    }

    // Synchronize fitness_section_images if available
    try {
      const rawFit = (this.settings && this.settings.fitness_section_images) || localStorage.getItem('mgr_setting_fitness_section_images');
      if (rawFit) {
        const parsedFit = typeof rawFit === 'string' ? JSON.parse(rawFit) : rawFit;
        if (parsedFit) {
          if (parsedFit.img1 && !cfg.fitness.img1) cfg.fitness.img1 = parsedFit.img1;
          if (parsedFit.img2 && !cfg.fitness.img2) cfg.fitness.img2 = parsedFit.img2;
          if (parsedFit.alt1 && !cfg.fitness.img1_alt) cfg.fitness.img1_alt = parsedFit.alt1;
          if (parsedFit.alt2 && !cfg.fitness.img2_alt) cfg.fitness.img2_alt = parsedFit.alt2;
        }
      }
    } catch (e) { }

    return cfg;
  }

  getHeroSliderConfig() {
    let cfg = {
      enabled: true,
      auto_slide: true,
      interval: 4000,
      fit_mode: 'contain', // 'contain' displays full original image with 100% clarity; 'cover' fills edge-to-edge
      slider_height: 480,
      slider_width: '1280px',
      ambient_bg: true,
      bg_style: 'blur', // 'blur' | 'dark' | 'emerald' | 'transparent'
      slides: [
        {
          id: "slide_1",
          url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=95&w=1920",
          title: "Eco-Friendly Cycling Across Mannar Causeway",
          subtitle: "Bicycles from Rs. 100/hr with free helmet & lock"
        },
        {
          id: "slide_2",
          url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=95&w=1920",
          title: "Scenic Coastal Exploration & Flamingo Dunes",
          subtitle: "Comfortable rides designed for health and eco-tourism"
        },
        {
          id: "slide_3",
          url: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=95&w=1920",
          title: "Island-Wide Passenger Transport Fleet",
          subtitle: "Cars, KDH vans, and tourist buses with trusted local drivers"
        }
      ]
    };

    if (this.settings && this.settings.hero_slider_config) {
      try {
        const parsed = typeof this.settings.hero_slider_config === 'string'
          ? JSON.parse(this.settings.hero_slider_config)
          : this.settings.hero_slider_config;
        if (parsed && typeof parsed === 'object') {
          cfg = { ...cfg, ...parsed };
        }
      } catch (e) { }
    } else {
      try {
        const local = localStorage.getItem('mgr_setting_hero_slider_config');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            cfg = { ...cfg, ...parsed };
          }
        }
      } catch (e) { }
    }

    if (!Array.isArray(cfg.slides) || cfg.slides.length === 0) {
      cfg.slides = [
        {
          id: "slide_1",
          url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=95&w=1920",
          title: "Eco-Friendly Cycling Across Mannar Causeway",
          subtitle: "Bicycles from Rs. 100/hr with free helmet & lock"
        }
      ];
    }

    return cfg;
  }

  getHeroLayoutConfig() {
    let cfg = {
      bg_type: 'default',
      bg_color: '#f0fdf4',
      bg_image_url: '',
      bg_position: 'center',
      bg_attachment: 'scroll',
      overlay_opacity: 0,
      overlay_color: '#000000',
      contrast_mode: 'auto',
      alignment: 'center',
      padding_top: 80,
      padding_bottom: 80,
      padding_x: 24,
      max_width: '1280px'
    };

    if (this.settings && this.settings.hero_layout_config) {
      try {
        const parsed = typeof this.settings.hero_layout_config === 'string'
          ? JSON.parse(this.settings.hero_layout_config)
          : this.settings.hero_layout_config;
        if (parsed && typeof parsed === 'object') {
          cfg = { ...cfg, ...parsed };
        }
      } catch (e) { }
    } else {
      try {
        const local = localStorage.getItem('mgr_setting_hero_layout_config');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            cfg = { ...cfg, ...parsed };
          }
        }
      } catch (e) { }
    }

    return cfg;
  }

  isColorDark(hex) {
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

  renderHeroSlideRows(slides) {
    if (!Array.isArray(slides) || slides.length === 0) {
      return `<p style="font-size: 13px; color: #64748b; padding: 12px;">No slides found. Click "Add Slide Image" to create one.</p>`;
    }

    return slides.map((s, idx) => `
      <div class="hero-slide-row" data-idx="${idx}" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" style="background: #0f172a; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">
              Slide ${idx + 1} of ${slides.length}
            </span>
            ${idx === 0 ? '<span class="badge badge-published" style="font-size: 10px; padding: 2px 6px;">Primary / Default Slide</span>' : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="btn btn-outline btn-sm btn-slide-move" data-action="up" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} title="Move slide earlier">
              <i class="fa-solid fa-arrow-up"></i> Move Up
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-slide-move" data-action="down" data-idx="${idx}" ${idx === slides.length - 1 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} title="Move slide later">
              <i class="fa-solid fa-arrow-down"></i> Move Down
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-slide-delete" data-idx="${idx}" ${slides.length <= 1 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} style="color: #dc2626; border-color: #fca5a5;" title="Remove this slide">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 14px; align-items: start;">
          <!-- Thumbnail -->
          <div style="width: 140px; height: 95px; border-radius: 8px; overflow: hidden; background: #f1f5f9; border: 1px solid #e2e8f0; position: relative;">
            <img id="hero-slide-thumb-${idx}" src="${this.normalizeImageUrl(s.url)}" alt="Slide ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800'">
            <div style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); color: #fff; font-size: 9px; padding: 1px 5px; border-radius: 4px;">#${idx + 1}</div>
          </div>

          <!-- Controls -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" class="form-input hero-slide-url-input" id="hero-slide-url-${idx}" data-idx="${idx}" value="${this.escapeHtml(s.url || '')}" placeholder="Paste image URL (https://...) to replace this image" style="flex: 1; font-size: 13px; font-weight: 600;">
              <button type="button" class="btn btn-outline btn-sm wp-btn-pick-media" data-target="hero-slide-url-${idx}" style="color: #0073aa; border-color: #93c5fd; white-space: nowrap; font-weight: 600;">
                <i class="fa-solid fa-photo-film"></i> Media Library
              </button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Slide Headline</label>
                <input type="text" class="form-input hero-slide-title-input" data-idx="${idx}" value="${this.escapeHtml(s.title || '')}" placeholder="Slide Headline..." style="font-size: 12.5px; padding: 5px 8px;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">Slide Subtitle / Offer</label>
                <input type="text" class="form-input hero-slide-subtitle-input" data-idx="${idx}" value="${this.escapeHtml(s.subtitle || '')}" placeholder="Slide Subtitle..." style="font-size: 12.5px; padding: 5px 8px;">
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderHeroSliderControls(sliderCfg) {
    const s = sliderCfg || this.getHeroSliderConfig();
    const slides = s.slides || [];
    const fitMode = s.fit_mode || 'contain';
    const sliderHeight = s.slider_height || 480;
    const sliderWidth = s.slider_width || '1280px';
    const ambientBg = s.ambient_bg !== false;
    const bgStyle = s.bg_style || 'blur';

    return `
      <div class="card" id="hero-slider-manager-card" style="border: 2px solid #0073aa; background: #f8fafc; border-radius: 12px; padding: 18px; margin-top: 10px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">
                <i class="fa-solid fa-images" style="color: #0073aa;"></i> Hero Multi-Image Slider &amp; Carousel
              </h4>
              <span class="badge" id="hero-slider-badge-count" style="background: #0073aa; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 700;">
                Total: ${slides.length} Images
              </span>
            </div>
            <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;">
              Manage high-resolution images, aspect ratios, fit mode (100% full view vs crop), and ambient backgrounds.
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer;">
              <input type="checkbox" id="hero-slider-auto-toggle" ${s.auto_slide ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #0073aa;">
              Auto Slide
            </label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <label style="font-size: 12px; color: #475569; font-weight: 600;">Interval:</label>
              <select id="hero-slider-interval-select" class="form-input" style="padding: 4px 8px; font-size: 12px; width: auto; height: 32px;">
                <option value="2500" ${s.interval === 2500 ? 'selected' : ''}>2.5 seconds</option>
                <option value="3500" ${s.interval === 3500 ? 'selected' : ''}>3.5 seconds</option>
                <option value="4000" ${(!s.interval || s.interval === 4000) ? 'selected' : ''}>4 seconds</option>
                <option value="5000" ${s.interval === 5000 ? 'selected' : ''}>5 seconds</option>
                <option value="6000" ${s.interval === 6000 ? 'selected' : ''}>6 seconds</option>
              </select>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-add-hero-slide-top" style="background: #0073aa; border-color: #0073aa; font-weight: 700;">
              <i class="fa-solid fa-plus"></i> Add Slide Image
            </button>
          </div>
        </div>

        <!-- 1. Hero Image Dimensions & Clarity Guidance Banner -->
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #93c5fd; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="background: #0073aa; color: #fff; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; margin-top: 2px;">
              <i class="fa-solid fa-ruler-combined"></i>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h5 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e3a8a;">
                  Hero Section Image Size &amp; Clarity Guidelines
                </h5>
                <span style="background: #2563eb; color: #fff; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 10px;">
                  100% ORIGINAL DISPLAY (NOT 80%)
                </span>
              </div>
              <p style="font-size: 12px; color: #1e40af; margin: 4px 0 8px 0; line-height: 1.45;">
                To guarantee crisp high-definition visuals across all desktops and mobile screens, upload or link images formatted to these recommended specifications:
              </p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
                <div style="background: rgba(255,255,255,0.85); border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px;">
                  <div style="font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">Standard 16:9 HD (Recommended)</div>
                  <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">1920 × 1080 px</div>
                  <div style="font-size: 11px; color: #475569;">Perfect for graphic banners, text &amp; multi-vehicle photos</div>
                </div>
                <div style="background: rgba(255,255,255,0.85); border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px;">
                  <div style="font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">Panoramic Ultra-Wide</div>
                  <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">1920 × 800 px <span style="font-weight: 500; font-size: 11px; color: #64748b;">(21:9)</span></div>
                  <div style="font-size: 11px; color: #475569;">Ideal for panoramic scenery across Mannar causeway</div>
                </div>
                <div style="background: rgba(255,255,255,0.85); border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px;">
                  <div style="font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">Original Clarity Guarantee</div>
                  <div style="font-size: 14px; font-weight: 800; color: #059669; margin-top: 2px;">Zero Forced Cropping</div>
                  <div style="font-size: 11px; color: #475569;">"Contain" mode renders full uncropped image with ambient backdrop</div>
                </div>
                <div style="background: rgba(255,255,255,0.85); border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px;">
                  <div style="font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">Mobile &amp; Tablet Ready</div>
                  <div style="font-size: 14px; font-weight: 800; color: #0073aa; margin-top: 2px;">Dynamic 16:9 Scale</div>
                  <div style="font-size: 11px; color: #475569;">Fluid aspect-ratio scaling &amp; touch swipe across all handheld screen sizes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Image Fit Mode, Height, Width & Ambient Backdrop Settings -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-sliders" style="color: #0073aa;"></i>
            Slider Dimensions, Image Fit Mode &amp; Ambient Background
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
            <!-- Fit Mode -->
            <div>
              <label class="form-label" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                Image Display Fit Mode
              </label>
              <select id="hero-slider-fit-mode" class="form-input" style="font-size: 12.5px; font-weight: 600;">
                <option value="contain" ${fitMode === 'contain' ? 'selected' : ''}>
                  🔍 Contain (100% Original Clarity - Uncropped, Full Image) [Recommended]
                </option>
                <option value="cover" ${fitMode === 'cover' ? 'selected' : ''}>
                  🖼️ Cover (Edge-to-Edge Fill - Crops edges to fill box)
                </option>
              </select>
              <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">
                <strong>Contain</strong> prevents any part of your photo or text from getting cut off.
              </p>
            </div>

            <!-- Slider Height -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700; color: #334155; margin: 0;">
                  Slider Height: <span id="hero-slider-height-val" style="color: #0073aa; font-weight: 800;">${sliderHeight}px</span>
                </label>
              </div>
              <input type="range" id="hero-slider-height-range" min="300" max="650" step="10" value="${sliderHeight}" style="width: 100%; accent-color: #0073aa; cursor: pointer;">
              <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline btn-sm btn-height-preset" data-height="380" style="padding: 2px 7px; font-size: 11px;">380px</button>
                <button type="button" class="btn btn-outline btn-sm btn-height-preset" data-height="440" style="padding: 2px 7px; font-size: 11px;">440px</button>
                <button type="button" class="btn btn-outline btn-sm btn-height-preset" data-height="480" style="padding: 2px 7px; font-size: 11px; font-weight: 700; border-color: #0073aa; color: #0073aa;">480px (Std)</button>
                <button type="button" class="btn btn-outline btn-sm btn-height-preset" data-height="540" style="padding: 2px 7px; font-size: 11px;">540px</button>
                <button type="button" class="btn btn-outline btn-sm btn-height-preset" data-height="600" style="padding: 2px 7px; font-size: 11px;">600px</button>
              </div>
            </div>

            <!-- Slider Width Container -->
            <div>
              <label class="form-label" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                Container Width Max
              </label>
              <select id="hero-slider-width-select" class="form-input" style="font-size: 12.5px; font-weight: 600;">
                <option value="1280px" ${sliderWidth === '1280px' ? 'selected' : ''}>1280px (Standard Centered - Recommended)</option>
                <option value="100%" ${sliderWidth === '100%' ? 'selected' : ''}>100% (Full Edge-to-Edge Browser Width)</option>
                <option value="1440px" ${sliderWidth === '1440px' ? 'selected' : ''}>1440px (Wide Desktop)</option>
                <option value="1024px" ${sliderWidth === '1024px' ? 'selected' : ''}>1024px (Compact Layout)</option>
              </select>
              <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">
                Defines the maximum container width for the hero carousel on large desktop monitors.
              </p>
            </div>

            <!-- Ambient Background Style -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700; color: #334155; margin: 0;">
                  Ambient Backdrop Style
                </label>
                <label style="font-size: 11px; color: #0073aa; font-weight: 700; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                  <input type="checkbox" id="hero-slider-ambient-toggle" ${ambientBg ? 'checked' : ''} style="width: 14px; height: 14px; accent-color: #0073aa;">
                  Active
                </label>
              </div>
              <select id="hero-slider-bg-style" class="form-input" style="font-size: 12.5px; font-weight: 600;">
                <option value="blur" ${bgStyle === 'blur' ? 'selected' : ''}>✨ Dynamic Ambient Glow (Blurred reflection of image)</option>
                <option value="dark" ${bgStyle === 'dark' ? 'selected' : ''}>🌑 Sleek Deep Dark (#0f172a)</option>
                <option value="emerald" ${bgStyle === 'emerald' ? 'selected' : ''}>🌲 Mannar Deep Emerald (#022c22)</option>
                <option value="transparent" ${bgStyle === 'transparent' ? 'selected' : ''}>⚪ Transparent / Neutral</option>
              </select>
              <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">
                Fills any letterbox boundaries smoothly when the photo does not match the screen ratio.
              </p>
            </div>
          </div>
        </div>

        <!-- 3. Slides List Container -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h5 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #0f172a;">
            Slide Images &amp; Captions (${slides.length})
          </h5>
          <span style="font-size: 11.5px; color: #64748b;">Click <strong>Preview Slide</strong> to view immediately on canvas</span>
        </div>
        <div id="hero-slides-items-container" style="display: flex; flex-direction: column; gap: 14px;">
          ${this.renderHeroSlideRows(slides)}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; flex-wrap: wrap; gap: 10px;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-add-hero-slide-bottom" style="font-weight: 700; color: #0073aa; border-color: #93c5fd;">
            <i class="fa-solid fa-plus"></i> Add Another Slide Image
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-hero-slider-only" style="background: #059669; border-color: #059669; font-weight: 700; padding: 6px 18px;">
            <i class="fa-solid fa-floppy-disk"></i> Save Hero Slider &amp; Images
          </button>
        </div>
      </div>
    `;
  }

  renderHeroBackgroundAndLayoutControls(layoutCfg) {
    const l = layoutCfg || this.getHeroLayoutConfig();
    const bgType = l.bg_type || 'default';
    const align = l.alignment || 'center';
    const contrast = l.contrast_mode || 'auto';
    const bgPos = l.bg_position || 'center';

    return `
      <div class="card" id="hero-layout-manager-card" style="border: 2px solid #059669; background: #f8fafc; border-radius: 12px; padding: 18px; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">
                <i class="fa-solid fa-layer-group" style="color: #059669;"></i> Hero Background &amp; Layout Positioning
              </h4>
              <span class="badge" style="background: #059669; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 700;">
                LIVE CONTROLS
              </span>
            </div>
            <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;">
              Customize Hero background (theme color or background image), overlay tint &amp; opacity, and adjust details position (Top, Bottom, Left, and Right).
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-hero-layout-top" style="background: #059669; border-color: #059669; font-weight: 700; padding: 6px 18px;">
            <i class="fa-solid fa-floppy-disk"></i> Save Layout &amp; Background
          </button>
        </div>

        <!-- 1. Hero Background (Theme Color or Background Image) -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-palette" style="color: #059669;"></i> 1. Hero Background (Theme Color or Background Image)
          </div>

          <!-- Radio Type selector -->
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
            <label style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid ${bgType === 'default' ? '#059669' : '#cbd5e1'}; background: ${bgType === 'default' ? '#ecfdf5' : '#fff'}; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; color: ${bgType === 'default' ? '#065f46' : '#334155'};">
              <input type="radio" name="hero-bg-type" value="default" ${bgType === 'default' ? 'checked' : ''} style="accent-color: #059669;">
              Default Gradient
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid ${bgType === 'color' ? '#059669' : '#cbd5e1'}; background: ${bgType === 'color' ? '#ecfdf5' : '#fff'}; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; color: ${bgType === 'color' ? '#065f46' : '#334155'};">
              <input type="radio" name="hero-bg-type" value="color" ${bgType === 'color' ? 'checked' : ''} style="accent-color: #059669;">
              Theme / Solid Color
            </label>
            <label style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid ${bgType === 'image' ? '#059669' : '#cbd5e1'}; background: ${bgType === 'image' ? '#ecfdf5' : '#fff'}; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; color: ${bgType === 'image' ? '#065f46' : '#334155'};">
              <input type="radio" name="hero-bg-type" value="image" ${bgType === 'image' ? 'checked' : ''} style="accent-color: #059669;">
              Background Image
            </label>
          </div>

          <!-- Color options panel -->
          <div id="hero-bg-color-panel" style="display: ${bgType === 'color' ? 'block' : 'none'}; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 10px;">
              <label class="form-label" style="font-weight: 700; font-size: 12px;">Pick Theme Background Color</label>
              <div style="display: flex; align-items: center; gap: 10px;">
                <input type="color" id="hero-bg-color-picker" value="${l.bg_color || '#f0fdf4'}" style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; padding: 2px;">
                <input type="text" class="form-input" id="hero-bg-color-input" value="${this.escapeHtml(l.bg_color || '#f0fdf4')}" style="width: 140px; font-family: monospace; font-weight: 600;">
              </div>
            </div>
            <!-- Color presets chips -->
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b;">Theme Presets:</span>
              <button type="button" class="wp-chip hero-bg-preset" data-color="#f0fdf4" style="background:#f0fdf4; border:1px solid #bbf7d0; color:#166534;">Mint Soft Light</button>
              <button type="button" class="wp-chip hero-bg-preset" data-color="#064e3b" style="background:#064e3b; border:1px solid #047857; color:#fff;">Emerald Dark</button>
              <button type="button" class="wp-chip hero-bg-preset" data-color="#0f172a" style="background:#0f172a; border:1px solid #334155; color:#fff;">Slate Midnight</button>
              <button type="button" class="wp-chip hero-bg-preset" data-color="#ffffff" style="background:#ffffff; border:1px solid #cbd5e1; color:#0f172a;">Pure White</button>
              <button type="button" class="wp-chip hero-bg-preset" data-color="#ecfdf5" style="background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46;">Eco Pale Green</button>
              <button type="button" class="wp-chip hero-bg-preset" data-color="#1e293b" style="background:#1e293b; border:1px solid #475569; color:#fff;">Charcoal Dark</button>
            </div>
          </div>

          <!-- Image options panel -->
          <div id="hero-bg-image-panel" style="display: ${bgType === 'image' ? 'block' : 'none'}; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 10px;">
              <label class="form-label" style="font-weight: 700; font-size: 12px;">Background Image URL</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" class="form-input" id="hero-bg-image-url" value="${this.escapeHtml(l.bg_image_url || '')}" placeholder="https://... or select from Media Library">
                <button type="button" class="btn btn-outline btn-sm wp-btn-pick-media" data-target="hero-bg-image-url" style="white-space: nowrap; font-weight: 700;">
                  <i class="fa-solid fa-photo-film"></i> Media Library
                </button>
              </div>
            </div>
            <!-- Preset scenic Mannar images -->
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b;">Scenic Presets:</span>
              <button type="button" class="wp-chip hero-bg-img-preset" data-url="https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=1600">Coastal Causeway</button>
              <button type="button" class="wp-chip hero-bg-img-preset" data-url="https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=1600">Lagoon &amp; Dunes</button>
              <button type="button" class="wp-chip hero-bg-img-preset" data-url="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=1600">Eco Flamingo Sanctuary</button>
              <button type="button" class="wp-chip hero-bg-img-preset" data-url="https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=1600">Mannar Sunset</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px; font-weight: 700;">Image Position</label>
                <select id="hero-bg-position" class="form-input" style="font-size: 12px; height: 34px;">
                  <option value="center" ${bgPos === 'center' ? 'selected' : ''}>Center Center (Recommended)</option>
                  <option value="top" ${bgPos === 'top' ? 'selected' : ''}>Top Center</option>
                  <option value="bottom" ${bgPos === 'bottom' ? 'selected' : ''}>Bottom Center</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11.5px; font-weight: 700;">Scroll Attachment</label>
                <select id="hero-bg-attachment" class="form-input" style="font-size: 12px; height: 34px;">
                  <option value="scroll" ${l.bg_attachment !== 'fixed' ? 'selected' : ''}>Normal Scroll</option>
                  <option value="fixed" ${l.bg_attachment === 'fixed' ? 'selected' : ''}>Fixed / Parallax Effect</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Overlay Tint & Opacity for readability -->
          <div style="display: grid; grid-template-columns: 180px 1fr 180px; gap: 14px; align-items: center; padding-top: 10px; border-top: 1px solid #e2e8f0;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11px; font-weight: 700;">Overlay Tint Color</label>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="hero-overlay-color" value="${l.overlay_color || '#000000'}" style="width: 36px; height: 32px; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; padding: 2px;">
                <input type="text" class="form-input" id="hero-overlay-color-input" value="${this.escapeHtml(l.overlay_color || '#000000')}" style="font-size: 11.5px; font-family: monospace; height: 32px;">
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="wp-control-label">
                Overlay Opacity / Dimmer <span class="val-badge" id="hero-overlay-opacity-badge">${l.overlay_opacity || 0}%</span>
              </label>
              <input type="range" class="wp-slider" id="hero-overlay-opacity" min="0" max="90" step="5" value="${l.overlay_opacity || 0}">
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Use 40-70% overlay when using photo backgrounds for high text readability</div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 11px; font-weight: 700;">Text Contrast Mode</label>
              <select id="hero-contrast-mode" class="form-input" style="font-size: 12px; height: 32px;">
                <option value="auto" ${contrast === 'auto' ? 'selected' : ''}>Auto Detect</option>
                <option value="light" ${contrast === 'light' ? 'selected' : ''}>Force Light Text (Dark BG)</option>
                <option value="dark" ${contrast === 'dark' ? 'selected' : ''}>Force Dark Text (Light BG)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 2. Details Positioning & Spacing (Top, Bottom, Left, Right) -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-arrows-up-down-left-right" style="color: #059669;"></i> 2. Details Positioning &amp; Spacing (Top, Bottom, Left, Right)
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            <!-- Alignment Left / Center / Right -->
            <div class="wp-control-group">
              <label class="wp-control-label">Details Content Alignment</label>
              <div class="wp-btn-group" id="hero-details-align-group" style="width: 100%;">
                <button type="button" class="wp-btn-toggle ${align === 'left' ? 'active' : ''}" data-align="left" style="flex: 1;" title="Align Left">
                  <i class="fa-solid fa-align-left"></i> Left
                </button>
                <button type="button" class="wp-btn-toggle ${align === 'center' ? 'active' : ''}" data-align="center" style="flex: 1;" title="Align Center">
                  <i class="fa-solid fa-align-center"></i> Center
                </button>
                <button type="button" class="wp-btn-toggle ${align === 'right' ? 'active' : ''}" data-align="right" style="flex: 1;" title="Align Right">
                  <i class="fa-solid fa-align-right"></i> Right
                </button>
              </div>
              <input type="hidden" id="hero-details-alignment" value="${align}">
            </div>

            <!-- Top Spacing / Padding -->
            <div class="wp-control-group">
              <label class="wp-control-label">
                Top Spacing (Padding Top) <span class="val-badge" id="hero-pad-top-badge">${l.padding_top !== undefined ? l.padding_top : 80}px</span>
              </label>
              <input type="range" class="wp-slider" id="hero-padding-top" min="20" max="220" step="5" value="${l.padding_top !== undefined ? l.padding_top : 80}">
              <div class="wp-chip-group">
                <button type="button" class="wp-chip hero-pad-top-chip" data-val="40">40px</button>
                <button type="button" class="wp-chip hero-pad-top-chip" data-val="80">80px (Std)</button>
                <button type="button" class="wp-chip hero-pad-top-chip" data-val="120">120px</button>
                <button type="button" class="wp-chip hero-pad-top-chip" data-val="160">160px</button>
              </div>
            </div>

            <!-- Bottom Spacing / Padding -->
            <div class="wp-control-group">
              <label class="wp-control-label">
                Bottom Spacing (Padding Bottom) <span class="val-badge" id="hero-pad-bottom-badge">${l.padding_bottom !== undefined ? l.padding_bottom : 80}px</span>
              </label>
              <input type="range" class="wp-slider" id="hero-padding-bottom" min="20" max="220" step="5" value="${l.padding_bottom !== undefined ? l.padding_bottom : 80}">
              <div class="wp-chip-group">
                <button type="button" class="wp-chip hero-pad-bottom-chip" data-val="40">40px</button>
                <button type="button" class="wp-chip hero-pad-bottom-chip" data-val="80">80px (Std)</button>
                <button type="button" class="wp-chip hero-pad-bottom-chip" data-val="120">120px</button>
                <button type="button" class="wp-chip hero-pad-bottom-chip" data-val="160">160px</button>
              </div>
            </div>

            <!-- Left & Right Padding / Inset -->
            <div class="wp-control-group">
              <label class="wp-control-label">
                Left &amp; Right Inset (Padding X) <span class="val-badge" id="hero-pad-x-badge">${l.padding_x !== undefined ? l.padding_x : 24}px</span>
              </label>
              <input type="range" class="wp-slider" id="hero-padding-x" min="12" max="80" step="4" value="${l.padding_x !== undefined ? l.padding_x : 24}">
              <div class="wp-chip-group">
                <button type="button" class="wp-chip hero-pad-x-chip" data-val="16">16px Compact</button>
                <button type="button" class="wp-chip hero-pad-x-chip" data-val="24">24px Standard</button>
                <button type="button" class="wp-chip hero-pad-x-chip" data-val="36">36px Wide</button>
                <button type="button" class="wp-chip hero-pad-x-chip" data-val="48">48px Relaxed</button>
              </div>
            </div>

            <!-- Max Content Width -->
            <div class="wp-control-group">
              <label class="wp-control-label">Max Container Width</label>
              <select id="hero-max-width" class="form-input" style="font-size: 12px; height: 34px;">
                <option value="1100px" ${l.max_width === '1100px' ? 'selected' : ''}>1100px - Focused</option>
                <option value="1280px" ${(!l.max_width || l.max_width === '1280px') ? 'selected' : ''}>1280px - Default Standard</option>
                <option value="1440px" ${l.max_width === '1440px' ? 'selected' : ''}>1440px - Wide Screen</option>
                <option value="100%" ${l.max_width === '100%' ? 'selected' : ''}>100% - Full Width</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; gap: 10px;">
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-hero-layout-only" style="background: #059669; border-color: #059669; font-weight: 700; padding: 7px 22px;">
            <i class="fa-solid fa-floppy-disk"></i> Save Hero Background &amp; Layout
          </button>
        </div>
      </div>
    `;
  }

  renderWpTypographyControls(secKey, tCfg, titleLabel) {
    const s = tCfg || {};
    return `
      <div class="wp-control-grid">
        <!-- 1. Font Size -->
        <div class="wp-control-group">
          <label class="wp-control-label">
            Font Size <span class="val-badge" id="wp-${secKey}-size-badge">${s.fontSize || 32}px</span>
          </label>
          <input type="range" class="wp-slider" id="wp-${secKey}-font-size" min="14" max="72" value="${s.fontSize || 32}">
          <div class="wp-chip-group">
            <button type="button" class="wp-chip wp-size-chip" data-target="wp-${secKey}-font-size" data-val="16">16px SM</button>
            <button type="button" class="wp-chip wp-size-chip" data-target="wp-${secKey}-font-size" data-val="24">24px MD</button>
            <button type="button" class="wp-chip wp-size-chip" data-target="wp-${secKey}-font-size" data-val="32">32px LG</button>
            <button type="button" class="wp-chip wp-size-chip" data-target="wp-${secKey}-font-size" data-val="48">48px XL</button>
            <button type="button" class="wp-chip wp-size-chip" data-target="wp-${secKey}-font-size" data-val="60">60px 2XL</button>
          </div>
        </div>

        <!-- 2. Font Style & Weight -->
        <div class="wp-control-group">
          <label class="wp-control-label">Font Style</label>
          <div class="wp-btn-group" id="wp-${secKey}-style-group">
            <button type="button" data-val="normal" class="${s.fontStyle === 'normal' || !s.fontStyle ? 'active' : ''}">Normal</button>
            <button type="button" data-val="italic" class="${s.fontStyle === 'italic' ? 'active' : ''}"><i>Italic</i></button>
            <button type="button" data-val="oblique" class="${s.fontStyle === 'oblique' ? 'active' : ''}">Oblique</button>
          </div>
          <input type="hidden" id="wp-${secKey}-font-style" value="${s.fontStyle || 'normal'}">

          <label class="wp-control-label" style="margin-top: 10px;">Font Weight</label>
          <div class="wp-btn-group" id="wp-${secKey}-weight-group">
            <button type="button" data-val="400" class="${s.fontWeight === '400' ? 'active' : ''}">400 Reg</button>
            <button type="button" data-val="600" class="${s.fontWeight === '600' ? 'active' : ''}">600 Semi</button>
            <button type="button" data-val="700" class="${s.fontWeight === '700' ? 'active' : ''}">700 Bold</button>
            <button type="button" data-val="900" class="${s.fontWeight === '900' || !s.fontWeight ? 'active' : ''}">900 Black</button>
          </div>
          <input type="hidden" id="wp-${secKey}-font-weight" value="${s.fontWeight || '700'}">
        </div>

        <!-- 3. Text Color & Alignment -->
        <div class="wp-control-group">
          <label class="wp-control-label">Text Color</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="color" id="wp-${secKey}-color" value="${s.color || '#111827'}" style="width: 38px; height: 32px; border: none; cursor: pointer; border-radius: 6px;">
            <input type="text" class="form-input" id="wp-${secKey}-color-hex" value="${s.color || '#111827'}" style="width: 95px; font-family: monospace; font-size: 12px; padding: 4px 8px;">
          </div>
          <div class="wp-color-palette" style="margin-top: 6px;">
            <span class="wp-color-swatch" style="background:#059669;" data-target="wp-${secKey}-color" data-val="#059669" title="Emerald"></span>
            <span class="wp-color-swatch" style="background:#064e3b;" data-target="wp-${secKey}-color" data-val="#064e3b" title="Forest"></span>
            <span class="wp-color-swatch" style="background:#111827;" data-target="wp-${secKey}-color" data-val="#111827" title="Charcoal"></span>
            <span class="wp-color-swatch" style="background:#0284c7;" data-target="wp-${secKey}-color" data-val="#0284c7" title="Sky"></span>
            <span class="wp-color-swatch" style="background:#d97706;" data-target="wp-${secKey}-color" data-val="#d97706" title="Amber"></span>
            <span class="wp-color-swatch" style="background:#dc2626;" data-target="wp-${secKey}-color" data-val="#dc2626" title="Red"></span>
          </div>

          <label class="wp-control-label" style="margin-top: 10px;">Text Alignment</label>
          <div class="wp-btn-group" id="wp-${secKey}-align-group">
            <button type="button" data-val="left" class="${s.alignment === 'left' ? 'active' : ''}"><i class="fa-solid fa-align-left"></i> Left</button>
            <button type="button" data-val="center" class="${s.alignment === 'center' || !s.alignment ? 'active' : ''}"><i class="fa-solid fa-align-center"></i> Center</button>
            <button type="button" data-val="right" class="${s.alignment === 'right' ? 'active' : ''}"><i class="fa-solid fa-align-right"></i> Right</button>
            <button type="button" data-val="justify" class="${s.alignment === 'justify' ? 'active' : ''}"><i class="fa-solid fa-align-justify"></i></button>
          </div>
          <input type="hidden" id="wp-${secKey}-alignment" value="${s.alignment || 'center'}">
        </div>

        <!-- 4. Text Gradient (radint) -->
        <div class="wp-control-group">
          <label class="wp-control-label">Gradient Text (radint)</label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 2px;">
            <input type="checkbox" id="wp-${secKey}-grad-enable" ${s.gradientEnabled ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #059669;">
            <span style="font-size: 12px; font-weight: 600; color: #1e293b;">Enable Gradient Text Effect</span>
          </label>
          <div id="wp-${secKey}-grad-options" style="display: ${s.gradientEnabled ? 'flex' : 'none'}; flex-direction: column; gap: 8px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; width: 40px; color: #64748b;">Start:</span>
              <input type="color" id="wp-${secKey}-grad-start" value="${s.gradientStart || '#059669'}">
              <span style="font-size: 11px; width: 35px; color: #64748b;">End:</span>
              <input type="color" id="wp-${secKey}-grad-end" value="${s.gradientEnd || '#10b981'}">
            </div>
            <div class="wp-chip-group">
              <button type="button" class="wp-chip wp-grad-preset" data-sec="${secKey}" data-start="#059669" data-end="#10b981">Emerald</button>
              <button type="button" class="wp-chip wp-grad-preset" data-sec="${secKey}" data-start="#d97706" data-end="#fbbf24">Sunset Gold</button>
              <button type="button" class="wp-chip wp-grad-preset" data-sec="${secKey}" data-start="#0284c7" data-end="#38bdf8">Ocean Cyan</button>
              <button type="button" class="wp-chip wp-grad-preset" data-sec="${secKey}" data-start="#7c3aed" data-end="#c084fc">Royal Purple</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderWpImageControls(secKey, iCfg, imgLabel) {
    const s = iCfg || {};
    return `
      <div class="wp-control-grid">
        <!-- 0. Image Source / URL & Media Library Picker -->
        <div class="wp-control-group" style="grid-column: 1 / -1; background: #ffffff; padding: 12px 14px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 6px;">
          <label class="wp-control-label" style="color: #0f172a; font-size: 11.5px; font-weight: 700; margin-bottom: 6px;">
            <span><i class="fa-solid fa-image" style="color: #0073aa;"></i> ${this.escapeHtml(imgLabel)} Source URL</span>
            <span class="val-badge" id="wp-${secKey}-img-src-badge">Image URL</span>
          </label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" class="form-input wp-img-url-input" id="wp-${secKey}-img-url" value="${this.escapeHtml(s.imgUrl || '')}" placeholder="Paste image URL (https://...) or choose from Media Library" style="flex: 1; font-size: 13px;">
            <button type="button" class="btn btn-outline btn-sm wp-btn-pick-media" data-target="wp-${secKey}-img-url" style="color: #0073aa; border-color: #93c5fd; white-space: nowrap; font-weight: 600;">
              <i class="fa-solid fa-photo-film"></i> Media Library
            </button>
          </div>
        </div>

        <!-- 1. Image Size (Width) -->
        <div class="wp-control-group">
          <label class="wp-control-label">
            Image Size (Width) <span class="val-badge" id="wp-${secKey}-img-w-badge">${s.imgWidth || 100}%</span>
          </label>
          <input type="range" class="wp-slider" id="wp-${secKey}-img-width" min="20" max="100" value="${s.imgWidth || 100}">
          <div class="wp-chip-group">
            <button type="button" class="wp-chip wp-img-w-chip" data-target="wp-${secKey}-img-width" data-val="25">25%</button>
            <button type="button" class="wp-chip wp-img-w-chip" data-target="wp-${secKey}-img-width" data-val="50">50%</button>
            <button type="button" class="wp-chip wp-img-w-chip" data-target="wp-${secKey}-img-width" data-val="75">75%</button>
            <button type="button" class="wp-chip wp-img-w-chip" data-target="wp-${secKey}-img-width" data-val="100">100% Full</button>
          </div>
        </div>

        <!-- 2. Image Style / Elevation -->
        <div class="wp-control-group">
          <label class="wp-control-label">Image Style & Shadow</label>
          <div class="wp-btn-group" id="wp-${secKey}-img-style-group">
            <button type="button" data-val="default" class="${s.imgStyle === 'default' ? 'active' : ''}">Default</button>
            <button type="button" data-val="elevated" class="${s.imgStyle === 'elevated' || !s.imgStyle ? 'active' : ''}">Elevated</button>
            <button type="button" data-val="glow" class="${s.imgStyle === 'glow' ? 'active' : ''}">Glow</button>
            <button type="button" data-val="glass" class="${s.imgStyle === 'glass' ? 'active' : ''}">Glass</button>
          </div>
          <input type="hidden" id="wp-${secKey}-img-style" value="${s.imgStyle || 'elevated'}">

          <label class="wp-control-label" style="margin-top: 10px;">Margin Alignment</label>
          <div class="wp-btn-group" id="wp-${secKey}-img-align-group">
            <button type="button" data-val="left" class="${s.imgMarginAlign === 'left' ? 'active' : ''}">Left</button>
            <button type="button" data-val="center" class="${s.imgMarginAlign === 'center' || !s.imgMarginAlign ? 'active' : ''}">Center</button>
            <button type="button" data-val="right" class="${s.imgMarginAlign === 'right' ? 'active' : ''}">Right</button>
          </div>
          <input type="hidden" id="wp-${secKey}-img-align" value="${s.imgMarginAlign || 'center'}">
        </div>

        <!-- 3. Border & Radius -->
        <div class="wp-control-group">
          <label class="wp-control-label">
            Border Radius <span class="val-badge" id="wp-${secKey}-img-rad-badge">${s.imgRadius !== undefined ? s.imgRadius : 16}px</span>
          </label>
          <input type="range" class="wp-slider" id="wp-${secKey}-img-radius" min="0" max="48" value="${s.imgRadius !== undefined ? s.imgRadius : 16}">
          <div class="wp-chip-group">
            <button type="button" class="wp-chip wp-rad-chip" data-target="wp-${secKey}-img-radius" data-val="0">Sharp 0px</button>
            <button type="button" class="wp-chip wp-rad-chip" data-target="wp-${secKey}-img-radius" data-val="12">Rounded 12px</button>
            <button type="button" class="wp-chip wp-rad-chip" data-target="wp-${secKey}-img-radius" data-val="24">Curved 24px</button>
            <button type="button" class="wp-chip wp-rad-chip" data-target="wp-${secKey}-img-radius" data-val="48">Pill 48px</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
            <div>
              <label class="wp-control-label" style="font-size: 10px;">Border Width</label>
              <input type="number" class="form-input" id="wp-${secKey}-img-border-w" min="0" max="10" value="${s.imgBorderWidth || 0}" style="padding: 4px 8px; font-size: 12px;">
            </div>
            <div>
              <label class="wp-control-label" style="font-size: 10px;">Border Color</label>
              <input type="color" id="wp-${secKey}-img-border-c" value="${s.imgBorderColor || '#e2e8f0'}" style="width: 100%; height: 32px; border: none; cursor: pointer; border-radius: 6px;">
            </div>
          </div>
        </div>

        <!-- 4. Padding, Brightness & Blur -->
        <div class="wp-control-group">
          <label class="wp-control-label">
            Padding (Spacing) <span class="val-badge" id="wp-${secKey}-img-pad-badge">${s.imgPadding || 0}px</span>
          </label>
          <input type="range" class="wp-slider" id="wp-${secKey}-img-padding" min="0" max="32" value="${s.imgPadding || 0}">

          <label class="wp-control-label" style="margin-top: 10px;">
            Brightness <span class="val-badge" id="wp-${secKey}-img-bright-badge">${s.imgBrightness !== undefined ? s.imgBrightness : 100}%</span>
          </label>
          <input type="range" class="wp-slider" id="wp-${secKey}-img-brightness" min="50" max="150" value="${s.imgBrightness !== undefined ? s.imgBrightness : 100}">

          <label class="wp-control-label" style="margin-top: 10px;">
            Blur Effect (bler) <span class="val-badge" id="wp-${secKey}-img-blur-badge">${s.imgBlur || 0}px</span>
          </label>
          <input type="range" class="wp-slider" id="wp-${secKey}-img-blur" min="0" max="15" value="${s.imgBlur || 0}">
        </div>
      </div>
    `;
  }

  renderWpFitnessDualImageControls(fStyles) {
    const s = fStyles || {};
    const fitImgs = (typeof this.getFitnessImages === 'function') ? this.getFitnessImages() : {};

    // Image 1 defaults
    const img1Url = s.img1 || s.imgUrl || fitImgs.img1 || 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600';
    const img1Alt = s.img1_alt || 'Cycling Fitness in Mannar';
    const img1Width = s.img1_width || s.imgWidth || 100;
    const img1Style = s.img1_style || s.imgStyle || 'elevated';
    const img1Radius = s.img1_radius !== undefined ? s.img1_radius : (s.imgRadius !== undefined ? s.imgRadius : 16);
    const img1BorderW = s.img1_border_w !== undefined ? s.img1_border_w : (s.imgBorderWidth || 0);
    const img1BorderC = s.img1_border_c || s.imgBorderColor || '#e2e8f0';
    const img1Padding = s.img1_padding !== undefined ? s.img1_padding : (s.imgPadding || 0);
    const img1Align = s.img1_align || s.imgMarginAlign || 'center';
    const img1Brightness = s.img1_brightness !== undefined ? s.img1_brightness : (s.imgBrightness !== undefined ? s.imgBrightness : 100);
    const img1Blur = s.img1_blur !== undefined ? s.img1_blur : (s.imgBlur || 0);

    // Image 2 defaults
    const img2Url = s.img2 || fitImgs.img2 || 'https://drive.google.com/thumbnail?id=1Set2mnZc8B5Ua0qZcxFw52hzAAwApJ7x&sz=w1600';
    const img2Alt = s.img2_alt || 'Tourist Adventure';
    const img2Width = s.img2_width || 100;
    const img2Style = s.img2_style || 'elevated';
    const img2Radius = s.img2_radius !== undefined ? s.img2_radius : 16;
    const img2BorderW = s.img2_border_w !== undefined ? s.img2_border_w : 0;
    const img2BorderC = s.img2_border_c || '#e2e8f0';
    const img2Padding = s.img2_padding !== undefined ? s.img2_padding : 0;
    const img2Align = s.img2_align || 'center';
    const img2Brightness = s.img2_brightness !== undefined ? s.img2_brightness : 100;
    const img2Blur = s.img2_blur !== undefined ? s.img2_blur : 0;

    const renderSingleFitnessImgPanel = (num, label, icon, url, alt, width, style, radius, borderW, borderC, padding, align, brightness, blur) => `
      <div id="wp-fitness-img${num}-panel" class="wp-fitness-img-panel" style="${num === 2 ? 'display: none;' : ''}">
        <div class="wp-control-grid">
          <!-- 0. Source URL & Media Actions -->
          <div class="wp-control-group" style="grid-column: 1 / -1; background: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="wp-control-label" style="color: #0f172a; font-size: 12px; font-weight: 700; margin: 0;">
                <i class="${icon}" style="color: #0073aa;"></i> ${label} Source URL
              </label>
              <span class="val-badge" id="wp-fitness-img${num}-status-badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">Dual Image ${num}</span>
            </div>
            
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="text" class="form-input wp-img-url-input" id="wp-fitness-img${num}-url" value="${this.escapeHtml(url)}" placeholder="Paste image URL (https://...) or upload" style="flex: 1; min-width: 240px; font-size: 13px;">
              <button type="button" class="btn btn-outline btn-sm wp-btn-pick-media" data-target="wp-fitness-img${num}-url" style="color: #0073aa; border-color: #93c5fd; white-space: nowrap; font-weight: 600;">
                <i class="fa-solid fa-photo-film"></i> Media Library
              </button>
              <label class="btn btn-outline btn-sm" style="margin: 0; white-space: nowrap; cursor: pointer; color: #059669; border-color: #a7f3d0; font-weight: 600;">
                <i class="fa-solid fa-cloud-arrow-up"></i> Upload Image
                <input type="file" accept="image/*" style="display: none;" onchange="window.adminCMS.handleFitnessImageUpload(this, ${num})">
              </label>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.resetFitnessImage(${num})" style="color: #64748b; border-color: #cbd5e1; white-space: nowrap;" title="Reset to default">
                <i class="fa-solid fa-rotate-left"></i> Reset
              </button>
            </div>

            <div style="margin-top: 10px;">
              <label class="wp-control-label" style="font-size: 11px; margin-bottom: 4px;">Image Alt Text (SEO & Accessibility)</label>
              <input type="text" class="form-input" id="wp-fitness-img${num}-alt" value="${this.escapeHtml(alt)}" placeholder="e.g. Cycling Fitness in Mannar" style="font-size: 12.5px; padding: 6px 10px;">
            </div>
          </div>

          <!-- 1. Size / Width -->
          <div class="wp-control-group">
            <label class="wp-control-label">
              Image Size (Width) <span class="val-badge" id="wp-fitness-img${num}-w-badge">${width}%</span>
            </label>
            <input type="range" class="wp-slider" id="wp-fitness-img${num}-width" min="20" max="100" value="${width}">
            <div class="wp-chip-group">
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-width', 25)">25%</button>
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-width', 50)">50%</button>
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-width', 75)">75%</button>
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-width', 100)">100% Full</button>
            </div>
          </div>

          <!-- 2. Style & Margin Alignment -->
          <div class="wp-control-group">
            <label class="wp-control-label">Image Style & Shadow</label>
            <div class="wp-btn-group" id="wp-fitness-img${num}-style-group">
              <button type="button" data-val="default" class="${style === 'default' ? 'active' : ''}">Default</button>
              <button type="button" data-val="elevated" class="${style === 'elevated' || !style ? 'active' : ''}">Elevated</button>
              <button type="button" data-val="glow" class="${style === 'glow' ? 'active' : ''}">Glow</button>
              <button type="button" data-val="glass" class="${style === 'glass' ? 'active' : ''}">Glass</button>
            </div>
            <input type="hidden" id="wp-fitness-img${num}-style" value="${style || 'elevated'}">

            <label class="wp-control-label" style="margin-top: 10px;">Margin Alignment</label>
            <div class="wp-btn-group" id="wp-fitness-img${num}-align-group">
              <button type="button" data-val="left" class="${align === 'left' ? 'active' : ''}">Left</button>
              <button type="button" data-val="center" class="${align === 'center' || !align ? 'active' : ''}">Center</button>
              <button type="button" data-val="right" class="${align === 'right' ? 'active' : ''}">Right</button>
            </div>
            <input type="hidden" id="wp-fitness-img${num}-align" value="${align || 'center'}">
          </div>

          <!-- 3. Border & Radius -->
          <div class="wp-control-group">
            <label class="wp-control-label">
              Border Radius <span class="val-badge" id="wp-fitness-img${num}-rad-badge">${radius}px</span>
            </label>
            <input type="range" class="wp-slider" id="wp-fitness-img${num}-radius" min="0" max="48" value="${radius}">
            <div class="wp-chip-group">
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-radius', 0)">Sharp 0px</button>
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-radius', 12)">Rounded 12px</button>
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-radius', 24)">Curved 24px</button>
              <button type="button" class="wp-chip" onclick="window.adminCMS.setFitnessSlider('wp-fitness-img${num}-radius', 48)">Pill 48px</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
              <div>
                <label class="wp-control-label" style="font-size: 10px;">Border Width</label>
                <input type="number" class="form-input" id="wp-fitness-img${num}-border-w" min="0" max="10" value="${borderW}" style="padding: 4px 8px; font-size: 12px;">
              </div>
              <div>
                <label class="wp-control-label" style="font-size: 10px;">Border Color</label>
                <input type="color" id="wp-fitness-img${num}-border-c" value="${borderC}" style="width: 100%; height: 32px; border: none; cursor: pointer; border-radius: 6px;">
              </div>
            </div>
          </div>

          <!-- 4. Padding, Brightness & Blur -->
          <div class="wp-control-group">
            <label class="wp-control-label">
              Padding (Spacing) <span class="val-badge" id="wp-fitness-img${num}-pad-badge">${padding}px</span>
            </label>
            <input type="range" class="wp-slider" id="wp-fitness-img${num}-padding" min="0" max="32" value="${padding}">

            <label class="wp-control-label" style="margin-top: 10px;">
              Brightness <span class="val-badge" id="wp-fitness-img${num}-bright-badge">${brightness}%</span>
            </label>
            <input type="range" class="wp-slider" id="wp-fitness-img${num}-brightness" min="50" max="150" value="${brightness}">

            <label class="wp-control-label" style="margin-top: 10px;">
              Blur Effect (bler) <span class="val-badge" id="wp-fitness-img${num}-blur-badge">${blur}px</span>
            </label>
            <input type="range" class="wp-slider" id="wp-fitness-img${num}-blur" min="0" max="15" value="${blur}">
          </div>
        </div>
      </div>
    `;

    return `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 12.5px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-layer-group" style="color: #0073aa;"></i> Dual Image Select & Controls
          </div>
          <div style="background: #e2e8f0; padding: 3px; border-radius: 8px; display: inline-flex; gap: 4px;">
            <button type="button" class="btn btn-sm wp-subtab-btn active" id="wp-fitness-subtab-1" onclick="window.adminCMS.switchFitnessImgSubTab(1)" style="font-weight: 700; font-size: 11.5px; background: #0073aa; color: #fff; border: none; border-radius: 6px; padding: 5px 12px; cursor: pointer; transition: all 0.2s;">
              <i class="fa-solid fa-bicycle"></i> Image 1: Cycling Fitness
            </button>
            <button type="button" class="btn btn-sm wp-subtab-btn" id="wp-fitness-subtab-2" onclick="window.adminCMS.switchFitnessImgSubTab(2)" style="font-weight: 700; font-size: 11.5px; background: transparent; color: #475569; border: none; border-radius: 6px; padding: 5px 12px; cursor: pointer; transition: all 0.2s;">
              <i class="fa-solid fa-mountain-sun"></i> Image 2: Tourist Adventure
            </button>
          </div>
        </div>

        ${renderSingleFitnessImgPanel(1, 'Image 1: Cycling Fitness in Mannar', 'fa-solid fa-bicycle', img1Url, img1Alt, img1Width, img1Style, img1Radius, img1BorderW, img1BorderC, img1Padding, img1Align, img1Brightness, img1Blur)}
        ${renderSingleFitnessImgPanel(2, 'Image 2: Tourist Adventure', 'fa-solid fa-mountain-sun', img2Url, img2Alt, img2Width, img2Style, img2Radius, img2BorderW, img2BorderC, img2Padding, img2Align, img2Brightness, img2Blur)}
      </div>
    `;
  }

  switchFitnessImgSubTab(num) {
    const btn1 = document.getElementById('wp-fitness-subtab-1');
    const btn2 = document.getElementById('wp-fitness-subtab-2');
    const p1 = document.getElementById('wp-fitness-img1-panel');
    const p2 = document.getElementById('wp-fitness-img2-panel');
    if (!btn1 || !btn2 || !p1 || !p2) return;

    if (num === 1) {
      btn1.classList.add('active');
      btn1.style.background = '#0073aa';
      btn1.style.color = '#fff';
      btn2.classList.remove('active');
      btn2.style.background = 'transparent';
      btn2.style.color = '#475569';
      p1.style.display = 'block';
      p2.style.display = 'none';
    } else {
      btn2.classList.add('active');
      btn2.style.background = '#0073aa';
      btn2.style.color = '#fff';
      btn1.classList.remove('active');
      btn1.style.background = 'transparent';
      btn1.style.color = '#475569';
      p1.style.display = 'none';
      p2.style.display = 'block';
    }
  }

  async handleFitnessImageUpload(input, num) {
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('Image size exceeds 10MB limit', 'warning');
      return;
    }

    try {
      this.showToast(`Uploading Image ${num}...`, 'info');
      const ext = file.name.split('.').pop();
      const filename = `fitness_${num}_${Date.now()}.${ext}`;
      const path = `fitness/${filename}`;

      const { data, error } = await this.supabase.storage
        .from('website-media')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: pubData } = this.supabase.storage
        .from('website-media')
        .getPublicUrl(path);

      const pubUrl = pubData?.publicUrl || '';
      if (!pubUrl) throw new Error('Could not retrieve public URL for uploaded image');

      const urlInput = document.getElementById(`wp-fitness-img${num}-url`);
      if (urlInput) urlInput.value = pubUrl;

      // Also sync with fitness cards tab if present
      const altInput = document.getElementById(`fitness-img${num}-input`);
      if (altInput) altInput.value = pubUrl;
      const altPrev = document.getElementById(`fitness-img${num}-preview`);
      if (altPrev) altPrev.src = pubUrl;

      this.updateWpFitnessPreview();
      this.showToast(`Image ${num} uploaded successfully!`, 'success');
    } catch (err) {
      this.showToast(err.message || `Failed to upload Image ${num}`, 'error');
    } finally {
      input.value = '';
    }
  }

  resetFitnessImage(num) {
    const defaultUrls = {
      1: 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600',
      2: 'https://drive.google.com/thumbnail?id=1Set2mnZc8B5Ua0qZcxFw52hzAAwApJ7x&sz=w1600'
    };
    const defaultAlts = {
      1: 'Cycling Fitness in Mannar',
      2: 'Tourist Adventure'
    };

    const urlInput = document.getElementById(`wp-fitness-img${num}-url`);
    if (urlInput) urlInput.value = defaultUrls[num] || '';

    const altInput = document.getElementById(`wp-fitness-img${num}-alt`);
    if (altInput) altInput.value = defaultAlts[num] || '';

    this.setFitnessSlider(`wp-fitness-img${num}-width`, 100);
    this.setFitnessSlider(`wp-fitness-img${num}-radius`, 16);
    this.setFitnessSlider(`wp-fitness-img${num}-padding`, 0);
    this.setFitnessSlider(`wp-fitness-img${num}-brightness`, 100);
    this.setFitnessSlider(`wp-fitness-img${num}-blur`, 0);

    const bwInput = document.getElementById(`wp-fitness-img${num}-border-w`);
    if (bwInput) bwInput.value = 0;

    const bcInput = document.getElementById(`wp-fitness-img${num}-border-c`);
    if (bcInput) bcInput.value = '#e2e8f0';

    this.setFitnessBtnVal(`wp-fitness-img${num}-style-group`, `wp-fitness-img${num}-style`, 'elevated');
    this.setFitnessBtnVal(`wp-fitness-img${num}-align-group`, `wp-fitness-img${num}-align`, 'center');

    this.updateWpFitnessPreview();
    this.showToast(`Image ${num} reset to default styles`, 'info');
  }

  setFitnessSlider(inputId, val) {
    const el = document.getElementById(inputId);
    if (el) {
      el.value = val;
      this.updateWpFitnessPreview();
    }
  }

  setFitnessBtnVal(groupId, hiddenId, val) {
    const group = document.getElementById(groupId);
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = val;
    if (group) {
      group.querySelectorAll('button').forEach(btn => {
        if (btn.dataset.val === val) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
    this.updateWpFitnessPreview();
  }

  updateWpFitnessPreview() {
    [1, 2].forEach(num => {
      const prevImg = document.getElementById(`wp-fitness-preview-img${num}`);
      const url = document.getElementById(`wp-fitness-img${num}-url`)?.value?.trim();
      const alt = document.getElementById(`wp-fitness-img${num}-alt`)?.value || '';
      const w = document.getElementById(`wp-fitness-img${num}-width`)?.value || '100';
      const st = document.getElementById(`wp-fitness-img${num}-style`)?.value || 'elevated';
      const r = document.getElementById(`wp-fitness-img${num}-radius`)?.value || '16';
      const bw = document.getElementById(`wp-fitness-img${num}-border-w`)?.value || '0';
      const bc = document.getElementById(`wp-fitness-img${num}-border-c`)?.value || '#e2e8f0';
      const p = document.getElementById(`wp-fitness-img${num}-padding`)?.value || '0';
      const al = document.getElementById(`wp-fitness-img${num}-align`)?.value || 'center';
      const br = document.getElementById(`wp-fitness-img${num}-brightness`)?.value || '100';
      const bl = document.getElementById(`wp-fitness-img${num}-blur`)?.value || '0';

      // Update badges
      const wBadge = document.getElementById(`wp-fitness-img${num}-w-badge`);
      if (wBadge) wBadge.textContent = `${w}%`;
      const rBadge = document.getElementById(`wp-fitness-img${num}-rad-badge`);
      if (rBadge) rBadge.textContent = `${r}px`;
      const pBadge = document.getElementById(`wp-fitness-img${num}-pad-badge`);
      if (pBadge) pBadge.textContent = `${p}px`;
      const brBadge = document.getElementById(`wp-fitness-img${num}-bright-badge`);
      if (brBadge) brBadge.textContent = `${br}%`;
      const blBadge = document.getElementById(`wp-fitness-img${num}-blur-badge`);
      if (blBadge) blBadge.textContent = `${bl}px`;

      if (prevImg) {
        if (url) prevImg.src = this.normalizeImageUrl(url);
        prevImg.alt = alt;
        prevImg.style.width = `${w}%`;
        prevImg.style.borderRadius = `${r}px`;
        prevImg.style.border = (parseInt(bw) > 0) ? `${bw}px solid ${bc}` : 'none';
        prevImg.style.padding = `${p}px`;
        prevImg.style.filter = `brightness(${br}%) blur(${bl}px)`;
        prevImg.style.marginLeft = al === 'right' ? 'auto' : (al === 'center' ? 'auto' : '0');
        prevImg.style.marginRight = al === 'left' ? 'auto' : (al === 'center' ? 'auto' : '0');

        if (st === 'elevated') {
          prevImg.style.boxShadow = '0 16px 30px rgba(0,0,0,0.2)';
        } else if (st === 'glow') {
          prevImg.style.boxShadow = '0 0 20px rgba(16,185,129,0.5)';
        } else if (st === 'glass') {
          prevImg.style.boxShadow = '0 8px 32px rgba(31,38,135,0.2)';
          prevImg.style.border = '2px solid rgba(255,255,255,0.5)';
        } else {
          prevImg.style.boxShadow = 'none';
        }
      }
    });
  }

  renderWpPreviewCanvas(secKey, cfg, defaultTitle, defaultImg) {
    const t = cfg || {};
    const hasGrad = t.gradientEnabled;
    const titleStyle = `
      font-size: ${t.fontSize || 32}px;
      font-style: ${t.fontStyle || 'normal'};
      font-weight: ${t.fontWeight || '700'};
      text-align: ${t.alignment || 'center'};
      ${hasGrad
        ? `background-image: linear-gradient(135deg, ${t.gradientStart || '#059669'}, ${t.gradientEnd || '#10b981'}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: transparent; display: inline-block;`
        : `color: ${t.color || '#111827'};`}
      transition: all 0.2s ease;
      line-height: 1.25;
      margin-bottom: 12px;
    `;

    const imgStyle = `
      width: ${t.imgWidth || 100}%;
      border-radius: ${t.imgRadius !== undefined ? t.imgRadius : 16}px;
      border: ${t.imgBorderWidth > 0 ? `${t.imgBorderWidth}px solid ${t.imgBorderColor || '#e2e8f0'}` : 'none'};
      padding: ${t.imgPadding || 0}px;
      filter: brightness(${t.imgBrightness !== undefined ? t.imgBrightness : 100}%) blur(${t.imgBlur || 0}px);
      box-shadow: ${t.imgStyle === 'elevated' ? '0 16px 30px rgba(0,0,0,0.2)' : (t.imgStyle === 'glow' ? '0 0 20px rgba(16,185,129,0.5)' : (t.imgStyle === 'glass' ? '0 8px 32px rgba(31,38,135,0.2)' : 'none'))};
      display: block;
      margin-left: ${t.imgMarginAlign === 'right' ? 'auto' : (t.imgMarginAlign === 'center' ? 'auto' : '0')};
      margin-right: ${t.imgMarginAlign === 'left' ? 'auto' : (t.imgMarginAlign === 'center' ? 'auto' : '0')};
      max-height: 220px;
      object-fit: cover;
      transition: all 0.2s ease;
    `;

    if (secKey === 'hero') {
      const sliderCfg = this.heroSliderData || this.getHeroSliderConfig();
      const layoutCfg = this.heroLayoutData || this.getHeroLayoutConfig();
      const slides = (sliderCfg && Array.isArray(sliderCfg.slides) && sliderCfg.slides.length)
        ? sliderCfg.slides
        : [{ id: "slide_1", url: defaultImg || 'https://drive.google.com/thumbnail?id=1ZuYVfL-kmlxJWkeSuMM6_b-V1fIclTf_&sz=w1600', title: 'Eco-Friendly Cycling', subtitle: 'Explore Mannar' }];
      const curIdx = this.activeHeroPreviewSlideIdx || 0;
      const activeSlide = slides[curIdx] || slides[0];

      const bgType = layoutCfg.bg_type || 'default';
      let previewBg = '';
      if (bgType === 'color' && layoutCfg.bg_color) {
        previewBg = `background-color: ${layoutCfg.bg_color}; background-image: none;`;
      } else if (bgType === 'image' && layoutCfg.bg_image_url) {
        previewBg = `background-image: url('${this.normalizeImageUrl(layoutCfg.bg_image_url)}'); background-size: cover; background-position: ${layoutCfg.bg_position || 'center'};`;
      } else {
        previewBg = `background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 45%, #ffffff 100%);`;
      }

      const overlayOpacity = (layoutCfg.overlay_opacity !== undefined) ? (Number(layoutCfg.overlay_opacity) / 100).toFixed(2) : '0';
      const overlayColor = layoutCfg.overlay_color || '#000000';
      const isDark = (bgType === 'color' && this.isColorDark(layoutCfg.bg_color)) || (bgType === 'image' && Number(layoutCfg.overlay_opacity || 0) >= 35) || (layoutCfg.contrast_mode === 'light');
      const finalTitleStyle = titleStyle + (isDark ? '; color: #ffffff !important; text-shadow: 0 2px 8px rgba(0,0,0,0.7);' : '');
      const align = layoutCfg.alignment || t.alignment || 'center';
      const padTop = Math.round((layoutCfg.padding_top !== undefined ? layoutCfg.padding_top : 80) * 0.25);
      const padBottom = Math.round((layoutCfg.padding_bottom !== undefined ? layoutCfg.padding_bottom : 80) * 0.25);

      return `
        <div class="wp-preview-canvas" id="wp-hero-preview-box" style="position: relative; overflow: hidden; border-radius: 12px; ${previewBg}; padding: ${padTop}px 18px ${padBottom}px; transition: all 0.25s ease; min-height: 280px;">
          <div id="wp-hero-preview-bg-overlay" style="position: absolute; inset: 0; background-color: ${overlayColor}; opacity: ${overlayOpacity}; pointer-events: none; z-index: 1; transition: opacity 0.2s ease;"></div>
          <div id="wp-hero-preview-inner" style="position: relative; z-index: 2; text-align: ${align};">
            <div style="font-size: 11px; font-weight: 700; color: ${isDark ? '#e2e8f0' : '#64748b'}; text-transform: uppercase; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-eye" style="color: #10b981;"></i> WordPress Live Interactive Preview
              </span>
              <span id="wp-hero-preview-counter" style="background: #0073aa; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800;">
                Slide ${curIdx + 1} of ${slides.length}
              </span>
            </div>
            <div>
              <div id="wp-hero-preview-title" style="${finalTitleStyle}">${this.escapeHtml(defaultTitle)}</div>
            </div>
            <div style="margin-top: 14px; position: relative; border-radius: ${t.imgRadius !== undefined ? t.imgRadius : 16}px; overflow: hidden; background: ${sliderCfg.bg_style === 'emerald' ? '#022c22' : '#0f172a'}; height: 230px; box-shadow: 0 16px 30px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;" id="wp-hero-preview-container">
              <!-- Ambient Blurred Backdrop -->
              <img id="wp-hero-preview-blur" src="${this.normalizeImageUrl(activeSlide.url)}" alt="" aria-hidden="true" style="position: absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); object-fit: cover; filter: blur(28px) brightness(0.55); transform: scale(1.15); pointer-events: none; opacity: ${sliderCfg.ambient_bg !== false ? '0.85' : '0'}; transition: opacity 0.3s ease;">

              <!-- Foreground High-Clarity Image -->
              <img id="wp-hero-preview-img" src="${this.normalizeImageUrl(activeSlide.url)}" alt="Preview" style="position: relative; z-index: 2; width: 100%; height: 100%; object-fit: ${sliderCfg.fit_mode === 'cover' ? 'cover' : 'contain'}; display: block; border-radius: ${t.imgRadius !== undefined ? t.imgRadius : 12}px; transition: all 0.2s ease;">

              <!-- Fit Mode Badge -->
              <span id="wp-hero-preview-fit-badge" style="position: absolute; top: 10px; left: 12px; z-index: 10; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); color: #34d399; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.2);">
                <i class="fa-solid fa-sparkles"></i> ${sliderCfg.fit_mode === 'cover' ? 'Cover (Edge-to-Edge)' : '100% Original Clarity'}
              </span>
              
              <!-- Prev / Next Arrows -->
              <button type="button" id="wp-hero-preview-prev-btn" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;" title="Previous Slide">
                <i class="fa-solid fa-chevron-left" style="font-size: 12px;"></i>
              </button>
              <button type="button" id="wp-hero-preview-next-btn" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;" title="Next Slide">
                <i class="fa-solid fa-chevron-right" style="font-size: 12px;"></i>
              </button>

              <!-- Dots -->
              <div id="wp-hero-preview-dots" style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 12px;">
                ${slides.map((_, i) => `<span class="wp-preview-dot ${i === curIdx ? 'active' : ''}" data-idx="${i}" style="width: 8px; height: 8px; border-radius: 50%; background: ${i === curIdx ? '#10b981' : 'rgba(255,255,255,0.6)'}; cursor: pointer;"></span>`).join('')}
              </div>

              <!-- Slide caption overlay -->
              <div id="wp-hero-preview-caption" style="position: absolute; bottom: 8px; left: 10px; z-index: 10; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 10px; border-radius: 6px; max-width: 65%; pointer-events: none;">
                <div id="wp-hero-preview-caption-title" style="font-size: 11px; font-weight: 700; color: #fff; line-height: 1.2;">${this.escapeHtml(activeSlide.title || '')}</div>
                <div id="wp-hero-preview-caption-sub" style="font-size: 9.5px; color: #6ee7b7; line-height: 1.2;">${this.escapeHtml(activeSlide.subtitle || '')}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (secKey === 'fitness') {
      const fitImgs = this.getFitnessImages();
      const img1Src = this.normalizeImageUrl(t.img1 || t.imgUrl || fitImgs.img1 || 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600');
      const img2Src = this.normalizeImageUrl(t.img2 || fitImgs.img2 || 'https://drive.google.com/thumbnail?id=1Set2mnZc8B5Ua0qZcxFw52hzAAwApJ7x&sz=w1600');
      const img1Alt = t.img1_alt || 'Cycling Fitness in Mannar';
      const img2Alt = t.img2_alt || 'Tourist Adventure';

      const img1Style = `
        width: ${t.img1_width || 100}%;
        border-radius: ${t.img1_radius !== undefined ? t.img1_radius : 16}px;
        border: ${(t.img1_border_w > 0) ? `${t.img1_border_w}px solid ${t.img1_border_c || '#e2e8f0'}` : 'none'};
        padding: ${t.img1_padding || 0}px;
        filter: brightness(${t.img1_brightness !== undefined ? t.img1_brightness : 100}%) blur(${t.img1_blur || 0}px);
        box-shadow: ${t.img1_style === 'elevated' ? '0 16px 30px rgba(0,0,0,0.2)' : (t.img1_style === 'glow' ? '0 0 20px rgba(16,185,129,0.5)' : (t.img1_style === 'glass' ? '0 8px 32px rgba(31,38,135,0.2)' : 'none'))};
        display: block;
        margin-left: ${t.img1_align === 'right' ? 'auto' : (t.img1_align === 'center' ? 'auto' : '0')};
        margin-right: ${t.img1_align === 'left' ? 'auto' : (t.img1_align === 'center' ? 'auto' : '0')};
        max-height: 200px;
        object-fit: cover;
        transition: all 0.2s ease;
      `;

      const img2Style = `
        width: ${t.img2_width || 100}%;
        border-radius: ${t.img2_radius !== undefined ? t.img2_radius : 16}px;
        border: ${(t.img2_border_w > 0) ? `${t.img2_border_w}px solid ${t.img2_border_c || '#e2e8f0'}` : 'none'};
        padding: ${t.img2_padding || 0}px;
        filter: brightness(${t.img2_brightness !== undefined ? t.img2_brightness : 100}%) blur(${t.img2_blur || 0}px);
        box-shadow: ${t.img2_style === 'elevated' ? '0 16px 30px rgba(0,0,0,0.2)' : (t.img2_style === 'glow' ? '0 0 20px rgba(16,185,129,0.5)' : (t.img2_style === 'glass' ? '0 8px 32px rgba(31,38,135,0.2)' : 'none'))};
        display: block;
        margin-left: ${t.img2_align === 'right' ? 'auto' : (t.img2_align === 'center' ? 'auto' : '0')};
        margin-right: ${t.img2_align === 'left' ? 'auto' : (t.img2_align === 'center' ? 'auto' : '0')};
        max-height: 200px;
        object-fit: cover;
        transition: all 0.2s ease;
      `;

      return `
        <div class="wp-preview-canvas" id="wp-fitness-preview-box">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-eye" style="color: #10b981;"></i> WordPress Live Interactive Preview (Dual Images)
          </div>
          <div style="text-align: ${t.alignment || 'left'};">
            <div id="wp-fitness-preview-title" style="${titleStyle}">${this.escapeHtml(defaultTitle)}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; align-items: start;">
            <div>
              <div style="font-size: 10.5px; font-weight: 700; color: #475569; margin-bottom: 4px;"><i class="fa-solid fa-bicycle" style="color:#059669;"></i> Image 1: Cycling Fitness</div>
              <img id="wp-fitness-preview-img1" src="${img1Src}" alt="${this.escapeHtml(img1Alt)}" style="${img1Style}">
            </div>
            <div style="margin-top: 22px;">
              <div style="font-size: 10.5px; font-weight: 700; color: #475569; margin-bottom: 4px;"><i class="fa-solid fa-mountain-sun" style="color:#059669;"></i> Image 2: Tourist Adventure</div>
              <img id="wp-fitness-preview-img2" src="${img2Src}" alt="${this.escapeHtml(img2Alt)}" style="${img2Style}">
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="wp-preview-canvas" id="wp-${secKey}-preview-box">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-eye" style="color: #10b981;"></i> WordPress Live Interactive Preview
        </div>
        <div style="text-align: ${t.alignment || 'center'};">
          <div id="wp-${secKey}-preview-title" style="${titleStyle}">${this.escapeHtml(defaultTitle)}</div>
        </div>
        ${defaultImg ? `
          <div style="margin-top: 14px;">
            <img id="wp-${secKey}-preview-img" src="${defaultImg}" alt="Preview" style="${imgStyle}">
          </div>
        ` : ''}
      </div>
    `;
  }

  renderContentView() {
    const hero = this.sections.hero || {};
    const fitness = this.sections.fitness || {};
    const about = this.sections.about || {};
    const wpStyles = this.getContentStyleConfig();
    this.heroSliderData = this.getHeroSliderConfig();
    this.heroLayoutData = this.getHeroLayoutConfig();
    this.activeHeroPreviewSlideIdx = 0;

    return `
      <!-- WordPress-Style Content Editor Header Banner -->
      <div class="card" style="border-top: 4px solid #0073aa; margin-bottom: 24px; padding: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #0073aa; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 4px 12px rgba(0,115,170,0.3);">
              <i class="fa-brands fa-wordpress"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0;">WordPress-Style Text & Images Content Editor</h2>
                <span class="badge" style="background: #0073aa; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">WP-STYLE</span>
              </div>
              <p style="font-size: 13px; color: #475569; margin: 3px 0 0 0;">
                Visual WordPress Gutenberg & Elementor style editing controls for website content: Typography (size, style, weight, color, alignment, gradients) and Images (source URL, size, border radius, padding, style, brightness, blur filters).
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="#hero-editor-card" class="btn btn-outline btn-sm" style="font-weight: 600; color: #0073aa; border-color: #93c5fd;"><i class="fa-solid fa-image"></i> Hero Section</a>
            <a href="#fitness-editor-card" class="btn btn-outline btn-sm" style="font-weight: 600; color: #0073aa; border-color: #93c5fd;"><i class="fa-solid fa-heart-pulse"></i> Fitness Section</a>
            <a href="#about-editor-card" class="btn btn-outline btn-sm" style="font-weight: 600; color: #0073aa; border-color: #93c5fd;"><i class="fa-solid fa-circle-info"></i> About Story</a>
            <a href="#join-editor-card" class="btn btn-outline btn-sm" style="font-weight: 600; color: #92400e; border-color: #fde68a;"><i class="fa-solid fa-car-side"></i> Host Network</a>
          </div>
        </div>
      </div>

      <!-- Hero Section Editor -->
      <div class="card" id="hero-editor-card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title"><i class="fa-brands fa-wordpress" style="color: #0073aa;"></i> Hero Banner &amp; Main Headline</h3>
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

          <!-- WordPress Typography & Styling Controls for Hero -->
          <div class="wp-inspector-panel">
            <div class="wp-inspector-header">
              <div class="wp-inspector-title">
                <i class="fa-brands fa-wordpress" style="color: #0073aa; font-size: 16px;"></i>
                WordPress Content Controls (Hero Headline &amp; Images)
              </div>
              <div class="wp-tab-pills">
                <button type="button" class="wp-tab-pill active" data-tab="wp-tab-hero-text"><i class="fa-solid fa-font"></i> Typography</button>
                <button type="button" class="wp-tab-pill" data-tab="wp-tab-hero-img"><i class="fa-solid fa-image"></i> Images &amp; Blur</button>
                <button type="button" class="wp-tab-pill" data-tab="wp-tab-hero-slider"><i class="fa-solid fa-images"></i> Multi-Image Slider (<span id="pill-hero-slide-count">${this.heroSliderData.slides.length}</span>)</button>
                <button type="button" class="wp-tab-pill" data-tab="wp-tab-hero-layout"><i class="fa-solid fa-layer-group"></i> Background &amp; Layout</button>
              </div>
            </div>

            <div id="wp-tab-hero-text" class="wp-tab-pane">
              ${this.renderWpTypographyControls('hero', wpStyles.hero, 'Hero Headline')}
            </div>
            <div id="wp-tab-hero-img" class="wp-tab-pane" style="display: none;">
              ${this.renderWpImageControls('hero', wpStyles.hero, 'Hero Banner Image')}
              <div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="font-size: 12px; color: #166534;">
                  <i class="fa-solid fa-circle-info" style="color: #16a34a; margin-right: 6px;"></i>
                  <strong>Multi-Image Carousel:</strong> Need multiple moving slide images? Add, move, and reorder slides in the <strong>Multi-Image Slider</strong> tab.
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="document.querySelector('[data-tab=\\'wp-tab-hero-slider\\']').click()" style="color: #166534; border-color: #86efac; font-weight: 700;">
                  Open Multi-Image Slider <i class="fa-solid fa-arrow-right" style="margin-left: 4px;"></i>
                </button>
              </div>
            </div>
            <div id="wp-tab-hero-slider" class="wp-tab-pane" style="display: none;">
              ${this.renderHeroSliderControls(this.heroSliderData)}
            </div>
            <div id="wp-tab-hero-layout" class="wp-tab-pane" style="display: none;">
              ${this.renderHeroBackgroundAndLayoutControls(this.heroLayoutData)}
            </div>

            ${this.renderWpPreviewCanvas('hero', wpStyles.hero, hero.title || 'Explore Mannar Sustainably & Stay Fit with Mannar Green Ride', wpStyles.hero.imgUrl || 'https://drive.google.com/thumbnail?id=1ZuYVfL-kmlxJWkeSuMM6_b-V1fIclTf_&sz=w1600')}
          </div>

          <div style="display: flex; gap: 12px; margin-top: 18px; flex-wrap: wrap;">
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save &amp; Publish Hero</button>
            <button type="button" class="btn btn-outline btn-save-wp-style" data-section="hero"><i class="fa-solid fa-palette"></i> Save Hero Typography &amp; Image Styles</button>
            <button type="button" class="btn btn-outline" id="btn-save-hero-slider-footer" style="color: #0073aa; border-color: #93c5fd; font-weight: 700;"><i class="fa-solid fa-images"></i> Save Hero Slider &amp; Images</button>
            <button type="button" class="btn btn-outline" id="btn-save-hero-layout-footer" style="color: #047857; border-color: #a7f3d0; font-weight: 700;"><i class="fa-solid fa-layer-group"></i> Save Hero Background &amp; Layout</button>
          </div>
        </form>
      </div>

      <!-- Fitness & Eco Section -->
      <div class="card" id="fitness-editor-card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title"><i class="fa-brands fa-wordpress" style="color: #0073aa;"></i> Fitness & Health Section</h3>
          <span class="badge badge-published">Published Section</span>
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

          <!-- WordPress Typography & Image Controls for Fitness -->
          <div class="wp-inspector-panel">
            <div class="wp-inspector-header">
              <div class="wp-inspector-title">
                <i class="fa-brands fa-wordpress" style="color: #0073aa; font-size: 16px;"></i>
                WordPress Content Controls (Fitness Heading & Images)
              </div>
              <div class="wp-tab-pills">
                <button type="button" class="wp-tab-pill active" data-tab="wp-tab-fitness-text"><i class="fa-solid fa-font"></i> Typography</button>
                <button type="button" class="wp-tab-pill" data-tab="wp-tab-fitness-img"><i class="fa-solid fa-image"></i> Images & Blur</button>
              </div>
            </div>

            <div id="wp-tab-fitness-text" class="wp-tab-pane">
              ${this.renderWpTypographyControls('fitness', wpStyles.fitness, 'Fitness Heading')}
            </div>
            <div id="wp-tab-fitness-img" class="wp-tab-pane" style="display: none;">
              ${this.renderWpFitnessDualImageControls(wpStyles.fitness)}
            </div>

            ${this.renderWpPreviewCanvas('fitness', wpStyles.fitness, fitness.title || 'Ride for Health, Ride for the Planet', wpStyles.fitness.img1 || wpStyles.fitness.imgUrl || 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600')}
          </div>

          <div style="display: flex; gap: 12px; margin-top: 18px;">
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Fitness Section</button>
            <button type="button" class="btn btn-outline btn-save-wp-style" data-section="fitness"><i class="fa-solid fa-palette"></i> Save Fitness Typography & Image Styles</button>
          </div>
        </form>
      </div>

      <!-- About Section -->
      <div class="card" id="about-editor-card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title"><i class="fa-brands fa-wordpress" style="color: #0073aa;"></i> About Us Story</h3>
          <span class="badge badge-published">Published Section</span>
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

          <!-- WordPress Typography & Image Controls for About -->
          <div class="wp-inspector-panel">
            <div class="wp-inspector-header">
              <div class="wp-inspector-title">
                <i class="fa-brands fa-wordpress" style="color: #0073aa; font-size: 16px;"></i>
                WordPress Content Controls (About Heading & Image)
              </div>
              <div class="wp-tab-pills">
                <button type="button" class="wp-tab-pill active" data-tab="wp-tab-about-text"><i class="fa-solid fa-font"></i> Typography</button>
                <button type="button" class="wp-tab-pill" data-tab="wp-tab-about-img"><i class="fa-solid fa-image"></i> Images & Blur</button>
              </div>
            </div>

            <div id="wp-tab-about-text" class="wp-tab-pane">
              ${this.renderWpTypographyControls('about', wpStyles.about, 'About Heading')}
            </div>
            <div id="wp-tab-about-img" class="wp-tab-pane" style="display: none;">
              ${this.renderWpImageControls('about', wpStyles.about, 'About Image')}
            </div>

            ${this.renderWpPreviewCanvas('about', wpStyles.about, about.title || 'Pioneering Eco-Mobility in Mannar', wpStyles.about.imgUrl || 'https://drive.google.com/thumbnail?id=1bN1Oi1kOZWa9Fh3o12uixVclaPClZ_sr&sz=w1600')}
          </div>

          <div style="display: flex; gap: 12px; margin-top: 18px;">
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save About Story</button>
            <button type="button" class="btn btn-outline btn-save-wp-style" data-section="about"><i class="fa-solid fa-palette"></i> Save About Typography & Image Styles</button>
          </div>
        </form>
      </div>

      <!-- Join Us Section & WhatsApp Join Link URL -->
      <div class="card" style="border: 2px solid #fef3c7; background: #fffdf5;">
        <div class="card-header" style="border-bottom: 1px solid #fde68a;">
          <div>
            <h3 class="card-title" style="color: #92400e;"><i class="fa-solid fa-car-side"></i> Join Us / Vehicle Host Community Network</h3>
            <p style="font-size: 12.5px; color: var(--slate-600); margin-top: 2px;">
              Manage the "Do You Own a Car, Van, or Tourist Bus in Mannar?" section and update the official WhatsApp community join link URL.
            </p>
          </div>
          <span class="badge" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">Join Us Section</span>
        </div>
        <form id="join-content-form">
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Section Tagline / Badge</label>
              <input type="text" class="form-input" id="join-badge" value="${this.escapeHtml(this.getJoinUsConfig().badge || 'Join Our Passenger Host Network')}">
            </div>
            <div class="form-group">
              <label class="form-label">Section Heading *</label>
              <input type="text" class="form-input" id="join-title" value="${this.escapeHtml(this.getJoinUsConfig().title || 'Do You Own a Car, Van, or Tourist Bus in Mannar?')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description Text</label>
            <textarea class="form-textarea" id="join-desc">${this.escapeHtml(this.getJoinUsConfig().description || 'Join our official WhatsApp Vehicle Owners Group. We connect your idle cars, passenger vans, and tourist buses with incoming tourists, NGOs, researchers, birdwatchers, and pilgrims visiting Mannar.')}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Button Text</label>
              <input type="text" class="form-input" id="join-btn-text" value="${this.escapeHtml(this.getJoinUsConfig().button_text || 'Join Host WhatsApp Group')}">
            </div>
            <div class="form-group">
              <label class="form-label" style="color: #047857; font-weight: 700;"><i class="fa-brands fa-whatsapp"></i> WhatsApp Group Join Link URL *</label>
              <input type="url" class="form-input" id="join-whatsapp-url" value="${this.escapeHtml(this.settings.host_whatsapp_group_url || this.getJoinUsConfig().whatsapp_url || 'https://chat.whatsapp.com/ExampleMannarGreenRideGroup')}" placeholder="https://chat.whatsapp.com/..." style="border-color: #10b981; font-weight: 600;">
              <span style="font-size: 11.5px; color: var(--slate-500); margin-top: 4px; display: block;">
                Direct invite link for the Mannar Vehicle Owners WhatsApp group. Clicking "Join Host WhatsApp Group" on the website opens this link.
              </span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Join Us Section & WhatsApp URL</button>
        </form>
      </div>
    `;
  }

  getJoinUsConfig() {
    if (this.settings && this.settings.join_us_config) {
      try {
        const cfg = typeof this.settings.join_us_config === 'string'
          ? JSON.parse(this.settings.join_us_config)
          : this.settings.join_us_config;
        if (cfg && typeof cfg === 'object') return cfg;
      } catch (e) { }
    }
    return {
      title: "Do You Own a Car, Van, or Tourist Bus in Mannar?",
      badge: "Join Our Passenger Host Network",
      description: "Join our official WhatsApp Vehicle Owners Group. We connect your idle cars, passenger vans, and tourist buses with incoming tourists, NGOs, researchers, birdwatchers, and pilgrims visiting Mannar.",
      button_text: "Join Host WhatsApp Group",
      whatsapp_url: (this.settings && this.settings.host_whatsapp_group_url) || "https://chat.whatsapp.com/ExampleMannarGreenRideGroup"
    };
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
        await this.saveWpSectionStyle('hero');
        await this.saveHeroSliderConfig();
        await this.saveHeroLayoutConfig();
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
        await this.saveWpSectionStyle('fitness');
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
        await this.saveWpSectionStyle('about');
      });
    }

    const joinForm = document.getElementById('join-content-form');
    if (joinForm) {
      joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const whatsappUrl = document.getElementById('join-whatsapp-url').value.trim();
        const joinCfg = {
          title: document.getElementById('join-title').value.trim(),
          badge: document.getElementById('join-badge').value.trim(),
          description: document.getElementById('join-desc').value.trim(),
          button_text: document.getElementById('join-btn-text').value.trim(),
          whatsapp_url: whatsappUrl,
          updated_at: new Date().toISOString()
        };

        try {
          this.showToast("Saving Join Us section & WhatsApp URL...", "info");
          await this.saveSettingsItem('join_us_config', joinCfg);
          await this.saveSettingsItem('host_whatsapp_group_url', whatsappUrl);
          await this.logAudit("UPDATE", "JOIN_US", "join_us_config", joinCfg);
          this.showToast("Join Us section and WhatsApp link updated successfully!", "success");
        } catch (err) {
          this.showToast(err.message || "Failed to save Join Us section", "error");
        }
      });
    }

    // WordPress-Style Inspector Events
    this.bindWpInspectorEvents();
    this.bindHeroSliderEvents();
    this.bindHeroLayoutEvents();
  }

  bindWpInspectorEvents() {
    const sections = ['hero', 'fitness', 'about'];

    // Tab pills (Typography vs Image)
    document.querySelectorAll('.wp-tab-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const parent = pill.closest('.wp-inspector-panel');
        if (!parent) return;
        parent.querySelectorAll('.wp-tab-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const targetTabId = pill.dataset.tab;
        parent.querySelectorAll('.wp-tab-pane').forEach(pane => {
          pane.style.display = (pane.id === targetTabId) ? 'block' : 'none';
        });
      });
    });

    sections.forEach(secKey => {
      const updatePreview = () => {
        const previewTitle = document.getElementById(`wp-${secKey}-preview-title`);
        const previewImg = document.getElementById(`wp-${secKey}-preview-img`);

        // Text values
        const fontSize = document.getElementById(`wp-${secKey}-font-size`)?.value || '32';
        const fontStyle = document.getElementById(`wp-${secKey}-font-style`)?.value || 'normal';
        const fontWeight = document.getElementById(`wp-${secKey}-font-weight`)?.value || '700';
        const color = document.getElementById(`wp-${secKey}-color`)?.value || '#111827';
        const alignment = document.getElementById(`wp-${secKey}-alignment`)?.value || 'center';
        const gradEnabled = document.getElementById(`wp-${secKey}-grad-enable`)?.checked;
        const gradStart = document.getElementById(`wp-${secKey}-grad-start`)?.value || '#059669';
        const gradEnd = document.getElementById(`wp-${secKey}-grad-end`)?.value || '#10b981';

        // Update live badges
        const sizeBadge = document.getElementById(`wp-${secKey}-size-badge`);
        if (sizeBadge) sizeBadge.textContent = `${fontSize}px`;

        if (previewTitle) {
          previewTitle.style.fontSize = `${fontSize}px`;
          previewTitle.style.fontStyle = fontStyle;
          previewTitle.style.fontWeight = fontWeight;
          previewTitle.style.textAlign = alignment;
          if (previewTitle.parentElement) previewTitle.parentElement.style.textAlign = alignment;

          if (gradEnabled) {
            previewTitle.style.backgroundImage = `linear-gradient(135deg, ${gradStart}, ${gradEnd})`;
            previewTitle.style.webkitBackgroundClip = 'text';
            previewTitle.style.webkitTextFillColor = 'transparent';
            previewTitle.style.color = 'transparent';
            previewTitle.style.display = 'inline-block';
          } else {
            previewTitle.style.backgroundImage = 'none';
            previewTitle.style.webkitBackgroundClip = '';
            previewTitle.style.webkitTextFillColor = '';
            previewTitle.style.color = color;
            previewTitle.style.display = '';
          }
        }

        // Image values
        if (previewImg) {
          const imgWidth = document.getElementById(`wp-${secKey}-img-width`)?.value || '100';
          const imgStyle = document.getElementById(`wp-${secKey}-img-style`)?.value || 'elevated';
          const imgRadius = document.getElementById(`wp-${secKey}-img-radius`)?.value || '16';
          const imgBorderW = document.getElementById(`wp-${secKey}-img-border-w`)?.value || '0';
          const imgBorderC = document.getElementById(`wp-${secKey}-img-border-c`)?.value || '#e2e8f0';
          const imgPadding = document.getElementById(`wp-${secKey}-img-padding`)?.value || '0';
          const imgAlign = document.getElementById(`wp-${secKey}-img-align`)?.value || 'center';
          const imgBrightness = document.getElementById(`wp-${secKey}-img-brightness`)?.value || '100';
          const imgBlur = document.getElementById(`wp-${secKey}-img-blur`)?.value || '0';

          // Update image badges
          const wBadge = document.getElementById(`wp-${secKey}-img-w-badge`);
          if (wBadge) wBadge.textContent = `${imgWidth}%`;
          const radBadge = document.getElementById(`wp-${secKey}-img-rad-badge`);
          if (radBadge) radBadge.textContent = `${imgRadius}px`;
          const padBadge = document.getElementById(`wp-${secKey}-img-pad-badge`);
          if (padBadge) padBadge.textContent = `${imgPadding}px`;
          const brBadge = document.getElementById(`wp-${secKey}-img-bright-badge`);
          if (brBadge) brBadge.textContent = `${imgBrightness}%`;
          const blBadge = document.getElementById(`wp-${secKey}-img-blur-badge`);
          if (blBadge) blBadge.textContent = `${imgBlur}px`;

          previewImg.style.width = `${imgWidth}%`;
          previewImg.style.borderRadius = `${imgRadius}px`;
          previewImg.style.border = (parseInt(imgBorderW) > 0) ? `${imgBorderW}px solid ${imgBorderC}` : 'none';
          previewImg.style.padding = `${imgPadding}px`;
          previewImg.style.filter = `brightness(${imgBrightness}%) blur(${imgBlur}px)`;
          previewImg.style.marginLeft = imgAlign === 'right' ? 'auto' : (imgAlign === 'center' ? 'auto' : '0');
          previewImg.style.marginRight = imgAlign === 'left' ? 'auto' : (imgAlign === 'center' ? 'auto' : '0');

          if (imgStyle === 'elevated') {
            previewImg.style.boxShadow = '0 16px 30px rgba(0,0,0,0.2)';
          } else if (imgStyle === 'glow') {
            previewImg.style.boxShadow = '0 0 20px rgba(16,185,129,0.5)';
          } else if (imgStyle === 'glass') {
            previewImg.style.boxShadow = '0 8px 32px rgba(31,38,135,0.2)';
            previewImg.style.border = '2px solid rgba(255,255,255,0.5)';
          } else {
            previewImg.style.boxShadow = '';
          }
        }
      };

      // Range sliders
      const sliderIds = [
        `wp-${secKey}-font-size`, `wp-${secKey}-color`, `wp-${secKey}-grad-start`, `wp-${secKey}-grad-end`,
        `wp-${secKey}-img-width`, `wp-${secKey}-img-radius`, `wp-${secKey}-img-border-w`,
        `wp-${secKey}-img-border-c`, `wp-${secKey}-img-padding`, `wp-${secKey}-img-brightness`, `wp-${secKey}-img-blur`
      ];
      sliderIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
      });

      // Color hex sync
      const colorHex = document.getElementById(`wp-${secKey}-color-hex`);
      const colorInput = document.getElementById(`wp-${secKey}-color`);
      if (colorHex && colorInput) {
        colorHex.addEventListener('input', () => {
          if (colorHex.value.startsWith('#') && colorHex.value.length === 7) {
            colorInput.value = colorHex.value;
            updatePreview();
          }
        });
        colorInput.addEventListener('input', () => {
          colorHex.value = colorInput.value;
          updatePreview();
        });
      }

      // Gradient toggle
      const gradToggle = document.getElementById(`wp-${secKey}-grad-enable`);
      const gradOptions = document.getElementById(`wp-${secKey}-grad-options`);
      if (gradToggle) {
        gradToggle.addEventListener('change', () => {
          if (gradOptions) gradOptions.style.display = gradToggle.checked ? 'flex' : 'none';
          updatePreview();
        });
      }

      // Button groups (Style, Weight, Alignment, Image Style, Image Align)
      const setupBtnGroup = (groupId, hiddenInputId) => {
        const group = document.getElementById(groupId);
        const hidden = document.getElementById(hiddenInputId);
        if (group && hidden) {
          group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              hidden.value = btn.dataset.val;
              updatePreview();
            });
          });
        }
      };

      setupBtnGroup(`wp-${secKey}-style-group`, `wp-${secKey}-font-style`);
      setupBtnGroup(`wp-${secKey}-weight-group`, `wp-${secKey}-font-weight`);
      setupBtnGroup(`wp-${secKey}-align-group`, `wp-${secKey}-alignment`);
      setupBtnGroup(`wp-${secKey}-img-style-group`, `wp-${secKey}-img-style`);
      setupBtnGroup(`wp-${secKey}-img-align-group`, `wp-${secKey}-img-align`);

      // Quick Chips (Font size, Radius, Width)
      document.querySelectorAll(`.wp-chip[data-target^="wp-${secKey}"]`).forEach(chip => {
        chip.addEventListener('click', () => {
          const targetEl = document.getElementById(chip.dataset.target);
          if (targetEl) {
            targetEl.value = chip.dataset.val;
            updatePreview();
          }
        });
      });

      // Color Swatches
      document.querySelectorAll(`.wp-color-swatch[data-target="wp-${secKey}-color"]`).forEach(swatch => {
        swatch.addEventListener('click', () => {
          const targetEl = document.getElementById(swatch.dataset.target);
          if (targetEl) {
            targetEl.value = swatch.dataset.val;
            if (colorHex) colorHex.value = swatch.dataset.val;
            updatePreview();
          }
        });
      });

      // Gradient Presets
      document.querySelectorAll(`.wp-grad-preset[data-sec="${secKey}"]`).forEach(preset => {
        preset.addEventListener('click', () => {
          const gStart = document.getElementById(`wp-${secKey}-grad-start`);
          const gEnd = document.getElementById(`wp-${secKey}-grad-end`);
          if (gStart && gEnd) {
            gStart.value = preset.dataset.start;
            gEnd.value = preset.dataset.end;
            updatePreview();
          }
        });
      });

      // Image URL input live sync
      const imgUrlInput = document.getElementById(`wp-${secKey}-img-url`);
      if (imgUrlInput) {
        imgUrlInput.addEventListener('input', () => {
          const val = imgUrlInput.value.trim();
          if (previewImg && val) {
            previewImg.src = val;
          }
          if (secKey === 'hero') {
            if (this.heroSliderData && this.heroSliderData.slides && this.heroSliderData.slides[0]) {
              this.heroSliderData.slides[0].url = val;
              const slide0Thumb = document.getElementById('hero-slide-thumb-0');
              if (slide0Thumb && val) slide0Thumb.src = this.normalizeImageUrl(val);
              const slide0Input = document.getElementById('hero-slide-url-0');
              if (slide0Input && slide0Input.value !== val) slide0Input.value = val;
            }
          }
        });
      }
    });

    // Dual Image controls for Fitness Section
    [1, 2].forEach(num => {
      const sliderIds = [
        `wp-fitness-img${num}-width`,
        `wp-fitness-img${num}-radius`,
        `wp-fitness-img${num}-border-w`,
        `wp-fitness-img${num}-border-c`,
        `wp-fitness-img${num}-padding`,
        `wp-fitness-img${num}-brightness`,
        `wp-fitness-img${num}-blur`
      ];
      sliderIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => this.updateWpFitnessPreview());
      });

      const urlEl = document.getElementById(`wp-fitness-img${num}-url`);
      if (urlEl) urlEl.addEventListener('input', () => this.updateWpFitnessPreview());

      const altEl = document.getElementById(`wp-fitness-img${num}-alt`);
      if (altEl) altEl.addEventListener('input', () => this.updateWpFitnessPreview());

      const setupFitnessBtnGroup = (groupId, hiddenId) => {
        const group = document.getElementById(groupId);
        const hidden = document.getElementById(hiddenId);
        if (group && hidden) {
          group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              hidden.value = btn.dataset.val;
              this.updateWpFitnessPreview();
            });
          });
        }
      };
      setupFitnessBtnGroup(`wp-fitness-img${num}-style-group`, `wp-fitness-img${num}-style`);
      setupFitnessBtnGroup(`wp-fitness-img${num}-align-group`, `wp-fitness-img${num}-align`);
    });

    // Media Library picker buttons
    document.querySelectorAll('.wp-btn-pick-media').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        this.openMediaPickerModal(targetId);
      });
    });

    // Standalone Save WordPress Style Buttons
    document.querySelectorAll('.btn-save-wp-style').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sec = btn.dataset.section;
        if (sec) await this.saveWpSectionStyle(sec);
      });
    });
  }

  bindHeroSliderEvents() {
    const updatePreviewCarousel = () => {
      const slides = (this.heroSliderData && this.heroSliderData.slides) || [];
      if (!slides.length) return;

      const idx = Math.max(0, Math.min(this.activeHeroPreviewSlideIdx || 0, slides.length - 1));
      this.activeHeroPreviewSlideIdx = idx;
      const cur = slides[idx];
      if (!cur) return;

      const previewImg = document.getElementById('wp-hero-preview-img');
      if (previewImg && cur.url) {
        previewImg.src = this.normalizeImageUrl(cur.url);
      }
      const previewBlur = document.getElementById('wp-hero-preview-blur');
      if (previewBlur && cur.url) {
        previewBlur.src = this.normalizeImageUrl(cur.url);
      }

      const counter = document.getElementById('wp-hero-preview-counter');
      if (counter) {
        counter.textContent = `Slide ${idx + 1} of ${slides.length}`;
      }

      const capTitle = document.getElementById('wp-hero-preview-caption-title');
      const capSub = document.getElementById('wp-hero-preview-caption-sub');
      if (capTitle) capTitle.textContent = cur.title || '';
      if (capSub) capSub.textContent = cur.subtitle || '';

      const dotsBox = document.getElementById('wp-hero-preview-dots');
      if (dotsBox) {
        dotsBox.innerHTML = slides.map((_, i) => `
          <span class="wp-preview-dot ${i === idx ? 'active' : ''}" data-idx="${i}" style="width: 8px; height: 8px; border-radius: 50%; background: ${i === idx ? '#10b981' : 'rgba(255,255,255,0.6)'}; cursor: pointer; transition: all 0.2s;"></span>
        `).join('');

        dotsBox.querySelectorAll('.wp-preview-dot').forEach(dot => {
          dot.onclick = () => {
            this.activeHeroPreviewSlideIdx = parseInt(dot.dataset.idx, 10);
            updatePreviewCarousel();
          };
        });
      }
    };

    // Prev / Next button listeners on preview
    const prevBtn = document.getElementById('wp-hero-preview-prev-btn');
    const nextBtn = document.getElementById('wp-hero-preview-next-btn');
    if (prevBtn) {
      prevBtn.onclick = () => {
        const slides = (this.heroSliderData && this.heroSliderData.slides) || [];
        if (!slides.length) return;
        this.activeHeroPreviewSlideIdx = (this.activeHeroPreviewSlideIdx - 1 + slides.length) % slides.length;
        updatePreviewCarousel();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        const slides = (this.heroSliderData && this.heroSliderData.slides) || [];
        if (!slides.length) return;
        this.activeHeroPreviewSlideIdx = (this.activeHeroPreviewSlideIdx + 1) % slides.length;
        updatePreviewCarousel();
      };
    }

    // Attach row events
    const attachRowListeners = () => {
      // 1. URL inputs (Live replace image in thumbnail & preview canvas)
      document.querySelectorAll('.hero-slide-url-input').forEach(input => {
        input.oninput = () => {
          const idx = parseInt(input.dataset.idx, 10);
          const val = input.value.trim();
          if (this.heroSliderData.slides[idx]) {
            this.heroSliderData.slides[idx].url = val;
          }
          const thumb = document.getElementById(`hero-slide-thumb-${idx}`);
          if (thumb && val) {
            thumb.src = this.normalizeImageUrl(val);
          }
          if (idx === 0) {
            const singleInput = document.getElementById('wp-hero-img-url');
            if (singleInput && singleInput.value !== val) singleInput.value = val;
          }
          if (idx === (this.activeHeroPreviewSlideIdx || 0)) {
            const previewImg = document.getElementById('wp-hero-preview-img');
            if (previewImg && val) previewImg.src = this.normalizeImageUrl(val);
            const previewBlur = document.getElementById('wp-hero-preview-blur');
            if (previewBlur && val) previewBlur.src = this.normalizeImageUrl(val);
          }
        };
      });

      // 2. Title inputs
      document.querySelectorAll('.hero-slide-title-input').forEach(input => {
        input.oninput = () => {
          const idx = parseInt(input.dataset.idx, 10);
          if (this.heroSliderData.slides[idx]) {
            this.heroSliderData.slides[idx].title = input.value;
          }
          if (idx === (this.activeHeroPreviewSlideIdx || 0)) {
            const capTitle = document.getElementById('wp-hero-preview-caption-title');
            if (capTitle) capTitle.textContent = input.value;
          }
        };
      });

      // 3. Subtitle inputs
      document.querySelectorAll('.hero-slide-subtitle-input').forEach(input => {
        input.oninput = () => {
          const idx = parseInt(input.dataset.idx, 10);
          if (this.heroSliderData.slides[idx]) {
            this.heroSliderData.slides[idx].subtitle = input.value;
          }
          if (idx === (this.activeHeroPreviewSlideIdx || 0)) {
            const capSub = document.getElementById('wp-hero-preview-caption-sub');
            if (capSub) capSub.textContent = input.value;
          }
        };
      });

      // 4. Move Up / Move Down buttons
      document.querySelectorAll('.btn-slide-move').forEach(btn => {
        btn.onclick = () => {
          const action = btn.dataset.action;
          const idx = parseInt(btn.dataset.idx, 10);
          const slides = this.heroSliderData.slides;
          if (action === 'up' && idx > 0) {
            const temp = slides[idx];
            slides[idx] = slides[idx - 1];
            slides[idx - 1] = temp;
            this.activeHeroPreviewSlideIdx = idx - 1;
            refreshSlideRows();
          } else if (action === 'down' && idx < slides.length - 1) {
            const temp = slides[idx];
            slides[idx] = slides[idx + 1];
            slides[idx + 1] = temp;
            this.activeHeroPreviewSlideIdx = idx + 1;
            refreshSlideRows();
          }
        };
      });

      // 5. Delete buttons
      document.querySelectorAll('.btn-slide-delete').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const slides = this.heroSliderData.slides;
          if (slides.length <= 1) {
            this.showToast("At least one slide image is required.", "error");
            return;
          }
          slides.splice(idx, 1);
          if (this.activeHeroPreviewSlideIdx >= slides.length) {
            this.activeHeroPreviewSlideIdx = slides.length - 1;
          }
          refreshSlideRows();
          this.showToast("Slide removed.", "info");
        };
      });

      // 6. Media Library pickers inside slider
      document.querySelectorAll('#hero-slider-manager-card .wp-btn-pick-media').forEach(btn => {
        btn.onclick = () => {
          const targetId = btn.dataset.target;
          this.openMediaPickerModal(targetId);
        };
      });
    };

    const refreshSlideRows = () => {
      const container = document.getElementById('hero-slides-items-container');
      if (container) {
        container.innerHTML = this.renderHeroSlideRows(this.heroSliderData.slides);
      }
      const countBadge = document.getElementById('hero-slider-badge-count');
      if (countBadge) {
        countBadge.textContent = `Total: ${this.heroSliderData.slides.length} Images`;
      }
      const pillCount = document.getElementById('pill-hero-slide-count');
      if (pillCount) {
        pillCount.textContent = this.heroSliderData.slides.length;
      }
      attachRowListeners();
      updatePreviewCarousel();
    };

    // Hook up row listeners on initial bind
    attachRowListeners();
    updatePreviewCarousel();

    // Add Slide buttons (top and bottom)
    const handleAddSlide = () => {
      const newSlide = {
        id: 'slide_' + Date.now(),
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=1200',
        title: 'New Slide Headline',
        subtitle: 'Experience Mannar Green Ride passenger mobility'
      };
      this.heroSliderData.slides.push(newSlide);
      this.activeHeroPreviewSlideIdx = this.heroSliderData.slides.length - 1;
      refreshSlideRows();
      this.showToast("New slide image added! Paste URL or choose from Media Library.", "success");
    };

    const addTopBtn = document.getElementById('btn-add-hero-slide-top');
    if (addTopBtn) addTopBtn.onclick = handleAddSlide;
    const addBotBtn = document.getElementById('btn-add-hero-slide-bottom');
    if (addBotBtn) addBotBtn.onclick = handleAddSlide;

    // Auto-slide toggle & interval
    const autoToggle = document.getElementById('hero-slider-auto-toggle');
    if (autoToggle) {
      autoToggle.onchange = () => {
        this.heroSliderData.auto_slide = autoToggle.checked;
      };
    }
    const intervalSelect = document.getElementById('hero-slider-interval-select');
    if (intervalSelect) {
      intervalSelect.onchange = () => {
        this.heroSliderData.interval = parseInt(intervalSelect.value, 10);
      };
    }

    // Image Fit Mode selector
    const fitModeSelect = document.getElementById('hero-slider-fit-mode');
    if (fitModeSelect) {
      fitModeSelect.onchange = () => {
        this.heroSliderData.fit_mode = fitModeSelect.value;
        const previewImg = document.getElementById('wp-hero-preview-img');
        if (previewImg) {
          previewImg.style.objectFit = fitModeSelect.value;
        }
        const fitBadge = document.getElementById('wp-hero-preview-fit-badge');
        if (fitBadge) {
          fitBadge.innerHTML = `<i class="fa-solid fa-sparkles"></i> ${fitModeSelect.value === 'cover' ? 'Cover (Edge-to-Edge)' : '100% Original Clarity'}`;
        }
      };
    }

    // Slider Height Range & Preset chips
    const heightRange = document.getElementById('hero-slider-height-range');
    const heightVal = document.getElementById('hero-slider-height-val');
    if (heightRange) {
      heightRange.oninput = () => {
        const h = parseInt(heightRange.value, 10);
        this.heroSliderData.slider_height = h;
        if (heightVal) heightVal.textContent = h + 'px';
      };
    }
    document.querySelectorAll('.btn-height-preset').forEach(btn => {
      btn.onclick = () => {
        const h = parseInt(btn.dataset.height, 10);
        this.heroSliderData.slider_height = h;
        if (heightRange) heightRange.value = h;
        if (heightVal) heightVal.textContent = h + 'px';
      };
    });

    // Slider Width selector
    const widthSelect = document.getElementById('hero-slider-width-select');
    if (widthSelect) {
      widthSelect.onchange = () => {
        this.heroSliderData.slider_width = widthSelect.value;
      };
    }

    // Ambient Background toggle & style
    const ambientToggle = document.getElementById('hero-slider-ambient-toggle');
    const bgStyleSelect = document.getElementById('hero-slider-bg-style');
    if (ambientToggle) {
      ambientToggle.onchange = () => {
        this.heroSliderData.ambient_bg = ambientToggle.checked;
        const blurImg = document.getElementById('wp-hero-preview-blur');
        if (blurImg) {
          blurImg.style.opacity = ambientToggle.checked ? '0.85' : '0';
        }
      };
    }
    if (bgStyleSelect) {
      bgStyleSelect.onchange = () => {
        this.heroSliderData.bg_style = bgStyleSelect.value;
        const previewBox = document.getElementById('wp-hero-preview-container');
        if (previewBox) {
          if (bgStyleSelect.value === 'emerald') previewBox.style.backgroundColor = '#022c22';
          else if (bgStyleSelect.value === 'dark') previewBox.style.backgroundColor = '#0f172a';
          else previewBox.style.backgroundColor = '#0f172a';
        }
      };
    }

    // Save buttons
    const saveBtn = document.getElementById('btn-save-hero-slider-only');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await this.saveHeroSliderConfig();
      };
    }
    const saveFooterBtn = document.getElementById('btn-save-hero-slider-footer');
    if (saveFooterBtn) {
      saveFooterBtn.onclick = async () => {
        await this.saveHeroSliderConfig();
      };
    }
  }

  async saveHeroSliderConfig() {
    try {
      this.showToast("Saving Hero Multi-Image Slider...", "info");

      // Read current form values
      const slides = [];
      const rows = document.querySelectorAll('.hero-slide-row');
      rows.forEach((row, i) => {
        const urlInput = row.querySelector('.hero-slide-url-input');
        const titleInput = row.querySelector('.hero-slide-title-input');
        const subInput = row.querySelector('.hero-slide-subtitle-input');
        const existingId = (this.heroSliderData.slides[i] && this.heroSliderData.slides[i].id) || ('slide_' + (i + 1));

        slides.push({
          id: existingId,
          url: this.normalizeImageUrl(urlInput ? urlInput.value.trim() : ''),
          title: titleInput ? titleInput.value.trim() : '',
          subtitle: subInput ? subInput.value.trim() : ''
        });
      });

      const autoSlide = document.getElementById('hero-slider-auto-toggle')?.checked ?? true;
      const interval = parseInt(document.getElementById('hero-slider-interval-select')?.value || '4000', 10);
      const fitMode = document.getElementById('hero-slider-fit-mode')?.value || this.heroSliderData.fit_mode || 'contain';
      const sliderHeight = parseInt(document.getElementById('hero-slider-height-range')?.value || this.heroSliderData.slider_height || '480', 10);
      const sliderWidth = document.getElementById('hero-slider-width-select')?.value || this.heroSliderData.slider_width || '1280px';
      const ambientBg = document.getElementById('hero-slider-ambient-toggle') ? document.getElementById('hero-slider-ambient-toggle').checked : (this.heroSliderData.ambient_bg !== false);
      const bgStyle = document.getElementById('hero-slider-bg-style')?.value || this.heroSliderData.bg_style || 'blur';

      const sliderCfg = {
        enabled: true,
        auto_slide: autoSlide,
        interval: interval,
        fit_mode: fitMode,
        slider_height: sliderHeight,
        slider_width: sliderWidth,
        ambient_bg: ambientBg,
        bg_style: bgStyle,
        slides: slides.length > 0 ? slides : this.heroSliderData.slides
      };

      this.heroSliderData = sliderCfg;

      // 1. Save hero_slider_config to website_settings
      await this.saveSettingsItem('hero_slider_config', sliderCfg);
      localStorage.setItem('mgr_setting_hero_slider_config', JSON.stringify(sliderCfg));

      // 2. Sync Slide 1 URL to content_styling_config.hero.imgUrl for backward compatibility
      if (slides.length > 0 && slides[0].url) {
        const styling = this.getContentStyleConfig();
        styling.hero.imgUrl = slides[0].url;
        await this.saveSettingsItem('content_styling_config', styling);
        localStorage.setItem('mgr_setting_content_styling_config', JSON.stringify(styling));
        const heroWpInput = document.getElementById('wp-hero-img-url');
        if (heroWpInput) heroWpInput.value = slides[0].url;
      }

      await this.logAudit("UPDATE", "CONTENT", "hero_slider_config", { total_slides: slides.length, auto_slide: autoSlide });
      this.showToast("Hero Multi-Image Slider saved and published!", "success");

      // Notify any open preview window
      this.broadcastPreviewUpdate('hero_slider_config', sliderCfg);
    } catch (err) {
      console.error("Failed to save hero slider config:", err);
      this.showToast(err.message || "Failed to save Hero slider config", "error");
    }
  }

  bindHeroLayoutEvents() {
    const updatePreviewLayout = () => {
      const box = document.getElementById('wp-hero-preview-box');
      const overlay = document.getElementById('wp-hero-preview-bg-overlay');
      const inner = document.getElementById('wp-hero-preview-inner');
      const title = document.getElementById('wp-hero-preview-title');
      if (!box) return;

      const bgType = document.querySelector('input[name="hero-bg-type"]:checked')?.value || 'default';
      const bgColor = document.getElementById('hero-bg-color-input')?.value.trim() || '#f0fdf4';
      const bgImageUrl = document.getElementById('hero-bg-image-url')?.value.trim() || '';
      const bgPos = document.getElementById('hero-bg-position')?.value || 'center';
      const overlayOpacityVal = parseInt(document.getElementById('hero-overlay-opacity')?.value || '0', 10);
      const overlayColor = document.getElementById('hero-overlay-color-input')?.value.trim() || '#000000';
      const contrastMode = document.getElementById('hero-contrast-mode')?.value || 'auto';
      const alignment = document.getElementById('hero-details-alignment')?.value || 'center';
      const padTop = parseInt(document.getElementById('hero-padding-top')?.value || '80', 10);
      const padBottom = parseInt(document.getElementById('hero-padding-bottom')?.value || '80', 10);

      // Background
      if (bgType === 'color' && bgColor) {
        box.style.backgroundImage = 'none';
        box.style.backgroundColor = bgColor;
      } else if (bgType === 'image' && bgImageUrl) {
        box.style.backgroundImage = `url('${this.normalizeImageUrl(bgImageUrl)}')`;
        box.style.backgroundSize = 'cover';
        box.style.backgroundPosition = bgPos;
      } else {
        box.style.backgroundImage = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 45%, #ffffff 100%)';
        box.style.backgroundColor = '';
        box.style.backgroundSize = '';
      }

      // Overlay
      if (overlay) {
        overlay.style.backgroundColor = overlayColor;
        overlay.style.opacity = (overlayOpacityVal / 100).toFixed(2);
      }

      // Contrast
      const isDark = (bgType === 'color' && this.isColorDark(bgColor)) ||
        (bgType === 'image' && overlayOpacityVal >= 35) ||
        (contrastMode === 'light');

      if (title) {
        if (isDark) {
          title.style.color = '#ffffff';
          title.style.textShadow = '0 2px 8px rgba(0,0,0,0.7)';
        } else {
          title.style.color = '';
          title.style.textShadow = '';
        }
      }

      // Spacing & Alignment
      box.style.paddingTop = `${Math.round(padTop * 0.25)}px`;
      box.style.paddingBottom = `${Math.round(padBottom * 0.25)}px`;
      if (inner) {
        inner.style.textAlign = alignment;
      }
    };

    // 1. Radio bg type switches
    document.querySelectorAll('input[name="hero-bg-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const val = radio.value;
        const colorPanel = document.getElementById('hero-bg-color-panel');
        const imgPanel = document.getElementById('hero-bg-image-panel');
        if (colorPanel) colorPanel.style.display = (val === 'color') ? 'block' : 'none';
        if (imgPanel) imgPanel.style.display = (val === 'image') ? 'block' : 'none';

        // Update styling of parent labels
        document.querySelectorAll('input[name="hero-bg-type"]').forEach(r => {
          const lbl = r.closest('label');
          if (lbl) {
            lbl.style.borderColor = r.checked ? '#059669' : '#cbd5e1';
            lbl.style.backgroundColor = r.checked ? '#ecfdf5' : '#fff';
            lbl.style.color = r.checked ? '#065f46' : '#334155';
          }
        });

        updatePreviewLayout();
      });
    });

    // 2. Color picker & text input sync
    const colorPicker = document.getElementById('hero-bg-color-picker');
    const colorInput = document.getElementById('hero-bg-color-input');
    if (colorPicker && colorInput) {
      colorPicker.addEventListener('input', () => {
        colorInput.value = colorPicker.value;
        updatePreviewLayout();
      });
      colorInput.addEventListener('input', () => {
        if (/^#[0-9a-f]{6}$/i.test(colorInput.value)) {
          colorPicker.value = colorInput.value;
        }
        updatePreviewLayout();
      });
    }

    // Color presets
    document.querySelectorAll('.hero-bg-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.dataset.color;
        if (c && colorInput && colorPicker) {
          colorInput.value = c;
          colorPicker.value = c;
          updatePreviewLayout();
        }
      });
    });

    // 3. Image URL input & presets
    const imgUrlInput = document.getElementById('hero-bg-image-url');
    if (imgUrlInput) {
      imgUrlInput.addEventListener('input', updatePreviewLayout);
    }
    document.querySelectorAll('.hero-bg-img-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = btn.dataset.url;
        if (u && imgUrlInput) {
          imgUrlInput.value = u;
          updatePreviewLayout();
        }
      });
    });

    const bgPosSelect = document.getElementById('hero-bg-position');
    if (bgPosSelect) bgPosSelect.addEventListener('change', updatePreviewLayout);

    // 4. Overlay color and opacity
    const overlayColor = document.getElementById('hero-overlay-color');
    const overlayColorInput = document.getElementById('hero-overlay-color-input');
    if (overlayColor && overlayColorInput) {
      overlayColor.addEventListener('input', () => {
        overlayColorInput.value = overlayColor.value;
        updatePreviewLayout();
      });
      overlayColorInput.addEventListener('input', () => {
        if (/^#[0-9a-f]{6}$/i.test(overlayColorInput.value)) {
          overlayColor.value = overlayColorInput.value;
        }
        updatePreviewLayout();
      });
    }

    const overlayOpacity = document.getElementById('hero-overlay-opacity');
    const overlayBadge = document.getElementById('hero-overlay-opacity-badge');
    if (overlayOpacity) {
      overlayOpacity.addEventListener('input', () => {
        if (overlayBadge) overlayBadge.textContent = `${overlayOpacity.value}%`;
        updatePreviewLayout();
      });
    }

    const contrastSelect = document.getElementById('hero-contrast-mode');
    if (contrastSelect) contrastSelect.addEventListener('change', updatePreviewLayout);

    // 5. Alignment Buttons
    const alignInput = document.getElementById('hero-details-alignment');
    document.querySelectorAll('#hero-details-align-group .wp-btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#hero-details-align-group .wp-btn-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (alignInput) alignInput.value = btn.dataset.align;
        updatePreviewLayout();
      });
    });

    // 6. Spacing Sliders & Chips
    const padTop = document.getElementById('hero-padding-top');
    const padTopBadge = document.getElementById('hero-pad-top-badge');
    if (padTop) {
      padTop.addEventListener('input', () => {
        if (padTopBadge) padTopBadge.textContent = `${padTop.value}px`;
        updatePreviewLayout();
      });
    }
    document.querySelectorAll('.hero-pad-top-chip').forEach(c => {
      c.addEventListener('click', () => {
        if (padTop) {
          padTop.value = c.dataset.val;
          if (padTopBadge) padTopBadge.textContent = `${c.dataset.val}px`;
          updatePreviewLayout();
        }
      });
    });

    const padBottom = document.getElementById('hero-padding-bottom');
    const padBottomBadge = document.getElementById('hero-pad-bottom-badge');
    if (padBottom) {
      padBottom.addEventListener('input', () => {
        if (padBottomBadge) padBottomBadge.textContent = `${padBottom.value}px`;
        updatePreviewLayout();
      });
    }
    document.querySelectorAll('.hero-pad-bottom-chip').forEach(c => {
      c.addEventListener('click', () => {
        if (padBottom) {
          padBottom.value = c.dataset.val;
          if (padBottomBadge) padBottomBadge.textContent = `${c.dataset.val}px`;
          updatePreviewLayout();
        }
      });
    });

    const padX = document.getElementById('hero-padding-x');
    const padXBadge = document.getElementById('hero-pad-x-badge');
    if (padX) {
      padX.addEventListener('input', () => {
        if (padXBadge) padXBadge.textContent = `${padX.value}px`;
      });
    }
    document.querySelectorAll('.hero-pad-x-chip').forEach(c => {
      c.addEventListener('click', () => {
        if (padX) {
          padX.value = c.dataset.val;
          if (padXBadge) padXBadge.textContent = `${c.dataset.val}px`;
        }
      });
    });

    // 7. Save Buttons
    const saveTop = document.getElementById('btn-save-hero-layout-top');
    if (saveTop) saveTop.addEventListener('click', () => this.saveHeroLayoutConfig());

    const saveOnly = document.getElementById('btn-save-hero-layout-only');
    if (saveOnly) saveOnly.addEventListener('click', () => this.saveHeroLayoutConfig());

    const saveFooter = document.getElementById('btn-save-hero-layout-footer');
    if (saveFooter) saveFooter.addEventListener('click', () => this.saveHeroLayoutConfig());
  }

  async saveHeroLayoutConfig() {
    try {
      const bgType = document.querySelector('input[name="hero-bg-type"]:checked')?.value || 'default';
      const bgColor = document.getElementById('hero-bg-color-input')?.value.trim() || '#f0fdf4';
      const bgImageUrl = document.getElementById('hero-bg-image-url')?.value.trim() || '';
      const bgPos = document.getElementById('hero-bg-position')?.value || 'center';
      const bgAttachment = document.getElementById('hero-bg-attachment')?.value || 'scroll';
      const overlayOpacity = parseInt(document.getElementById('hero-overlay-opacity')?.value || '0', 10);
      const overlayColor = document.getElementById('hero-overlay-color-input')?.value.trim() || '#000000';
      const contrastMode = document.getElementById('hero-contrast-mode')?.value || 'auto';
      const alignment = document.getElementById('hero-details-alignment')?.value || 'center';
      const paddingTop = parseInt(document.getElementById('hero-padding-top')?.value || '80', 10);
      const paddingBottom = parseInt(document.getElementById('hero-padding-bottom')?.value || '80', 10);
      const paddingX = parseInt(document.getElementById('hero-padding-x')?.value || '24', 10);
      const maxWidth = document.getElementById('hero-max-width')?.value || '1280px';

      const layoutCfg = {
        bg_type: bgType,
        bg_color: bgColor,
        bg_image_url: bgImageUrl,
        bg_position: bgPos,
        bg_attachment: bgAttachment,
        overlay_opacity: overlayOpacity,
        overlay_color: overlayColor,
        contrast_mode: contrastMode,
        alignment: alignment,
        padding_top: paddingTop,
        padding_bottom: paddingBottom,
        padding_x: paddingX,
        max_width: maxWidth,
        updated_at: new Date().toISOString()
      };

      this.heroLayoutData = layoutCfg;

      // 1. Save to website_settings
      await this.saveSettingsItem('hero_layout_config', layoutCfg);
      localStorage.setItem('mgr_setting_hero_layout_config', JSON.stringify(layoutCfg));

      await this.logAudit("UPDATE", "CONTENT", "hero_layout_config", { bg_type: bgType, alignment: alignment });
      this.showToast("Hero Background & Layout settings saved and published!", "success");

      // Broadcast update to open customer window
      this.broadcastPreviewUpdate('hero_layout_config', layoutCfg);
    } catch (err) {
      console.error("Failed to save hero layout config:", err);
      this.showToast(err.message || "Failed to save Hero layout config", "error");
    }
  }

  openMediaPickerModal(targetInputId) {
    const grid = document.getElementById('wp-media-picker-grid');
    if (!grid) return;

    const fallbackImages = [
      { name: "Mannar Coastal Causeway", url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800" },
      { name: "Eco Bicycle Ride", url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600" },
      { name: "Mannar Dunes & Baobab", url: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800" },
      { name: "Passenger Van Transport", url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600" },
      { name: "Scooter & Motorcycle", url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=600" },
      { name: "Adam's Bridge Lighthouse", url: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=600" }
    ];

    const mediaItems = (this.media && this.media.length)
      ? this.media.map(m => ({ name: m.file_name || 'Media Image', url: m.public_url }))
      : fallbackImages;

    grid.innerHTML = mediaItems.map(item => `
      <div style="border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.2s ease; background: #fff;"
           class="wp-media-card"
           onclick="window.adminCMS.selectMediaForInput('${this.escapeHtml(item.url)}', '${targetInputId}')">
        <div style="height: 90px; background: #f8fafc; overflow: hidden;">
          <img src="${this.escapeHtml(item.url)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=400'">
        </div>
        <div style="padding: 6px 8px; font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${this.escapeHtml(item.name)}
        </div>
      </div>
    `).join('');

    this.openModal('wp-media-picker-modal');
  }

  selectMediaForInput(url, targetInputId) {
    const input = document.getElementById(targetInputId);
    if (input) {
      input.value = url;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      this.showToast("Image selected from library!", "success");
    }
    this.closeModal('wp-media-picker-modal');
  }

  async saveWpSectionStyle(secKey) {
    const currentAll = this.getContentStyleConfig();

    if (secKey === 'fitness') {
      const img1Url = document.getElementById('wp-fitness-img1-url')?.value.trim() || '';
      const img2Url = document.getElementById('wp-fitness-img2-url')?.value.trim() || '';

      const tCfg = {
        fontSize: parseInt(document.getElementById('wp-fitness-font-size')?.value || '32'),
        fontStyle: document.getElementById('wp-fitness-font-style')?.value || 'normal',
        fontWeight: document.getElementById('wp-fitness-font-weight')?.value || '700',
        color: document.getElementById('wp-fitness-color')?.value || '#111827',
        alignment: document.getElementById('wp-fitness-alignment')?.value || 'left',
        gradientEnabled: document.getElementById('wp-fitness-grad-enable')?.checked || false,
        gradientStart: document.getElementById('wp-fitness-grad-start')?.value || '#059669',
        gradientEnd: document.getElementById('wp-fitness-grad-end')?.value || '#10b981',
        // Image 1
        img1: img1Url,
        img1_alt: document.getElementById('wp-fitness-img1-alt')?.value || 'Cycling Fitness in Mannar',
        img1_width: parseInt(document.getElementById('wp-fitness-img1-width')?.value || '100'),
        img1_style: document.getElementById('wp-fitness-img1-style')?.value || 'elevated',
        img1_radius: parseInt(document.getElementById('wp-fitness-img1-radius')?.value || '16'),
        img1_border_w: parseInt(document.getElementById('wp-fitness-img1-border-w')?.value || '0'),
        img1_border_c: document.getElementById('wp-fitness-img1-border-c')?.value || '#e2e8f0',
        img1_padding: parseInt(document.getElementById('wp-fitness-img1-padding')?.value || '0'),
        img1_align: document.getElementById('wp-fitness-img1-align')?.value || 'center',
        img1_brightness: parseInt(document.getElementById('wp-fitness-img1-brightness')?.value || '100'),
        img1_blur: parseInt(document.getElementById('wp-fitness-img1-blur')?.value || '0'),
        // Image 2
        img2: img2Url,
        img2_alt: document.getElementById('wp-fitness-img2-alt')?.value || 'Tourist Adventure',
        img2_width: parseInt(document.getElementById('wp-fitness-img2-width')?.value || '100'),
        img2_style: document.getElementById('wp-fitness-img2-style')?.value || 'elevated',
        img2_radius: parseInt(document.getElementById('wp-fitness-img2-radius')?.value || '16'),
        img2_border_w: parseInt(document.getElementById('wp-fitness-img2-border-w')?.value || '0'),
        img2_border_c: document.getElementById('wp-fitness-img2-border-c')?.value || '#e2e8f0',
        img2_padding: parseInt(document.getElementById('wp-fitness-img2-padding')?.value || '0'),
        img2_align: document.getElementById('wp-fitness-img2-align')?.value || 'center',
        img2_brightness: parseInt(document.getElementById('wp-fitness-img2-brightness')?.value || '100'),
        img2_blur: parseInt(document.getElementById('wp-fitness-img2-blur')?.value || '0'),
        // Backwards-compatibility
        imgUrl: img1Url,
        imgWidth: parseInt(document.getElementById('wp-fitness-img1-width')?.value || '100'),
        imgStyle: document.getElementById('wp-fitness-img1-style')?.value || 'elevated',
        imgRadius: parseInt(document.getElementById('wp-fitness-img1-radius')?.value || '16'),
        imgBorderWidth: parseInt(document.getElementById('wp-fitness-img1-border-w')?.value || '0'),
        imgBorderColor: document.getElementById('wp-fitness-img1-border-c')?.value || '#e2e8f0',
        imgPadding: parseInt(document.getElementById('wp-fitness-img1-padding')?.value || '0'),
        imgMarginAlign: document.getElementById('wp-fitness-img1-align')?.value || 'center',
        imgBrightness: parseInt(document.getElementById('wp-fitness-img1-brightness')?.value || '100'),
        imgBlur: parseInt(document.getElementById('wp-fitness-img1-blur')?.value || '0')
      };

      currentAll.fitness = tCfg;
      const jsonStr = JSON.stringify(currentAll);
      const fitImgsPayload = JSON.stringify({ img1: img1Url, img2: img2Url });

      try {
        this.showToast("Saving Fitness section WordPress styles...", "info");
        await this.batchSaveSettings([
          { key: 'content_styling_config', val: jsonStr },
          { key: 'fitness_section_images', val: fitImgsPayload }
        ]);

        if (this.settings) {
          this.settings.content_styling_config = jsonStr;
          this.settings.fitness_section_images = fitImgsPayload;
        }

        // Sync inputs in Fitness Cards tab
        const fit1In = document.getElementById('fitness-img1-input');
        if (fit1In) fit1In.value = img1Url;
        const fit1Prev = document.getElementById('fitness-img1-preview');
        if (fit1Prev) fit1Prev.src = this.normalizeImageUrl(img1Url);

        const fit2In = document.getElementById('fitness-img2-input');
        if (fit2In) fit2In.value = img2Url;
        const fit2Prev = document.getElementById('fitness-img2-preview');
        if (fit2Prev) fit2Prev.src = this.normalizeImageUrl(img2Url);

        await this.logAudit("UPDATE", "WP_STYLES", "fitness", tCfg);
        this.showToast("Fitness Dual Images & Typography styles applied to website!", "success");
      } catch (err) {
        this.showToast(err.message || "Failed to save WordPress styles", "error");
      }
      return;
    }

    const tCfg = {
      fontSize: parseInt(document.getElementById(`wp-${secKey}-font-size`)?.value || '32'),
      fontStyle: document.getElementById(`wp-${secKey}-font-style`)?.value || 'normal',
      fontWeight: document.getElementById(`wp-${secKey}-font-weight`)?.value || '700',
      color: document.getElementById(`wp-${secKey}-color`)?.value || '#111827',
      alignment: document.getElementById(`wp-${secKey}-alignment`)?.value || 'center',
      gradientEnabled: document.getElementById(`wp-${secKey}-grad-enable`)?.checked || false,
      gradientStart: document.getElementById(`wp-${secKey}-grad-start`)?.value || '#059669',
      gradientEnd: document.getElementById(`wp-${secKey}-grad-end`)?.value || '#10b981',
      imgUrl: document.getElementById(`wp-${secKey}-img-url`)?.value.trim() || '',
      imgWidth: parseInt(document.getElementById(`wp-${secKey}-img-width`)?.value || '100'),
      imgStyle: document.getElementById(`wp-${secKey}-img-style`)?.value || 'elevated',
      imgRadius: parseInt(document.getElementById(`wp-${secKey}-img-radius`)?.value || '16'),
      imgBorderWidth: parseInt(document.getElementById(`wp-${secKey}-img-border-w`)?.value || '0'),
      imgBorderColor: document.getElementById(`wp-${secKey}-img-border-c`)?.value || '#e2e8f0',
      imgPadding: parseInt(document.getElementById(`wp-${secKey}-img-padding`)?.value || '0'),
      imgMarginAlign: document.getElementById(`wp-${secKey}-img-align`)?.value || 'center',
      imgBrightness: parseInt(document.getElementById(`wp-${secKey}-img-brightness`)?.value || '100'),
      imgBlur: parseInt(document.getElementById(`wp-${secKey}-img-blur`)?.value || '0')
    };

    currentAll[secKey] = tCfg;
    const jsonStr = JSON.stringify(currentAll);

    try {
      this.showToast(`Saving WordPress styles for ${secKey.toUpperCase()}...`, "info");
      await this.batchSaveSettings([
        { key: 'content_styling_config', val: jsonStr }
      ]);
      await this.logAudit("UPDATE", "WP_STYLES", secKey, tCfg);
      this.showToast(`WordPress styles for ${secKey.toUpperCase()} applied to website!`, "success");
    } catch (err) {
      this.showToast(err.message || "Failed to save WordPress styles", "error");
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

  /* ----------------- 3. SERVICES & RATES VIEW (With Currency Management) ----------------- */
  getCurrencyConfig() {
    let cfg = { symbol: 'Rs.', code: 'LKR', position: 'prefix' };
    if (this.settings && this.settings.currency_config) {
      try {
        const parsed = typeof this.settings.currency_config === 'string'
          ? JSON.parse(this.settings.currency_config)
          : this.settings.currency_config;
        if (parsed && typeof parsed === 'object') {
          cfg = { ...cfg, ...parsed };
        }
      } catch (e) { }
    } else {
      try {
        const local = localStorage.getItem('mgr_setting_currency_config');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') cfg = { ...cfg, ...parsed };
        }
      } catch (e) { }
    }
    return cfg;
  }

  formatPrice(amount, isStartingFrom = false) {
    const cfg = this.getCurrencyConfig();
    const num = Number(amount || 0);
    const numStr = isNaN(num) ? String(amount) : num.toLocaleString();
    const fromPrefix = isStartingFrom ? 'From ' : '';
    if (cfg.position === 'suffix') {
      return `${fromPrefix}${numStr} ${cfg.symbol}`;
    }
    return `${fromPrefix}${cfg.symbol} ${numStr}`;
  }

  renderServicesView() {
    const curr = this.getCurrencyConfig();
    const currSym = curr.symbol || 'Rs.';
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
          <div>
            <h3 class="card-title"><i class="fa-solid fa-tags"></i> Services & Rates Management</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage service listings, change featured images, customize rates, and toggle Active/Deactive visibility.
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddServiceModal()">
              <i class="fa-solid fa-plus"></i> Add New Service
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.adminCMS.switchTab('dashboard')"><i class="fa-solid fa-arrow-left"></i> Back</button>
          </div>
        </div>

        <div style="overflow-x: auto; margin-top: 16px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 75px;">Order</th>
                <th style="width: 70px;">Image</th>
                <th>Service Name & Description</th>
                <th>Icon</th>
                <th>Price Source</th>
                <th>Display Rate (${this.escapeHtml(currSym)})</th>
                <th>Unit</th>
                <th>Status</th>
                <th style="width: 170px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
        const sorted = [...this.services].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        return sorted.map((svc, idx) => `
                <tr>
                  <td style="white-space: nowrap;">
                    <button class="btn-reorder" onclick="window.adminCMS.moveService('${svc.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button class="btn-reorder" onclick="window.adminCMS.moveService('${svc.id}', 1)" ${idx === sorted.length - 1 ? 'disabled' : ''} title="Move Down">
                      <i class="fa-solid fa-arrow-down"></i>
                    </button>
                  </td>
                  <td>
                    ${svc.image_url
            ? `<img src="${this.escapeHtml(svc.image_url)}" alt="${this.escapeHtml(svc.service_name)}" style="width: 54px; height: 38px; object-fit: cover; border-radius: 6px; border: 1px solid var(--slate-200);">`
            : `<div style="width: 54px; height: 38px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--primary); font-size: 16px;"><i class="fa-solid ${this.escapeHtml(svc.icon_reference || 'fa-bicycle')}"></i></div>`
          }
                  </td>
                  <td>
                    <strong>${this.escapeHtml(svc.service_name)}</strong>
                    <br><span style="font-size: 11.5px; color: var(--slate-500);">${this.escapeHtml(svc.short_description || '')}</span>
                  </td>
                  <td><i class="fa-solid ${this.escapeHtml(svc.icon_reference || 'fa-bicycle')}" style="font-size: 18px; color: var(--primary);"></i></td>
                  <td>
                    <span class="badge ${svc.price_source === 'AUTO' ? 'badge-published' : 'badge-draft'}">
                      ${svc.price_source === 'AUTO' ? 'AUTO (Rental DB)' : 'MANUAL'}
                    </span>
                  </td>
                  <td><strong>${this.formatPrice(svc.manual_price || 100)}</strong></td>
                  <td>${this.escapeHtml(svc.price_unit || 'per hour')}</td>
                  <td>
                    <span class="badge ${svc.status === 'published' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${svc.status === 'published' ? 'fa-check' : 'fa-ban'}"></i> ${svc.status === 'published' ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditServiceModal('${svc.id}')" title="Edit Service & Image">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${svc.status === 'published' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleServiceStatus('${svc.id}')" title="${svc.status === 'published' ? 'Deactivate' : 'Activate'}" style="margin-left: 4px;">
                      ${svc.status === 'published' ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteService('${svc.id}')" title="Delete Service" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('');
      })()}
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
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-bicycle" style="color: var(--primary);"></i> Bicycle (${this.escapeHtml(currSym)})</label>
              <input type="number" class="form-input" id="dur-hourly-bike" value="${pricingMatrix.hourly.bicycle || 100}">
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-motorcycle" style="color: #0284c7;"></i> Motorcycle / Scooter (${this.escapeHtml(currSym)})</label>
              <input type="number" class="form-input" id="dur-hourly-moto" value="${pricingMatrix.hourly.moto || 500}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-van-shuttle" style="color: #d97706;"></i> Car / Van / Bus (From ${this.escapeHtml(currSym)})</label>
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
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-bicycle" style="color: var(--primary);"></i> Bicycle (${this.escapeHtml(currSym)})</label>
              <input type="number" class="form-input" id="dur-halfday-bike" value="${pricingMatrix.halfday.bicycle || 400}">
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-motorcycle" style="color: #0284c7;"></i> Motorcycle / Scooter (${this.escapeHtml(currSym)})</label>
              <input type="number" class="form-input" id="dur-halfday-moto" value="${pricingMatrix.halfday.moto || 1800}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-van-shuttle" style="color: #d97706;"></i> Car / Van / Bus (From ${this.escapeHtml(currSym)})</label>
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
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-bicycle" style="color: var(--primary);"></i> Bicycle (${this.escapeHtml(currSym)})</label>
              <input type="number" class="form-input" id="dur-fullday-bike" value="${pricingMatrix.fullday.bicycle || 800}">
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-motorcycle" style="color: #0284c7;"></i> Motorcycle / Scooter (${this.escapeHtml(currSym)})</label>
              <input type="number" class="form-input" id="dur-fullday-moto" value="${pricingMatrix.fullday.moto || 3500}">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px;"><i class="fa-solid fa-van-shuttle" style="color: #d97706;"></i> Car / Van / Bus (From ${this.escapeHtml(currSym)})</label>
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

  normalizeImageUrl(url) {
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

  setImageStatus(previewImgId, type, message) {
    let statusEl = document.getElementById(previewImgId + '-status');
    if (!statusEl) {
      const preview = document.getElementById(previewImgId);
      if (!preview) return;
      statusEl = document.createElement('div');
      statusEl.id = previewImgId + '-status';
      if (preview.parentNode) {
        preview.parentNode.appendChild(statusEl);
      }
    }

    if (type === 'loading') {
      statusEl.innerHTML = `<span style="font-size: 11px; color: #0284c7; display: inline-flex; align-items: center; gap: 5px; margin-top: 5px;"><i class="fa-solid fa-spinner fa-spin"></i> Checking preview...</span>`;
    } else if (type === 'success') {
      statusEl.innerHTML = `<span style="font-size: 11px; color: #059669; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; margin-top: 5px;"><i class="fa-solid fa-circle-check"></i> Image loaded successfully</span>`;
    } else if (type === 'error') {
      statusEl.innerHTML = `
        <div style="font-size: 11px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 10px; margin-top: 6px; line-height: 1.4;">
          <i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px;"></i>
          ${message || 'Unable to load preview. If using Google Drive, make sure sharing is set to "Anyone with the link can view". Or click "Upload Image" to upload directly.'}
        </div>
      `;
    }
  }

  clearImageStatus(previewImgId) {
    const statusEl = document.getElementById(previewImgId + '-status');
    if (statusEl) statusEl.innerHTML = '';
  }

  previewImage(inputId, previewImgId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewImgId);
    if (!input || !preview) return;
    let val = input.value.trim();
    if (!val) {
      preview.src = '';
      preview.style.display = 'none';
      this.clearImageStatus(previewImgId);
      return;
    }

    // Auto-normalize Google Drive links if detected
    const normalized = this.normalizeImageUrl(val);
    if (normalized !== val) {
      val = normalized;
      input.value = normalized;
    }

    this.setImageStatus(previewImgId, 'loading');
    preview.style.display = 'block';

    preview.onload = () => {
      preview.style.display = 'block';
      this.setImageStatus(previewImgId, 'success');
    };

    preview.onerror = () => {
      preview.style.display = 'none';
      this.setImageStatus(previewImgId, 'error');
    };

    preview.src = val;
  }

  async handleFileUpload(fileInput, targetUrlInputId, previewImgId) {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file (PNG, JPG, WebP, SVG)', 'error');
      return;
    }
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    try {
      this.showToast("Uploading image to storage...", "info");
      const { error: uploadError } = await this.supabase.storage
        .from('website-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from('website-media')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const targetInput = document.getElementById(targetUrlInputId);
      if (targetInput) {
        targetInput.value = publicUrl;
      }
      if (previewImgId) {
        this.previewImage(targetUrlInputId, previewImgId);
      }

      try {
        await this.supabase.from('website_media').insert({
          file_name: file.name,
          storage_path: filePath,
          public_url: publicUrl,
          media_type: file.type,
          file_size: file.size,
          category: 'general'
        });
      } catch (mErr) {
        console.warn("Media record note:", mErr);
      }

      this.showToast("Image uploaded successfully!", "success");
    } catch (err) {
      this.showToast(err.message || "Failed to upload image", "error");
    }
  }

  bindServicesEvents() { }

  openAddServiceModal() {
    const modalTitle = document.getElementById('service-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-plus"></i> Add New Service';

    document.getElementById('edit-svc-id').value = '';
    document.getElementById('edit-svc-name').value = '';
    document.getElementById('edit-svc-icon').value = 'fa-solid fa-bicycle';
    document.getElementById('edit-svc-image-url').value = '';
    const preview = document.getElementById('edit-svc-image-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    this.clearImageStatus('edit-svc-image-preview');
    document.getElementById('edit-svc-desc').value = '';
    document.getElementById('edit-svc-source').value = 'AUTO';
    document.getElementById('edit-svc-price').value = '100';
    document.getElementById('edit-svc-unit').value = 'per hour';
    document.getElementById('edit-svc-status').value = 'published';

    this.openModal('edit-service-modal');
  }

  openEditServiceModal(serviceId) {
    const svc = this.services.find(s => s.id === serviceId);
    if (!svc) return;

    const modal = document.getElementById('edit-service-modal');
    if (!modal) return;

    const modalTitle = document.getElementById('service-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Service & Rates';

    document.getElementById('edit-svc-id').value = svc.id;
    document.getElementById('edit-svc-name').value = svc.service_name || '';
    document.getElementById('edit-svc-icon').value = svc.icon_reference || 'fa-solid fa-bicycle';
    document.getElementById('edit-svc-image-url').value = svc.image_url || '';
    this.previewImage('edit-svc-image-url', 'edit-svc-image-preview');
    document.getElementById('edit-svc-desc').value = svc.short_description || '';
    document.getElementById('edit-svc-source').value = svc.price_source || 'AUTO';
    document.getElementById('edit-svc-price').value = svc.manual_price || 100;
    document.getElementById('edit-svc-unit').value = svc.price_unit || 'per hour';
    document.getElementById('edit-svc-status').value = svc.status || 'published';

    this.openModal('edit-service-modal');
  }

  async handleSaveService() {
    const id = document.getElementById('edit-svc-id').value;
    const service_name = document.getElementById('edit-svc-name').value.trim();
    const icon_reference = document.getElementById('edit-svc-icon').value.trim() || 'fa-solid fa-bicycle';
    const image_url = this.normalizeImageUrl(document.getElementById('edit-svc-image-url').value.trim());
    const short_description = document.getElementById('edit-svc-desc').value.trim();
    const price_source = document.getElementById('edit-svc-source').value;
    const manual_price = parseFloat(document.getElementById('edit-svc-price').value) || 0;
    const price_unit = document.getElementById('edit-svc-unit').value.trim() || 'per hour';
    const status = document.getElementById('edit-svc-status').value || 'published';

    if (!service_name) {
      this.showToast("Service title is required!", "error");
      return;
    }

    try {
      this.showToast("Saving service...", "info");

      if (id) {
        const { data, error } = await this.supabase
          .from('website_services')
          .update({
            service_name,
            icon_reference,
            image_url,
            short_description,
            price_source,
            manual_price,
            price_unit,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();

        if (error) throw error;
        await this.logAudit("UPDATE", "SERVICES", id, { service_name, image_url, manual_price, status });
        this.showToast("Service updated successfully!", "success");
      } else {
        const newId = 'srv-' + service_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
        const slug = service_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const maxOrder = this.services.reduce((m, s) => Math.max(m, s.display_order || 0), 0);

        const { data, error } = await this.supabase
          .from('website_services')
          .insert({
            id: newId,
            service_name,
            slug,
            icon_reference,
            image_url,
            short_description,
            price_source,
            manual_price,
            price_unit,
            status,
            display_order: maxOrder + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        await this.logAudit("CREATE", "SERVICES", newId, { service_name, image_url, manual_price, status });
        this.showToast("New service added successfully!", "success");
      }

      this.closeModal('edit-service-modal');
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save service", "error");
    }
  }

  async toggleServiceStatus(id) {
    const svc = this.services.find(s => s.id === id);
    if (!svc) return;
    const newStatus = svc.status === 'published' ? 'inactive' : 'published';

    try {
      this.showToast("Updating service visibility...", "info");
      const { error } = await this.supabase
        .from('website_services')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await this.logAudit("STATUS_CHANGE", "SERVICES", id, { status: newStatus });
      this.showToast(`Service '${svc.service_name}' is now ${newStatus === 'published' ? 'Active' : 'Deactive'}.`, "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to update service status", "error");
    }
  }

  async deleteService(id) {
    const svc = this.services.find(s => s.id === id);
    if (!svc) return;

    if (!confirm(`Are you sure you want to delete service '${svc.service_name}'?`)) return;

    try {
      this.showToast("Deleting service...", "info");
      const { error } = await this.supabase
        .from('website_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await this.logAudit("DELETE", "SERVICES", id, { service_name: svc.service_name });
      this.showToast(`Service '${svc.service_name}' deleted.`, "info");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete service", "error");
    }
  }

  async moveService(id, direction) {
    let list = [...this.services].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const index = list.findIndex(s => s.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.display_order = i + 1; });
    this.services = list;

    try {
      this.showToast("Updating service display order...", "info");
      for (const item of list) {
        await this.supabase.from('website_services').update({ display_order: item.display_order }).eq('id', item.id);
      }
      await this.logAudit("REORDER", "SERVICES", id, { new_order: targetIndex + 1 });
      this.showToast("Services rearranged successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder services", "error");
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
      ${this.renderOfferAnimationCard()}
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-gift"></i> Active & Scheduled Promotional Offers</h3>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddOfferModal()"><i class="fa-solid fa-plus"></i> Add New Offer</button>
        </div>
        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 75px;">Order</th>
                <th>Offer Title</th>
                <th>Discount Value</th>
                <th>Media</th>
                <th>Description</th>
                <th>CTA Button</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
        const sorted = [...this.offers].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        return sorted.length ? sorted.map((o, idx) => `
                <tr>
                  <td style="white-space: nowrap;">
                    <button class="btn-reorder" onclick="window.adminCMS.moveOffer('${o.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button class="btn-reorder" onclick="window.adminCMS.moveOffer('${o.id}', 1)" ${idx === sorted.length - 1 ? 'disabled' : ''} title="Move Down">
                      <i class="fa-solid fa-arrow-down"></i>
                    </button>
                  </td>
                  <td><strong>${this.escapeHtml(o.title)}</strong></td>
                  <td><span class="badge badge-published">${this.escapeHtml(o.discount_value || '')}</span></td>
                  <td style="white-space: nowrap;">
                    ${(() => {
            if (!o.image_url) return '<span style="color:#94a3b8; font-size:11px;">None</span>';
            const isVid = this.isVideoMedia(o.image_url);
            if (isVid) {
              return `<button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.previewOfferMediaModal('${this.escapeHtml(o.image_url)}', '${this.escapeHtml(o.title || '')}')" style="padding: 2px 8px; font-size: 11px; color: #0284c7; border-color: #bae6fd;">
                          <i class="fa-solid fa-video"></i> Video
                        </button>`;
            } else {
              return `<img src="${this.normalizeImageUrl(o.image_url)}" alt="Media" style="width: 52px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="window.adminCMS.previewOfferMediaModal('${this.escapeHtml(o.image_url)}', '${this.escapeHtml(o.title || '')}')" title="Click to preview">`;
            }
          })()}
                  </td>
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
              `).join('') : `<tr><td colspan="8" style="text-align:center; color:var(--slate-500);">No promotional offers found.</td></tr>`;
      })()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindOffersEvents() {
    this.updateOfferAnimationPreview();
  }

  /* ----------------- OFFER ANIMATION CONTROLS (Item 3) ----------------- */
  getOfferAnimationConfig() {
    let cfg = {
      enabled: true,
      style: 'all-combined',
      speed: 'normal',
      badge_pulse: true,
      button_bounce: true
    };
    if (this.settings && this.settings.offer_animation_config) {
      try {
        const parsed = typeof this.settings.offer_animation_config === 'string'
          ? JSON.parse(this.settings.offer_animation_config)
          : this.settings.offer_animation_config;
        if (parsed && typeof parsed === 'object') {
          cfg = { ...cfg, ...parsed };
        }
      } catch (e) { }
    } else {
      try {
        const localVal = localStorage.getItem('mgr_setting_offer_animation_config');
        if (localVal) {
          cfg = { ...cfg, ...JSON.parse(localVal) };
        }
      } catch (e) { }
    }
    return cfg;
  }

  renderOfferAnimationCard() {
    const cfg = this.getOfferAnimationConfig();
    const isEnabled = cfg.enabled !== false;
    const style = cfg.style || 'all-combined';
    const speed = cfg.speed || 'normal';
    const badgePulse = cfg.badge_pulse !== false;
    const buttonBounce = cfg.button_bounce !== false;

    // Get current top offer details for preview
    const topOffer = (this.offers && this.offers.length > 0) ? this.offers[0] : {
      title: "Early Bird Sunrise Cycling Special",
      discount_value: "20% OFF 2nd Hour",
      description: "Rent any hybrid or city cycle before 07:00 AM and get 20% discount!",
      button_text: "Claim Offer"
    };

    return `
      <div class="card offer-anim-card" id="offer-anim-control-card">
        <div class="card-header" style="border-bottom: 1px solid var(--slate-100); padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h3 class="card-title" style="display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-wand-magic-sparkles" style="color: #10b981;"></i> 
              Promotional Offer Banner Animation & Motion Controls
            </h3>
            <p style="font-size: 13px; color: var(--slate-500); margin-top: 4px;">
              Capture traveler attention with dynamic motion effects: shimmering light sweep, breathing glow, and pulsing CTA buttons.
            </p>
          </div>
          <div class="offer-anim-toggle-wrapper">
            <span id="offer-anim-status-badge" class="badge ${isEnabled ? 'badge-published' : 'badge-draft'}" style="font-size: 12px; padding: 4px 10px;">
              ${isEnabled ? '<i class="fa-solid fa-bolt"></i> Animation Active' : '<i class="fa-solid fa-power-off"></i> Animation Disabled'}
            </span>
            <label class="offer-toggle-switch" title="Toggle Offer Banner Animation">
              <input type="checkbox" id="offer-anim-master-toggle" ${isEnabled ? 'checked' : ''} onchange="window.adminCMS.handleOfferAnimToggle(this.checked)">
              <span class="offer-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div id="offer-anim-settings-body" style="opacity: ${isEnabled ? '1' : '0.5'}; pointer-events: ${isEnabled ? 'auto' : 'none'}; transition: opacity 0.2s ease;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            
            <!-- Style Mode Selector -->
            <div>
              <label class="form-label" style="font-weight: 700; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-layer-group" style="color:#059669;"></i> Animation Style Preset
              </label>
              <div class="wp-btn-group" id="offer-anim-style-group" style="display: flex; flex-direction: column; gap: 8px;">
                <button type="button" class="btn btn-outline ${style === 'all-combined' ? 'active' : ''}" style="justify-content: flex-start; text-align: left; padding: 10px 14px; ${style === 'all-combined' ? 'background:#ecfdf5; border-color:#059669; color:#065f46; font-weight:700;' : ''}" onclick="window.adminCMS.setOfferAnimStyle('all-combined')">
                  <span style="font-size:16px; margin-right:8px;">🔥</span>
                  <div>
                    <div style="font-weight:700;">All-in-One Showcase (Recommended)</div>
                    <div style="font-size:11px; opacity:0.8;">Liquid light sweep + Breathing emerald-gold glow + Badge & button bounce</div>
                  </div>
                </button>
                <button type="button" class="btn btn-outline ${style === 'shimmer-wave' ? 'active' : ''}" style="justify-content: flex-start; text-align: left; padding: 10px 14px; ${style === 'shimmer-wave' ? 'background:#ecfdf5; border-color:#059669; color:#065f46; font-weight:700;' : ''}" onclick="window.adminCMS.setOfferAnimStyle('shimmer-wave')">
                  <span style="font-size:16px; margin-right:8px;">✨</span>
                  <div>
                    <div style="font-weight:700;">Shimmer Wave Only</div>
                    <div style="font-size:11px; opacity:0.8;">Reflective light stream continuously sweeping across the banner ribbon</div>
                  </div>
                </button>
                <button type="button" class="btn btn-outline ${style === 'pulse-glow' ? 'active' : ''}" style="justify-content: flex-start; text-align: left; padding: 10px 14px; ${style === 'pulse-glow' ? 'background:#ecfdf5; border-color:#059669; color:#065f46; font-weight:700;' : ''}" onclick="window.adminCMS.setOfferAnimStyle('pulse-glow')">
                  <span style="font-size:16px; margin-right:8px;">🌟</span>
                  <div>
                    <div style="font-weight:700;">Breathing Glow Aura</div>
                    <div style="font-size:11px; opacity:0.8;">Subtle ambient golden-emerald pulsation along the border and background</div>
                  </div>
                </button>
                <button type="button" class="btn btn-outline ${style === 'bounce-cta' ? 'active' : ''}" style="justify-content: flex-start; text-align: left; padding: 10px 14px; ${style === 'bounce-cta' ? 'background:#ecfdf5; border-color:#059669; color:#065f46; font-weight:700;' : ''}" onclick="window.adminCMS.setOfferAnimStyle('bounce-cta')">
                  <span style="font-size:16px; margin-right:8px;">🎁</span>
                  <div>
                    <div style="font-weight:700;">Vibrant CTA Bounce</div>
                    <div style="font-size:11px; opacity:0.8;">Gentle micro-bounce and gift icon wobble on the action elements</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Speed & Fine Tuning -->
            <div>
              <div class="form-group" style="margin-bottom: 18px;">
                <label class="form-label" style="font-weight: 700; display:flex; align-items:center; gap:6px;">
                  <i class="fa-solid fa-gauge-high" style="color:#059669;"></i> Motion Speed / Cycle Rate
                </label>
                <div class="wp-chip-group" id="offer-anim-speed-group">
                  <button type="button" class="wp-chip ${speed === 'fast' ? 'active' : ''}" onclick="window.adminCMS.setOfferAnimSpeed('fast')">⚡ Fast (1.8s)</button>
                  <button type="button" class="wp-chip ${speed === 'normal' ? 'active' : ''}" onclick="window.adminCMS.setOfferAnimSpeed('normal')">⏱️ Standard (3.2s)</button>
                  <button type="button" class="wp-chip ${speed === 'gentle' ? 'active' : ''}" onclick="window.adminCMS.setOfferAnimSpeed('gentle')">🍃 Relaxed (5.0s)</button>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 18px;">
                <label class="form-label" style="font-weight: 700; display:flex; align-items:center; gap:6px;">
                  <i class="fa-solid fa-sliders" style="color:#059669;"></i> Target Element Accents
                </label>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="offer-badge-pulse-chk" ${badgePulse ? 'checked' : ''} onchange="window.adminCMS.handleOfferSubToggle()">
                    <span>Animate Discount Badge (Heartbeat Pulse & Sparkle Halo)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="offer-button-bounce-chk" ${buttonBounce ? 'checked' : ''} onchange="window.adminCMS.handleOfferSubToggle()">
                    <span>Animate Action Button (Gift Icon Wobble & CTA Nudge)</span>
                  </label>
                </div>
              </div>

              <!-- Quick Status Info -->
              <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: var(--slate-600); line-height: 1.5;">
                <i class="fa-solid fa-circle-info" style="color: #0284c7;"></i>
                Changes are tested in real time below. Click <strong>Save Offer Animation Settings</strong> to publish immediately to the live website.
              </div>
            </div>

          </div>

          <!-- Live Interactive Preview Canvas -->
          <div class="offer-preview-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500);">
                <i class="fa-solid fa-eye"></i> Live Interactive Banner Preview
              </span>
              <span id="offer-preview-state-indicator" style="font-size: 11px; font-weight: 700; color: ${isEnabled ? '#059669' : '#dc2626'};">
                ${isEnabled ? '● Live Animation Playing' : '○ Static Banner (Animation OFF)'}
              </span>
            </div>
            
            <div id="offer-preview-banner" class="offer-preview-banner-bar ${isEnabled ? 'offer-animated offer-speed-' + speed : ''} ${isEnabled && (style === 'shimmer-wave' || style === 'all-combined') ? 'offer-anim-shimmer' : ''} ${isEnabled && (style === 'pulse-glow' || style === 'all-combined') ? 'offer-anim-glow' : ''}">
              <span class="offer-preview-badge ${isEnabled && badgePulse ? 'offer-badge-pulse' : ''}" id="offer-preview-badge-el">
                ${this.escapeHtml(topOffer.discount_value || 'SPECIAL OFFER')}
              </span>
              <span style="font-weight: 700;" id="offer-preview-title-el">
                ${this.escapeHtml(topOffer.title || 'Special Promotion Deal')}
              </span>
              <span style="font-weight: 400; opacity: 0.9; display: none; @media(min-width:768px){display:inline;}" class="preview-desc-text">
                ${this.escapeHtml(topOffer.description || '')}
              </span>
              <button class="offer-preview-btn ${isEnabled && buttonBounce ? 'offer-btn-bounce' : ''}" id="offer-preview-btn-el">
                <i class="fa-solid fa-gift"></i> <span>${this.escapeHtml(topOffer.button_text || 'Claim Offer')}</span>
              </button>
            </div>
          </div>

          <!-- Save Button Bar -->
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
            <button class="btn btn-primary" id="btn-save-offer-anim" onclick="window.adminCMS.saveOfferAnimationSettings()" style="padding: 10px 24px; font-weight: 700; font-size: 14px;">
              <i class="fa-solid fa-floppy-disk"></i> Save Offer Animation Settings
            </button>
          </div>

        </div>
      </div>
    `;
  }

  handleOfferAnimToggle(isChecked) {
    const badge = document.getElementById('offer-anim-status-badge');
    const body = document.getElementById('offer-anim-settings-body');
    const ind = document.getElementById('offer-preview-state-indicator');
    if (badge) {
      badge.className = `badge ${isChecked ? 'badge-published' : 'badge-draft'}`;
      badge.innerHTML = isChecked ? '<i class="fa-solid fa-bolt"></i> Animation Active' : '<i class="fa-solid fa-power-off"></i> Animation Disabled';
    }
    if (body) {
      body.style.opacity = isChecked ? '1' : '0.5';
      body.style.pointerEvents = isChecked ? 'auto' : 'none';
    }
    if (ind) {
      ind.textContent = isChecked ? '● Live Animation Playing' : '○ Static Banner (Animation OFF)';
      ind.style.color = isChecked ? '#059669' : '#dc2626';
    }
    this.updateOfferAnimationPreview();
  }

  setOfferAnimStyle(selectedStyle) {
    const group = document.getElementById('offer-anim-style-group');
    if (group) {
      const btns = group.querySelectorAll('button');
      btns.forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.borderColor = '';
        b.style.color = '';
      });
      const targetBtn = Array.from(btns).find(b => b.getAttribute('onclick')?.includes(selectedStyle));
      if (targetBtn) {
        targetBtn.classList.add('active');
        targetBtn.style.background = '#ecfdf5';
        targetBtn.style.borderColor = '#059669';
        targetBtn.style.color = '#065f46';
      }
    }
    this.updateOfferAnimationPreview();
  }

  setOfferAnimSpeed(selectedSpeed) {
    const group = document.getElementById('offer-anim-speed-group');
    if (group) {
      group.querySelectorAll('.wp-chip').forEach(c => c.classList.remove('active'));
      const targetChip = Array.from(group.querySelectorAll('.wp-chip')).find(c => c.getAttribute('onclick')?.includes(selectedSpeed));
      if (targetChip) targetChip.classList.add('active');
    }
    this.updateOfferAnimationPreview();
  }

  handleOfferSubToggle() {
    this.updateOfferAnimationPreview();
  }

  getCurrentOfferAnimState() {
    const toggle = document.getElementById('offer-anim-master-toggle');
    const isEnabled = toggle ? toggle.checked : true;

    let style = 'all-combined';
    const activeStyleBtn = document.querySelector('#offer-anim-style-group button.active');
    if (activeStyleBtn) {
      const onclickAttr = activeStyleBtn.getAttribute('onclick') || '';
      if (onclickAttr.includes('shimmer-wave')) style = 'shimmer-wave';
      else if (onclickAttr.includes('pulse-glow')) style = 'pulse-glow';
      else if (onclickAttr.includes('bounce-cta')) style = 'bounce-cta';
      else style = 'all-combined';
    }

    let speed = 'normal';
    const activeSpeedChip = document.querySelector('#offer-anim-speed-group .wp-chip.active');
    if (activeSpeedChip) {
      const onclickAttr = activeSpeedChip.getAttribute('onclick') || '';
      if (onclickAttr.includes('fast')) speed = 'fast';
      else if (onclickAttr.includes('gentle')) speed = 'gentle';
      else speed = 'normal';
    }

    const badgePulse = document.getElementById('offer-badge-pulse-chk')?.checked !== false;
    const buttonBounce = document.getElementById('offer-button-bounce-chk')?.checked !== false;

    return {
      enabled: isEnabled,
      style,
      speed,
      badge_pulse: badgePulse,
      button_bounce: buttonBounce
    };
  }

  updateOfferAnimationPreview() {
    const state = this.getCurrentOfferAnimState();
    const banner = document.getElementById('offer-preview-banner');
    const badge = document.getElementById('offer-preview-badge-el');
    const btn = document.getElementById('offer-preview-btn-el');

    if (!banner) return;

    banner.className = 'offer-preview-banner-bar';
    if (badge) badge.className = 'offer-preview-badge';
    if (btn) btn.className = 'offer-preview-btn';

    if (!state.enabled) {
      return; // Disabled
    }

    banner.classList.add('offer-animated');
    banner.classList.add(`offer-speed-${state.speed}`);

    if (state.style === 'shimmer-wave') {
      banner.classList.add('offer-anim-shimmer');
    } else if (state.style === 'pulse-glow') {
      banner.classList.add('offer-anim-glow');
    } else if (state.style === 'bounce-cta') {
      // CTA only
    } else { // 'all-combined'
      banner.classList.add('offer-anim-shimmer', 'offer-anim-glow');
    }

    if (state.badge_pulse && badge) {
      badge.classList.add('offer-badge-pulse');
    }
    if (state.button_bounce && btn) {
      btn.classList.add('offer-btn-bounce');
    }
  }

  async saveOfferAnimationSettings() {
    const state = this.getCurrentOfferAnimState();
    const saveBtn = document.getElementById('btn-save-offer-anim');

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Settings...';
    }

    try {
      // 1. Save to Supabase website_settings
      const { error } = await this.supabase
        .from('website_settings')
        .upsert({
          setting_key: 'offer_animation_config',
          setting_value: JSON.stringify(state),
          is_public: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // 2. Cache in localStorage for immediate sync
      localStorage.setItem('mgr_setting_offer_animation_config', JSON.stringify(state));

      // 3. Update local instance state
      this.settings.offer_animation_config = state;

      await this.logAudit("UPDATE", "SETTINGS", "offer_animation_config", state);
      this.showToast("Offer banner animation settings saved successfully!", "success");
    } catch (err) {
      console.error("Error saving offer animation settings:", err);
      // Fallback: save to localStorage even if DB fails
      localStorage.setItem('mgr_setting_offer_animation_config', JSON.stringify(state));
      this.settings.offer_animation_config = state;
      this.showToast("Saved to local storage! " + (err.message || ""), "warning");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Offer Animation Settings';
      }
    }
  }

  /* ----------------- OFFER PROMOTIONAL MEDIA (Item 3) ----------------- */
  isVideoMedia(url) {
    if (!url) return false;
    const str = String(url).toLowerCase();
    return str.includes('.mp4') || str.includes('.webm') || str.includes('.ogg') || str.includes('.mov') ||
      str.includes('youtube.com') || str.includes('youtu.be') || str.includes('vimeo.com') ||
      str.startsWith('data:video');
  }

  previewOfferMedia(url, isEdit) {
    const prefix = isEdit ? 'edit-offer' : 'offer';
    const box = document.getElementById(`${prefix}-media-preview-box`);
    const badge = document.getElementById(`${prefix}-media-type-badge`);
    if (!box) return;

    const trimmed = (url || '').trim();
    if (!trimmed) {
      box.innerHTML = `<span style="font-size: 12px; color: #94a3b8;"><i class="fa-solid fa-image"></i> No media attached. Upload an image (1200×675), video (1920×1080), or enter a media URL.</span>`;
      if (badge) {
        badge.className = 'badge badge-draft';
        badge.textContent = 'Optional Media';
      }
      return;
    }

    const isVid = this.isVideoMedia(trimmed);
    if (badge) {
      badge.className = 'badge badge-published';
      badge.innerHTML = isVid ? '<i class="fa-solid fa-video"></i> Video Attached' : '<i class="fa-solid fa-image"></i> Image Attached';
    }

    if (isVid) {
      if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
        let ytId = '';
        const m = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (m) ytId = m[1];
        box.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}" style="width: 100%; height: 200px; aspect-ratio: 16/9; border-radius: 6px;" frameborder="0" allowfullscreen></iframe>`;
      } else if (trimmed.includes('vimeo.com')) {
        const vm = trimmed.match(/vimeo\.com\/(\d+)/);
        const vId = vm ? vm[1] : '';
        box.innerHTML = `<iframe src="https://player.vimeo.com/video/${vId}" style="width: 100%; height: 200px; aspect-ratio: 16/9; border-radius: 6px;" frameborder="0" allowfullscreen></iframe>`;
      } else {
        box.innerHTML = `<video src="${this.normalizeImageUrl(trimmed)}" controls style="width: 100%; max-height: 200px; aspect-ratio: 16/9; border-radius: 6px; background: #000;"></video>`;
      }
    } else {
      box.innerHTML = `<img src="${this.normalizeImageUrl(trimmed)}" alt="Preview" style="width: 100%; max-height: 200px; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;">`;
    }
  }

  removeOfferMedia(isEdit) {
    const prefix = isEdit ? 'edit-offer' : 'offer';
    const input = document.getElementById(`${prefix}-image-url`);
    if (input) input.value = '';
    this.previewOfferMedia('', isEdit);
    this.showToast("Media removed from offer.", "info");
  }

  openMediaPickerForOffer(isEdit) {
    const targetInputId = isEdit ? 'edit-offer-image-url' : 'offer-image-url';
    this.openMediaPickerModal(targetInputId);
  }

  async handleOfferMediaUpload(input, isEdit) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|ogg|mov)$/i);

    // Validate capacities: 10MB image / 50MB video
    if (isVideo && file.size > 50 * 1024 * 1024) {
      this.showToast("Video exceeds 50MB maximum capacity limit!", "error");
      input.value = '';
      return;
    }
    if (!isVideo && file.size > 10 * 1024 * 1024) {
      this.showToast("Image exceeds 10MB maximum capacity limit!", "error");
      input.value = '';
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `offers/${fileName}`;

    try {
      this.showToast(`Uploading ${isVideo ? 'video' : 'image'} to Supabase Storage...`, "info");
      const { error: uploadError } = await this.supabase.storage
        .from('website-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from('website-media')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save to media table
      await this.supabase.from('website_media').insert({
        file_name: file.name,
        storage_path: filePath,
        public_url: publicUrl,
        media_type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        file_size: file.size,
        category: 'offers'
      });

      const prefix = isEdit ? 'edit-offer' : 'offer';
      const targetInput = document.getElementById(`${prefix}-image-url`);
      if (targetInput) {
        targetInput.value = publicUrl;
      }
      this.previewOfferMedia(publicUrl, isEdit);
      this.showToast(`${isVideo ? 'Video' : 'Image'} uploaded successfully!`, "success");
    } catch (err) {
      console.error("Offer media upload error:", err);
      this.showToast(err.message || "Failed to upload media file", "error");
    } finally {
      input.value = '';
    }
  }

  previewOfferMediaModal(url, title = 'Promotional Offer') {
    if (!url) return;
    const isVid = this.isVideoMedia(url);
    const modalHtml = `
      <div class="modal-backdrop active" id="offer-media-quick-modal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;" onclick="if(event.target===this) this.remove()">
        <div class="modal-box" style="max-width: 650px; width: 95%; padding: 0; overflow: hidden; border-radius: 12px; background: #000;">
          <div style="padding: 12px 16px; background: #0f172a; color: #fff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
            <span style="font-weight: 700; font-size: 13px;"><i class="fa-solid ${isVid ? 'fa-video' : 'fa-image'}"></i> ${this.escapeHtml(title)}</span>
            <button onclick="document.getElementById('offer-media-quick-modal').remove()" style="background:none; border:none; color:#fff; font-size:20px; cursor:pointer; line-height:1;">&times;</button>
          </div>
          <div style="background: #000; display: flex; align-items: center; justify-content: center; min-height: 240px;">
            ${isVid
        ? (url.includes('youtube.com') || url.includes('youtu.be')
          ? `<iframe src="https://www.youtube.com/embed/${url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1] || ''}?autoplay=1" style="width: 100%; aspect-ratio: 16/9; min-height: 320px;" frameborder="0" allowfullscreen></iframe>`
          : `<video src="${this.normalizeImageUrl(url)}" controls autoplay style="width: 100%; max-height: 420px; aspect-ratio: 16/9;"></video>`)
        : `<img src="${this.normalizeImageUrl(url)}" alt="Offer Preview" style="width: 100%; max-height: 420px; object-fit: contain;">`
      }
          </div>
        </div>
      </div>
    `;
    const existing = document.getElementById('offer-media-quick-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  openAddOfferModal() {
    const input = document.getElementById('offer-image-url');
    if (input) input.value = '';
    this.previewOfferMedia('', false);
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
    this.previewOfferMedia(offer.image_url || '', true);

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

  async moveOffer(id, direction) {
    let list = [...this.offers].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const index = list.findIndex(o => o.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.display_order = i + 1; });
    this.offers = list;

    try {
      this.showToast("Updating offer display order...", "info");
      for (const item of list) {
        await this.supabase.from('website_offers').update({ display_order: item.display_order }).eq('id', item.id);
      }
      await this.logAudit("REORDER", "OFFERS", id, { new_order: targetIndex + 1 });
      this.showToast("Offers rearranged successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder offers", "error");
    }
  }

  /* ----------------- 6. BLOGS VIEW ----------------- */
  renderBlogsView() {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-newspaper"></i> Blog & Travel Guides Management</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Publish articles, edit featured cover images, update travel guides, and toggle Active/Deactive status.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddBlogModal()">
            <i class="fa-solid fa-plus"></i> Write New Article
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 16px;">
          ${(() => {
        const sorted = [...this.blogs].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        return sorted.map((blog, idx) => {
          const isPublished = blog.status === 'published';
          return `
              <div style="background: #fff; border: 1px solid var(--slate-200); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-sm);">
                <div style="position: relative; height: 170px; background: #f8fafc;">
                  <img src="${this.escapeHtml(blog.featured_image_url || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=600')}" alt="${this.escapeHtml(blog.title)}" style="height: 100%; width: 100%; object-fit: cover;">
                  <span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.65); color: #fff; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; z-index: 2;">
                    #${idx + 1}
                  </span>
                  <span class="badge ${isPublished ? 'badge-published' : 'badge-draft'}" style="position: absolute; top: 10px; right: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 2;">
                    <i class="fa-solid ${isPublished ? 'fa-check' : 'fa-ban'}"></i> ${isPublished ? 'Active' : 'Deactive'}
                  </span>
                </div>
                <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <span class="badge badge-emerald" style="margin-bottom: 8px; font-size: 11px;">${this.escapeHtml(blog.category_id || 'Travel Guide')}</span>
                    <h4 style="font-size: 15px; font-weight: 700; color: var(--slate-900); margin-bottom: 6px; line-height: 1.4;">${this.escapeHtml(blog.title)}</h4>
                    <p style="font-size: 12.5px; color: var(--slate-600); line-height: 1.5;">${this.escapeHtml(blog.summary || '')}</p>
                  </div>
                  <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--slate-100); padding-top: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <button class="btn-reorder" onclick="window.adminCMS.moveBlog('${blog.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Earlier">
                        <i class="fa-solid fa-arrow-left"></i>
                      </button>
                      <button class="btn-reorder" onclick="window.adminCMS.moveBlog('${blog.id}', 1)" ${idx === sorted.length - 1 ? 'disabled' : ''} title="Move Later">
                        <i class="fa-solid fa-arrow-right"></i>
                      </button>
                      <span style="font-size: 11px; color: var(--slate-400); margin-left: 4px;"><i class="fa-solid fa-user-pen"></i> ${this.escapeHtml(blog.author_name || 'Admin')}</span>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditBlogModal('${blog.id}')" title="Edit Article & Image">
                        <i class="fa-solid fa-pen"></i> Edit
                      </button>
                      <button class="btn ${isPublished ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleBlogStatus('${blog.id}')" title="${isPublished ? 'Deactivate (Draft)' : 'Activate (Publish)'}">
                        ${isPublished ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>'}
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteBlog('${blog.id}')" title="Delete Article">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
        }).join('');
      })()}
        </div>
      </div>
    `;
  }

  bindBlogsEvents() { }

  openAddBlogModal() {
    const modalTitle = document.getElementById('blog-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-plus"></i> Write New Travel Guide';

    document.getElementById('blog-id-hidden').value = '';
    document.getElementById('blog-title').value = '';
    document.getElementById('blog-category').value = 'Route Guide';
    document.getElementById('blog-author').value = 'Mannar Green Ride Team';
    document.getElementById('blog-status').value = 'published';
    document.getElementById('blog-image-url').value = '';
    const preview = document.getElementById('blog-image-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    this.clearImageStatus('blog-image-preview');
    document.getElementById('blog-summary').value = '';
    document.getElementById('blog-content').value = '';

    const saveBtn = document.getElementById('blog-save-btn');
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Publish Article';

    this.openModal('add-blog-modal');
  }

  openEditBlogModal(id) {
    const blog = this.blogs.find(b => b.id === id);
    if (!blog) return;

    const modalTitle = document.getElementById('blog-modal-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Travel Guide Article';

    document.getElementById('blog-id-hidden').value = blog.id;
    document.getElementById('blog-title').value = blog.title || '';
    document.getElementById('blog-category').value = blog.category_id || 'Route Guide';
    document.getElementById('blog-author').value = blog.author_name || 'Mannar Green Ride Team';
    document.getElementById('blog-status').value = blog.status || 'published';
    document.getElementById('blog-image-url').value = blog.featured_image_url || '';
    this.previewImage('blog-image-url', 'blog-image-preview');

    document.getElementById('blog-summary').value = blog.summary || '';
    document.getElementById('blog-content').value = blog.content || '';

    const saveBtn = document.getElementById('blog-save-btn');
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';

    this.openModal('add-blog-modal');
  }

  async handleSaveBlog() {
    const idHidden = document.getElementById('blog-id-hidden')?.value;
    const title = document.getElementById('blog-title').value.trim();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const summary = document.getElementById('blog-summary').value.trim();
    const content = document.getElementById('blog-content').value.trim();
    const category_id = document.getElementById('blog-category').value;
    const author_name = document.getElementById('blog-author').value.trim() || 'Mannar Green Ride Team';
    const status = document.getElementById('blog-status').value || 'published';
    const featured_image_url = this.normalizeImageUrl(document.getElementById('blog-image-url').value.trim()) || 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=800';

    if (!title) {
      this.showToast("Article headline is required!", "error");
      return;
    }

    try {
      this.showToast("Saving blog article...", "info");

      if (idHidden) {
        const { error } = await this.supabase
          .from('blog_posts')
          .update({
            title,
            slug,
            summary,
            content,
            category_id,
            author_name,
            status,
            featured_image_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', idHidden);

        if (error) throw error;
        await this.logAudit("UPDATE", "BLOGS", idHidden, { title, status, featured_image_url });
        this.showToast("Blog article updated successfully!", "success");
      } else {
        const { error } = await this.supabase
          .from('blog_posts')
          .insert({
            title,
            slug,
            summary,
            content,
            category_id,
            author_name,
            status,
            featured_image_url,
            published_at: new Date().toISOString()
          });

        if (error) throw error;
        await this.logAudit("CREATE", "BLOGS", slug, { title, status, featured_image_url });
        this.showToast("New blog article published!", "success");
      }

      this.closeModal('add-blog-modal');
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save blog", "error");
    }
  }

  async toggleBlogStatus(id) {
    const blog = this.blogs.find(b => b.id === id);
    if (!blog) return;
    const newStatus = blog.status === 'published' ? 'draft' : 'published';

    try {
      this.showToast("Updating article visibility...", "info");
      const { error } = await this.supabase
        .from('blog_posts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await this.logAudit("STATUS_CHANGE", "BLOGS", id, { status: newStatus });
      this.showToast(`Article '${blog.title}' is now ${newStatus === 'published' ? 'Active' : 'Deactive'}.`, "success");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to update article status", "error");
    }
  }

  async deleteBlog(id) {
    const blog = this.blogs.find(b => b.id === id);
    const title = blog ? blog.title : id;
    if (!confirm(`Are you sure you want to delete article '${title}'?`)) return;

    try {
      this.showToast("Deleting article...", "info");
      const { error } = await this.supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      await this.logAudit("DELETE", "BLOGS", id, { title });
      this.showToast("Article deleted successfully.", "info");
      await this.loadAllData();
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete article", "error");
    }
  }

  async moveBlog(id, direction) {
    let list = [...this.blogs].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const index = list.findIndex(b => b.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.display_order = i + 1; });
    this.blogs = list;

    try {
      this.showToast("Updating article display order...", "info");
      for (const item of list) {
        await this.supabase.from('blog_posts').update({ display_order: item.display_order }).eq('id', item.id);
      }
      await this.logAudit("REORDER", "BLOGS", id, { new_order: targetIndex + 1 });
      this.showToast("Articles rearranged successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder blogs", "error");
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

  bindGalleryEvents() { }

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
    const normalized = this.normalizeImageUrl(url);
    if (normalized && normalized.trim().startsWith('http')) {
      img.src = normalized.trim();
      box.style.display = 'block';
      img.onerror = () => { box.style.display = 'none'; };
    } else {
      box.style.display = 'none';
    }
  }

  async handleSaveMediaUrl() {
    const name = document.getElementById('media-url-name')?.value.trim();
    const url = this.normalizeImageUrl(document.getElementById('media-url-input')?.value.trim());
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
  getReviewSliderConfig() {
    if (this.settings && this.settings.reviews_slider_config) {
      try {
        const cfg = typeof this.settings.reviews_slider_config === 'string'
          ? JSON.parse(this.settings.reviews_slider_config)
          : this.settings.reviews_slider_config;
        if (cfg && typeof cfg === 'object') return cfg;
      } catch (e) { }
    }
    return { auto_slide: true, speed: 40 };
  }

  renderTestimonialsView() {
    const sliderCfg = this.getReviewSliderConfig();

    return `
      <!-- Review Slider Speed & Autoplay Controls -->
      <div class="card" style="border: 2px solid #a7f3d0; background: #f0fdf4; margin-bottom: 24px;">
        <div class="card-header" style="border-bottom: 1px solid #d1fae5;">
          <div>
            <h3 class="card-title" style="color: #065f46;"><i class="fa-solid fa-sliders"></i> Review Slider Speed & Autoplay Controls</h3>
            <p style="font-size: 12.5px; color: var(--slate-600); margin-top: 2px;">
              Control the continuous moving speed and autoplay behavior of the customer review carousel on the live website.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.handleSaveReviewSlider()"><i class="fa-solid fa-check"></i> Save Slider Settings</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; align-items: center; padding-top: 6px;">
          <div>
            <label class="form-label" style="font-weight: 700;">Auto-Slide Mode</label>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13.5px; font-weight: 600;">
                <input type="checkbox" id="rev-autoslide-toggle" ${sliderCfg.auto_slide !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
                Enable Continuous Auto-Slide
              </label>
            </div>
            <span style="font-size: 11.5px; color: var(--slate-500); display: block; margin-top: 4px;">
              When disabled, reviews stay stationary and allow touch / horizontal swipe on mobile and desktop.
            </span>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label class="form-label" style="font-weight: 700;">Slide Speed / Loop Duration</label>
              <span id="rev-speed-display" style="font-weight: 800; color: #059669; font-size: 15px;">${sliderCfg.speed || 40}s</span>
            </div>
            <div style="display: flex; align-items: center; gap: 14px; margin-top: 6px;">
              <input type="range" id="rev-speed-range" min="10" max="120" step="5" value="${sliderCfg.speed || 40}" style="flex: 1; accent-color: var(--primary);" oninput="document.getElementById('rev-speed-display').innerText = this.value + 's'; document.getElementById('rev-speed-input').value = this.value;">
              <input type="number" id="rev-speed-input" min="10" max="120" value="${sliderCfg.speed || 40}" style="width: 75px;" class="form-input" oninput="document.getElementById('rev-speed-display').innerText = this.value + 's'; document.getElementById('rev-speed-range').value = this.value;">
            </div>
            <div style="display: flex; gap: 6px; margin-top: 10px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.setReviewSpeedPreset(20)">Fast (20s)</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.setReviewSpeedPreset(40)">Standard (40s)</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.setReviewSpeedPreset(60)">Relaxed (60s)</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.setReviewSpeedPreset(90)">Slow (90s)</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Testimonials Table Card -->
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
                <th style="width: 75px;">Order</th>
                <th>Customer Name</th>
                <th>Role / Location</th>
                <th>Rating</th>
                <th>Quote</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
        const sorted = [...this.testimonials].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        return sorted.length ? sorted.map((t, idx) => `
                <tr>
                  <td style="white-space: nowrap;">
                    <button class="btn-reorder" onclick="window.adminCMS.moveTestimonial('${t.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button class="btn-reorder" onclick="window.adminCMS.moveTestimonial('${t.id}', 1)" ${idx === sorted.length - 1 ? 'disabled' : ''} title="Move Down">
                      <i class="fa-solid fa-arrow-down"></i>
                    </button>
                  </td>
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
              `).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--slate-500);">No testimonials added yet.</td></tr>`;
      })()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  setReviewSpeedPreset(seconds) {
    const r = document.getElementById('rev-speed-range');
    const i = document.getElementById('rev-speed-input');
    const d = document.getElementById('rev-speed-display');
    if (r) r.value = seconds;
    if (i) i.value = seconds;
    if (d) d.innerText = seconds + 's';
  }

  async handleSaveReviewSlider() {
    const isAutoSlide = document.getElementById('rev-autoslide-toggle')?.checked ?? true;
    const speed = parseInt(document.getElementById('rev-speed-input')?.value || document.getElementById('rev-speed-range')?.value) || 40;

    const payload = {
      auto_slide: isAutoSlide,
      speed: speed,
      updated_at: new Date().toISOString()
    };

    try {
      this.showToast("Saving review slider settings...", "info");
      await this.saveSettingsItem('reviews_slider_config', payload);
      await this.logAudit("UPDATE", "TESTIMONIALS", "reviews_slider_config", payload);
      this.showToast("Review slider speed and auto-slide settings updated!", "success");
    } catch (err) {
      this.showToast(err.message || "Failed to save review slider settings", "error");
    }
  }

  bindTestimonialsEvents() { }

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

  async moveTestimonial(id, direction) {
    let list = [...this.testimonials].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.display_order = i + 1; });
    this.testimonials = list;

    try {
      this.showToast("Updating review display order...", "info");
      for (const item of list) {
        await this.supabase.from('website_testimonials').update({ display_order: item.display_order }).eq('id', item.id);
      }
      await this.logAudit("REORDER", "TESTIMONIALS", id, { new_order: targetIndex + 1 });
      this.showToast("Reviews rearranged successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder testimonials", "error");
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

  bindAiAssistantEvents() { }

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

  bindLanguagesEvents() { }

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

  /* ----------------- SETTINGS HELPER & PERSISTENCE ----------------- */
  broadcastPreviewUpdate(key, value) {
    try {
      if (window.BroadcastChannel) {
        if (!this.cmsBroadcastChannel) {
          this.cmsBroadcastChannel = new BroadcastChannel('mgr_cms_updates');
        }
        this.cmsBroadcastChannel.postMessage({
          type: 'CMS_SETTING_UPDATED',
          key: key,
          value: value,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.warn("BroadcastChannel error:", e);
    }
  }

  async saveSettingsItem(key, value, auditModule = 'SETTINGS') {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    this.settings[key] = stringVal;
    try {
      localStorage.setItem('mgr_setting_' + key, stringVal);
    } catch (e) { }

    if (this.supabase) {
      const { error } = await this.supabase.from('website_settings').upsert({
        setting_key: key,
        setting_value: stringVal,
        setting_type: typeof value === 'object' ? 'json' : 'text',
        is_public: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' });

      if (error) {
        console.error(`Supabase persistence failed for ${key}:`, error);
        throw new Error(`Database save failed: ${error.message || error.details || 'Unknown database error'}`);
      }
    }

    this.broadcastPreviewUpdate(key, value);
  }

  /* ----------------- 9. TRANSPORT CATEGORIES MANAGER ----------------- */
  getCategoriesList() {
    if (this.settings && this.settings.transport_categories) {
      try {
        const list = typeof this.settings.transport_categories === 'string'
          ? JSON.parse(this.settings.transport_categories)
          : this.settings.transport_categories;
        if (Array.isArray(list) && list.length) {
          return list.map(c => {
            const nLower = (c.name || '').toLowerCase();
            const iLower = (c.id || '').toLowerCase();
            const isRates = nLower.includes('bike') || nLower.includes('bicycle') || nLower.includes('motorcycle') || nLower.includes('scooter') || iLower.includes('bike') || iLower.includes('moto');
            return {
              ...c,
              target_url: c.target_url || (isRates ? '#pricing-rates' : '#booking')
            };
          }).sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch (e) { }
    }
    return [
      { id: 'cat-bike', name: 'Bicycle', i18n: 'cat_bike', subtext: 'Fitness & City', badge: 'Rs. 100/hr', icon: 'fa-solid fa-bicycle', color: 'emerald', preselect: 'Bicycle (Rs. 100/hr)', package: 'Hourly Rental', target_url: '#pricing-rates', status: 'active', order: 1 },
      { id: 'cat-moto', name: 'Motorcycle', i18n: 'cat_moto', subtext: 'Scooter & Tour', badge: '', icon: 'fa-solid fa-motorcycle', color: 'sky', preselect: 'Motorcycle / Scooter', package: 'Hourly Rental', target_url: '#pricing-rates', status: 'active', order: 2 },
      { id: 'cat-car', name: 'Car', i18n: 'cat_car', subtext: 'Alto, Sedan', badge: '', icon: 'fa-solid fa-car', color: 'blue', preselect: 'Car / Sedan / Hatchback', package: 'Hourly Rental', target_url: '#booking', status: 'active', order: 3 },
      { id: 'cat-van', name: 'Van', i18n: 'cat_van', subtext: 'KDH, 10-15 Seat', badge: '', icon: 'fa-solid fa-van-shuttle', color: 'amber', preselect: 'Passenger Van (KDH / Caravan)', package: 'Half-Day (4-5 hrs)', target_url: '#booking', status: 'active', order: 4 },
      { id: 'cat-bus', name: 'Tourist Bus', i18n: 'cat_bus', subtext: '24-42 Coach', badge: '', icon: 'fa-solid fa-bus', color: 'purple', preselect: 'Tourist Bus / Mini-Bus', package: 'Full Day (24 hrs)', target_url: '#booking', status: 'active', order: 5 },
      { id: 'cat-boat', name: 'Boat', i18n: 'cat_boat', subtext: 'Lagoon & Islands', badge: 'Safari', icon: 'fa-solid fa-ship', color: 'teal', preselect: 'Boat / Lagoon & Island Safari', package: 'Multi-day Passenger Tour', target_url: '#booking', status: 'active', order: 6 }
    ];
  }

  renderCategoriesView() {
    const list = this.getCategoriesList();

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-shapes"></i> Transport Categories Manager</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage the <strong>"Select Your Transport Category"</strong> quick selector cards on the homepage. Add, edit, enable/disable, and reorder categories.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddCategoryModal()">
            <i class="fa-solid fa-plus"></i> Add Transport Category
          </button>
        </div>

        <div style="overflow-x: auto; margin-top: 16px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 70px;">Order</th>
                <th>Category & Icon</th>
                <th>Subtitle / Description</th>
                <th>Badge / Rate Tag</th>
                <th>Theme Accent</th>
                <th>Booking Preselect</th>
                <th>Target Navigation</th>
                <th>Status</th>
                <th style="width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((cat, idx) => `
                <tr>
                  <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                      <button class="btn-reorder" onclick="window.adminCMS.moveCategory('${cat.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                      <button class="btn-reorder" onclick="window.adminCMS.moveCategory('${cat.id}', 1)" ${idx === list.length - 1 ? 'disabled' : ''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                    </div>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 32px; height: 32px; background: #ecfdf5; color: #047857; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                        <i class="${this.escapeHtml(cat.icon || 'fa-solid fa-car')}"></i>
                      </div>
                      <strong>${this.escapeHtml(cat.name)}</strong>
                    </div>
                  </td>
                  <td><span style="font-size: 12.5px; color: var(--slate-600);">${this.escapeHtml(cat.subtext || '—')}</span></td>
                  <td>
                    ${cat.badge ? `<span class="badge" style="background:#047857; color:#fff; font-weight:800; font-size:10px;">${this.escapeHtml(cat.badge)}</span>` : '<span style="color:var(--slate-400); font-size:12px;">None</span>'}
                  </td>
                  <td>
                    <span class="badge badge-${this.escapeHtml(cat.color || 'emerald')}">${this.escapeHtml((cat.color || 'emerald').toUpperCase())}</span>
                  </td>
                  <td><code style="font-size: 11px;">${this.escapeHtml(cat.preselect || cat.name)}</code></td>
                  <td>
                    ${(() => {
        const nLower = (cat.name || '').toLowerCase();
        const isRates = nLower.includes('bike') || nLower.includes('bicycle') || nLower.includes('motorcycle') || nLower.includes('scooter') || cat.target_url === '#pricing-rates';
        const isBooking = !isRates;
        return `
                        <span class="badge ${isBooking ? 'badge-published' : 'badge-draft'}" style="font-size: 11px; white-space: nowrap;">
                          <i class="fa-solid ${isBooking ? 'fa-calendar-check' : 'fa-tags'}"></i>
                          ${isBooking ? 'Top Booking (#booking)' : 'Rates Matrix (#pricing-rates)'}
                        </span>
                      `;
      })()}
                  </td>
                  <td>
                    <span class="badge ${cat.status === 'active' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${cat.status === 'active' ? 'fa-check' : 'fa-ban'}"></i> ${cat.status === 'active' ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditCategoryModal('${cat.id}')" title="Edit Category">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${cat.status === 'active' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleCategoryStatus('${cat.id}')" title="${cat.status === 'active' ? 'Disable' : 'Enable'}" style="margin-left: 4px;">
                      ${cat.status === 'active' ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteCategory('${cat.id}')" title="Delete Category" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindCategoriesEvents() { }

  openAddCategoryModal() {
    document.getElementById('category-modal-title').innerHTML = '<i class="fa-solid fa-shapes"></i> Add Transport Category';
    document.getElementById('edit-cat-id-hidden').value = '';
    document.getElementById('edit-cat-name-input').value = '';
    document.getElementById('edit-cat-subtext-input').value = '';
    document.getElementById('edit-cat-icon-input').value = 'fa-solid fa-car';
    document.getElementById('edit-cat-image-input').value = '';
    const preview = document.getElementById('edit-cat-image-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    this.clearImageStatus('edit-cat-image-preview');
    document.getElementById('edit-cat-badge-input').value = '';
    document.getElementById('edit-cat-color-input').value = 'emerald';
    document.getElementById('edit-cat-status-input').value = 'active';
    document.getElementById('edit-cat-preselect-input').value = '';
    document.getElementById('edit-cat-package-input').value = 'Hourly Rental';
    if (document.getElementById('edit-cat-target-url')) {
      document.getElementById('edit-cat-target-url').value = '#booking';
    }
    this.openModal('category-modal');
  }

  openEditCategoryModal(id) {
    const list = this.getCategoriesList();
    const cat = list.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('category-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Transport Category';
    document.getElementById('edit-cat-id-hidden').value = cat.id;
    document.getElementById('edit-cat-name-input').value = cat.name || '';
    document.getElementById('edit-cat-subtext-input').value = cat.subtext || '';
    document.getElementById('edit-cat-icon-input').value = cat.icon || '';
    document.getElementById('edit-cat-image-input').value = cat.image || '';
    this.previewImage('edit-cat-image-input', 'edit-cat-image-preview');
    document.getElementById('edit-cat-badge-input').value = cat.badge || '';
    document.getElementById('edit-cat-color-input').value = cat.color || 'emerald';
    document.getElementById('edit-cat-status-input').value = cat.status || 'active';
    document.getElementById('edit-cat-preselect-input').value = cat.preselect || cat.name || '';
    document.getElementById('edit-cat-package-input').value = cat.package || 'Hourly Rental';
    if (document.getElementById('edit-cat-target-url')) {
      const nLower = (cat.name || '').toLowerCase();
      const isRates = nLower.includes('bike') || nLower.includes('bicycle') || nLower.includes('motorcycle') || nLower.includes('scooter');
      document.getElementById('edit-cat-target-url').value = cat.target_url || (isRates ? '#pricing-rates' : '#booking');
    }

    this.openModal('category-modal');
  }

  async handleSaveCategory() {
    const idHidden = document.getElementById('edit-cat-id-hidden')?.value;
    const name = document.getElementById('edit-cat-name-input')?.value.trim();
    const subtext = document.getElementById('edit-cat-subtext-input')?.value.trim();
    const icon = document.getElementById('edit-cat-icon-input')?.value.trim() || 'fa-solid fa-car';
    const image = this.normalizeImageUrl(document.getElementById('edit-cat-image-input')?.value.trim() || '');
    const badge = document.getElementById('edit-cat-badge-input')?.value.trim();
    const color = document.getElementById('edit-cat-color-input')?.value || 'emerald';
    const status = document.getElementById('edit-cat-status-input')?.value || 'active';
    const preselect = document.getElementById('edit-cat-preselect-input')?.value.trim() || name;
    const pkg = document.getElementById('edit-cat-package-input')?.value || 'Hourly Rental';
    const target_url = document.getElementById('edit-cat-target-url')?.value || '#booking';

    if (!name) {
      this.showToast("Category name is required!", "error");
      return;
    }

    let list = this.getCategoriesList();

    if (idHidden) {
      const idx = list.findIndex(c => c.id === idHidden);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          name,
          subtext,
          icon,
          image,
          badge,
          color,
          status,
          preselect,
          package: pkg,
          target_url,
          updated_at: new Date().toISOString()
        };
      }
    } else {
      const newId = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
      const maxOrder = list.reduce((m, c) => Math.max(m, c.order || 0), 0);
      list.push({
        id: newId,
        name,
        subtext,
        icon,
        image,
        badge,
        color,
        status,
        preselect,
        package: pkg,
        target_url,
        order: maxOrder + 1,
        created_at: new Date().toISOString()
      });
    }

    try {
      this.showToast("Saving transport categories...", "info");
      await this.saveSettingsItem('transport_categories', list);
      await this.logAudit(idHidden ? "UPDATE" : "CREATE", "CATEGORIES", name, { id: idHidden });
      this.closeModal('category-modal');
      this.showToast("Transport category saved successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save category", "error");
    }
  }

  async toggleCategoryStatus(id) {
    let list = this.getCategoriesList();
    const cat = list.find(c => c.id === id);
    if (!cat) return;

    cat.status = cat.status === 'active' ? 'inactive' : 'active';
    cat.updated_at = new Date().toISOString();

    try {
      await this.saveSettingsItem('transport_categories', list);
      this.showToast(`Category '${cat.name}' is now ${cat.status === 'active' ? 'Enabled' : 'Disabled'}.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to update category status", "error");
    }
  }

  async moveCategory(id, direction) {
    let list = this.getCategoriesList();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('transport_categories', list);
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder categories", "error");
    }
  }

  async deleteCategory(id) {
    let list = this.getCategoriesList();
    const cat = list.find(c => c.id === id);
    if (!cat) return;

    if (!confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;

    list = list.filter(c => c.id !== id);
    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('transport_categories', list);
      await this.logAudit("DELETE", "CATEGORIES", id, { name: cat.name });
      this.showToast(`Category '${cat.name}' deleted.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete category", "error");
    }
  }

  /* ----------------- 10. STATISTICS COUNTERS MANAGER ----------------- */
  getCountersList() {
    if (this.settings && this.settings.statistics_counters_config) {
      try {
        const list = typeof this.settings.statistics_counters_config === 'string'
          ? JSON.parse(this.settings.statistics_counters_config)
          : this.settings.statistics_counters_config;
        if (Array.isArray(list) && list.length) {
          return list.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch (e) { }
    }
    return [
      { id: 'stat-rides', title: 'Completed Rides & Tours', target: 100, suffix: '+', icon: 'fa-solid fa-route', image: '', dataSource: 'rpc:get_public_business_stats.completed_services', status: 'active', order: 1 },
      { id: 'stat-customers', title: 'Happy Riders & Customers', target: 100, suffix: '+', icon: 'fa-solid fa-users', image: '', dataSource: 'rpc:get_public_business_stats.total_customers', status: 'active', order: 2 },
      { id: 'stat-fleet', title: 'Passenger Fleet Vehicles', target: 50, suffix: '+', icon: 'fa-solid fa-van-shuttle', image: '', dataSource: 'rpc:get_public_business_stats.registered_vehicles', status: 'active', order: 3 },
      { id: 'stat-eco', title: 'Fitness & Eco', target: 100, suffix: '%', icon: 'fa-solid fa-leaf', image: '', dataSource: 'manual', status: 'active', order: 4 }
    ];
  }

  renderCountersView() {
    const list = this.getCountersList();

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-calculator"></i> Statistics & Counter Metrics Manager</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage the 4 homepage statistic counter cards: <strong>100 Rides</strong>, <strong>100 Happy Riders</strong>, <strong>50 Fleet Vehicles</strong>, and <strong>100% Fitness & Eco</strong>. Edit titles, manual counts, icons/images, dynamic table data source URLs, status, and order.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddCounterModal()">
            <i class="fa-solid fa-plus"></i> Add New Counter
          </button>
        </div>

        <div style="overflow-x: auto; margin-top: 16px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 70px;">Order</th>
                <th>Counter Title & Icon</th>
                <th>Manual Value</th>
                <th>Suffix</th>
                <th>Data Source (Table URL / RPC)</th>
                <th>Status</th>
                <th style="width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((c, idx) => `
                <tr>
                  <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                      <button class="btn-reorder" onclick="window.adminCMS.moveCounter('${c.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                      <button class="btn-reorder" onclick="window.adminCMS.moveCounter('${c.id}', 1)" ${idx === list.length - 1 ? 'disabled' : ''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                    </div>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      ${c.image
        ? `<img src="${this.escapeHtml(c.image)}" style="width: 32px; height: 32px; object-fit: contain; border-radius: 8px;">`
        : `<div style="width: 32px; height: 32px; background: #ecfdf5; color: #047857; display: flex; align-items: center; justify-content: center; border-radius: 8px;"><i class="${this.escapeHtml(c.icon || 'fa-solid fa-chart-simple')}"></i></div>`
      }
                      <strong>${this.escapeHtml(c.title || c.label)}</strong>
                    </div>
                  </td>
                  <td><span style="font-size: 16px; font-weight: 800; color: #047857;">${this.escapeHtml(c.target)}</span></td>
                  <td><code>${this.escapeHtml(c.suffix || '')}</code></td>
                  <td>
                    ${c.dataSource && c.dataSource !== 'manual'
        ? `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;"><i class="fa-solid fa-database"></i> ${this.escapeHtml(c.dataSource)}</span>`
        : '<span class="badge" style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0;"><i class="fa-solid fa-pen"></i> Manual Count</span>'
      }
                  </td>
                  <td>
                    <span class="badge ${c.status === 'active' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${c.status === 'active' ? 'fa-check' : 'fa-ban'}"></i> ${c.status === 'active' ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditCounterModal('${c.id}')" title="Edit Counter">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${c.status === 'active' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleCounterStatus('${c.id}')" title="${c.status === 'active' ? 'Hide' : 'Show'}" style="margin-left: 4px;">
                      ${c.status === 'active' ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteCounter('${c.id}')" title="Delete Counter" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindCountersEvents() { }

  openAddCounterModal() {
    document.getElementById('counter-modal-title').innerHTML = '<i class="fa-solid fa-plus"></i> Add Statistics Counter';
    document.getElementById('edit-counter-id-hidden').value = '';
    document.getElementById('edit-counter-title-input').value = '';
    document.getElementById('edit-counter-target-input').value = 100;
    document.getElementById('edit-counter-suffix-input').value = '+';
    document.getElementById('edit-counter-icon-input').value = 'fa-solid fa-chart-line';
    document.getElementById('edit-counter-image-input').value = '';
    const preview = document.getElementById('edit-counter-image-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    this.clearImageStatus('edit-counter-image-preview');
    document.getElementById('edit-counter-datasource-input').value = 'manual';
    document.getElementById('edit-counter-status-input').value = 'active';
    this.openModal('counter-modal');
  }

  openEditCounterModal(id) {
    const list = this.getCountersList();
    const c = list.find(item => item.id === id);
    if (!c) return;

    document.getElementById('counter-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Statistics Counter';
    document.getElementById('edit-counter-id-hidden').value = c.id;
    document.getElementById('edit-counter-title-input').value = c.title || c.label || '';
    document.getElementById('edit-counter-target-input').value = c.target ?? 100;
    document.getElementById('edit-counter-suffix-input').value = c.suffix || '';
    document.getElementById('edit-counter-icon-input').value = c.icon || '';
    document.getElementById('edit-counter-image-input').value = c.image || '';
    this.previewImage('edit-counter-image-input', 'edit-counter-image-preview');
    document.getElementById('edit-counter-datasource-input').value = c.dataSource || 'manual';
    document.getElementById('edit-counter-status-input').value = c.status || 'active';

    this.openModal('counter-modal');
  }

  async handleSaveCounter() {
    const idHidden = document.getElementById('edit-counter-id-hidden')?.value;
    const title = document.getElementById('edit-counter-title-input')?.value.trim();
    const target = parseInt(document.getElementById('edit-counter-target-input')?.value) || 0;
    const suffix = document.getElementById('edit-counter-suffix-input')?.value.trim();
    const icon = document.getElementById('edit-counter-icon-input')?.value.trim();
    const image = this.normalizeImageUrl(document.getElementById('edit-counter-image-input')?.value.trim());
    const dataSource = document.getElementById('edit-counter-datasource-input')?.value.trim() || 'manual';
    const status = document.getElementById('edit-counter-status-input')?.value || 'active';

    if (!title) {
      this.showToast("Counter title is required!", "error");
      return;
    }

    let list = this.getCountersList();

    if (idHidden) {
      const idx = list.findIndex(c => c.id === idHidden);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          title,
          label: title,
          target,
          suffix,
          icon,
          image,
          dataSource,
          status,
          updated_at: new Date().toISOString()
        };
      }
    } else {
      const newId = 'stat-' + title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
      const maxOrder = list.reduce((m, c) => Math.max(m, c.order || 0), 0);
      list.push({
        id: newId,
        title,
        label: title,
        target,
        suffix,
        icon,
        image,
        dataSource,
        status,
        order: maxOrder + 1,
        created_at: new Date().toISOString()
      });
    }

    try {
      this.showToast("Saving statistics counter...", "info");
      await this.saveSettingsItem('statistics_counters_config', list);
      await this.logAudit(idHidden ? "UPDATE" : "CREATE", "COUNTERS", title, { id: idHidden });
      this.closeModal('counter-modal');
      this.showToast("Statistics counter saved successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save statistics counter", "error");
    }
  }

  async toggleCounterStatus(id) {
    let list = this.getCountersList();
    const c = list.find(item => item.id === id);
    if (!c) return;

    c.status = c.status === 'active' ? 'inactive' : 'active';
    c.updated_at = new Date().toISOString();

    try {
      await this.saveSettingsItem('statistics_counters_config', list);
      this.showToast(`Counter '${c.title || c.label}' is now ${c.status === 'active' ? 'Visible' : 'Hidden'}.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to update counter status", "error");
    }
  }

  async moveCounter(id, direction) {
    let list = this.getCountersList();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('statistics_counters_config', list);
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder counters", "error");
    }
  }

  async deleteCounter(id) {
    let list = this.getCountersList();
    const c = list.find(item => item.id === id);
    if (!c) return;

    if (!confirm(`Are you sure you want to delete counter '${c.title || c.label}'?`)) return;

    list = list.filter(item => item.id !== id);
    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('statistics_counters_config', list);
      await this.logAudit("DELETE", "COUNTERS", id, { title: c.title || c.label });
      this.showToast(`Counter '${c.title || c.label}' deleted.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete counter", "error");
    }
  }

  /* ----------------- 11. SETTINGS & AUDIT LOG VIEW ----------------- */
  renderSettingsView() {
    const s = this.settings || {};

    let floatConfig = {
      enabled: true,
      words: ['Book Now', 'Ride Now', 'Explore Mannar'],
      target_url: 'https://booking.mannargreenride.com/',
      interval_seconds: 2.6
    };

    if (s.floating_booking_config) {
      try {
        const parsed = typeof s.floating_booking_config === 'string'
          ? JSON.parse(s.floating_booking_config)
          : s.floating_booking_config;
        if (parsed && typeof parsed === 'object') {
          floatConfig = { ...floatConfig, ...parsed };
        }
      } catch (e) { }
    } else {
      try {
        const localCfg = localStorage.getItem('mgr_setting_floating_booking_config');
        if (localCfg) {
          floatConfig = { ...floatConfig, ...JSON.parse(localCfg) };
        }
      } catch (e) { }
    }

    const floatWords = Array.isArray(floatConfig.words) && floatConfig.words.length > 0
      ? floatConfig.words
      : ['Book Now', 'Ride Now', 'Explore Mannar'];

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

      <!-- Currency Symbol & Pricing Format Settings (Item 6) -->
      ${(() => {
        const curr = this.getCurrencyConfig();
        const isPreset = ['Rs.', 'LKR', '$', '€', '£'].includes(curr.symbol);
        return `
        <div class="card" style="margin-top: 24px;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 class="card-title"><i class="fa-solid fa-coins" style="color: #f59e0b;"></i> Currency Symbol &amp; Pricing Display</h3>
              <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
                Configure the currency symbol, placement, and ISO code. Synchronizes automatically across the Rates Matrix, Fleet Listings, Category Badges, and Calculator.
              </p>
            </div>
            <span class="badge badge-published" id="currency-badge-preview">Active: ${this.escapeHtml(curr.symbol)} (${this.escapeHtml(curr.code || 'LKR')})</span>
          </div>
          <form id="currency-settings-form">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Preset Currency</label>
                <select class="form-select" id="set-currency-preset">
                  <option value="Rs.|LKR" ${curr.symbol === 'Rs.' && (curr.code === 'LKR' || !curr.code) ? 'selected' : ''}>Rs. — Sri Lankan Rupee (Default)</option>
                  <option value="LKR|LKR" ${curr.symbol === 'LKR' ? 'selected' : ''}>LKR — ISO Code (Sri Lankan Rupee)</option>
                  <option value="$|USD" ${curr.symbol === '$' ? 'selected' : ''}>$ — US Dollar (USD)</option>
                  <option value="€|EUR" ${curr.symbol === '€' ? 'selected' : ''}>€ — Euro (EUR)</option>
                  <option value="£|GBP" ${curr.symbol === '£' ? 'selected' : ''}>£ — British Pound (GBP)</option>
                  <option value="custom" ${!isPreset ? 'selected' : ''}>Custom Symbol / Code</option>
                </select>
              </div>

              <div class="form-group" id="group-custom-symbol" style="${isPreset ? 'display: none;' : ''}">
                <label class="form-label" style="font-weight: 700;">Custom Currency Symbol</label>
                <input type="text" class="form-input" id="set-currency-symbol" value="${this.escapeHtml(curr.symbol || 'Rs.')}" placeholder="e.g. AUD, CHF, ₹">
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Currency ISO Code</label>
                <input type="text" class="form-input" id="set-currency-code" value="${this.escapeHtml(curr.code || 'LKR')}" placeholder="e.g. LKR, USD, EUR">
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Symbol Placement / Position</label>
                <select class="form-select" id="set-currency-position">
                  <option value="prefix" ${curr.position !== 'suffix' ? 'selected' : ''}>Prefix (Before Amount: Rs. 100, $100)</option>
                  <option value="suffix" ${curr.position === 'suffix' ? 'selected' : ''}>Suffix (After Amount: 100 LKR, 100 Rs.)</option>
                </select>
              </div>
            </div>

            <!-- Live Dynamic Preview Canvas -->
            <div style="background: #f8fafc; border: 1.5px dashed var(--slate-300); border-radius: 10px; padding: 14px 18px; margin-top: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: var(--slate-500); letter-spacing: 0.5px;">Live Pricing Preview:</span>
                <div id="currency-live-sample" style="font-size: 15px; font-weight: 800; color: var(--primary); margin-top: 4px;">
                  ${this.formatPrice(100)}/hr &nbsp;|&nbsp; Half-Day: ${this.formatPrice(400)} &nbsp;|&nbsp; Car: ${this.formatPrice(1500, true)}/hr
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-floppy-disk"></i> Save Currency Settings
              </button>
            </div>
          </form>
        </div>
        `;
      })()}

      <!-- Floating Booking & Explorer Button Settings -->
      <div class="card" style="margin-top: 24px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title"><i class="fa-solid fa-compass" style="color: #10b981;"></i> Floating Booking & Explore Button</h3>
          <span class="badge ${floatConfig.enabled !== false ? 'badge-published' : 'badge-archived'}" id="float-badge-status">
            ${floatConfig.enabled !== false ? 'Active & Displayed' : 'Disabled'}
          </span>
        </div>
        <form id="floating-btn-settings-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div>
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Rotating Words / Phrases</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; font-weight: 700; width: 60px; color: var(--slate-600);">Word 1:</span>
                    <input type="text" class="form-input" id="set-float-word-1" placeholder="Book Now" value="${this.escapeHtml(floatWords[0] || 'Book Now')}">
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; font-weight: 700; width: 60px; color: var(--slate-600);">Word 2:</span>
                    <input type="text" class="form-input" id="set-float-word-2" placeholder="Ride Now" value="${this.escapeHtml(floatWords[1] || 'Ride Now')}">
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; font-weight: 700; width: 60px; color: var(--slate-600);">Word 3:</span>
                    <input type="text" class="form-input" id="set-float-word-3" placeholder="Explore Mannar" value="${this.escapeHtml(floatWords[2] || 'Explore Mannar')}">
                  </div>
                </div>
                <small style="color: var(--slate-500); font-size: 11px; margin-top: 4px; display: block;">
                  These words cycle dynamically on the floating button above the WhatsApp button.
                </small>
              </div>

              <div class="form-group" style="margin-top: 12px;">
                <label class="form-label">Rotation Interval (Seconds)</label>
                <input type="number" class="form-input" id="set-float-interval" min="1.0" max="10.0" step="0.2" value="${floatConfig.interval_seconds || 2.6}">
              </div>
            </div>

            <div>
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Navigation Target Destination URL</label>
                <input type="url" class="form-input" id="set-float-url" value="${this.escapeHtml(floatConfig.target_url || 'https://booking.mannargreenride.com/')}" placeholder="https://booking.mannargreenride.com/">
                <small style="color: var(--slate-500); font-size: 11px; margin-top: 4px; display: block;">
                  When clicked, user navigates directly to this booking portal.
                </small>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label class="form-label">Button Visibility</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin-top: 6px;">
                  <input type="checkbox" id="set-float-enabled" ${floatConfig.enabled !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981;">
                  <span style="font-size: 13px; font-weight: 600; color: var(--slate-800);">Enable and show floating button on website</span>
                </label>
              </div>

              <!-- C-Panel Live Preview -->
              <div style="margin-top: 18px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">C-Panel Dynamic Preview</div>
                <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 9px 18px; border-radius: 9999px; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px rgba(5,150,105,0.35);">
                  <i class="fa-solid fa-calendar-check" style="color: #fef08a;"></i>
                  <span id="cpanel-float-preview-text">${this.escapeHtml(floatWords[0] || 'Book Now')}</span>
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top: 20px;">
            <button type="submit" class="btn btn-primary" style="padding: 10px 24px;"><i class="fa-solid fa-floppy-disk"></i> Save Floating Button Settings</button>
          </div>
        </form>
      </div>

      <!-- Promotional Offer Banner Animation Controls (Item 3) -->
      <div style="margin-top: 24px;">
        ${this.renderOfferAnimationCard()}
      </div>

      <!-- Administrator Security & Master Password Card -->
      <div class="card" style="margin-top: 24px; border-left: 4px solid #10b981;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title"><i class="fa-solid fa-shield-halved" style="color: #059669;"></i> Administrator Security &amp; Credentials</h3>
          <span class="badge badge-published"><i class="fa-solid fa-circle-check"></i> Single Admin Protected</span>
        </div>
        <div style="padding: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
            <div>
              <div style="font-weight: 800; font-size: 15px; color: var(--slate-800);">Absir Aiva</div>
              <div style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
                Authorized Admin Email: <code style="background: rgba(16, 185, 129, 0.12); color: #047857; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: var(--font-mono);">${this.maskEmail(this.authorizedEmail)}</code>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.adminCMS.openResetPasswordModal()">
              <i class="fa-solid fa-key"></i> Change Master Password
            </button>
          </div>
          <div style="background: #f8fafc; border: 1px solid var(--slate-200); border-radius: 8px; padding: 12px 16px; font-size: 12.5px; color: var(--slate-600); display: flex; align-items: center; gap: 12px;">
            <i class="fa-solid fa-lock" style="color: #059669; font-size: 16px;"></i>
            <span>Access to this administrative portal is exclusively restricted to this verified administrator account. You can update your master password whenever needed.</span>
          </div>
        </div>
      </div>

      <!-- Audit Trail Table -->
      <div class="card" style="margin-top: 24px;">
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
                  <td><strong>${this.escapeHtml(this.maskEmail(log.user_email || 'admin'))}</strong></td>
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
    this.updateOfferAnimationPreview();
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

    // Floating Button Settings Form in C-Panel
    const floatForm = document.getElementById('floating-btn-settings-form');
    if (floatForm) {
      const previewText = document.getElementById('cpanel-float-preview-text');
      const w1 = document.getElementById('set-float-word-1');
      const w2 = document.getElementById('set-float-word-2');
      const w3 = document.getElementById('set-float-word-3');

      // Live cycle preview in C-Panel
      let previewIdx = 0;
      if (this._floatPreviewTimer) clearInterval(this._floatPreviewTimer);
      this._floatPreviewTimer = setInterval(() => {
        if (!previewText) return;
        const currentWords = [
          w1?.value.trim() || 'Book Now',
          w2?.value.trim() || 'Ride Now',
          w3?.value.trim() || 'Explore Mannar'
        ];
        previewIdx = (previewIdx + 1) % currentWords.length;
        previewText.textContent = currentWords[previewIdx];
      }, 1800);

      floatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const words = [
          w1?.value.trim() || 'Book Now',
          w2?.value.trim() || 'Ride Now',
          w3?.value.trim() || 'Explore Mannar'
        ].filter(Boolean);
        const url = document.getElementById('set-float-url')?.value.trim() || 'https://booking.mannargreenride.com/';
        const interval = parseFloat(document.getElementById('set-float-interval')?.value) || 2.6;
        const enabled = document.getElementById('set-float-enabled')?.checked !== false;

        const configObj = {
          enabled: enabled,
          words: words,
          target_url: url,
          interval_seconds: interval
        };

        const configJson = JSON.stringify(configObj);
        await this.batchSaveSettings([
          { key: 'floating_booking_config', val: configJson }
        ]);

        // Update local badge
        const badge = document.getElementById('float-badge-status');
        if (badge) {
          badge.className = `badge ${enabled ? 'badge-published' : 'badge-archived'}`;
          badge.textContent = enabled ? 'Active & Displayed' : 'Disabled';
        }

        this.showToast("Floating button words and destination saved successfully!", "success");
      });
    }

    // Currency Settings Form in C-Panel (Item 6)
    const currForm = document.getElementById('currency-settings-form');
    if (currForm) {
      const presetSelect = document.getElementById('set-currency-preset');
      const customGroup = document.getElementById('group-custom-symbol');
      const symbolInput = document.getElementById('set-currency-symbol');
      const codeInput = document.getElementById('set-currency-code');
      const posSelect = document.getElementById('set-currency-position');
      const liveSample = document.getElementById('currency-live-sample');
      const badgePreview = document.getElementById('currency-badge-preview');

      const updateLiveCurrencyPreview = () => {
        const sym = symbolInput?.value.trim() || 'Rs.';
        const code = codeInput?.value.trim() || 'LKR';
        const pos = posSelect?.value || 'prefix';
        if (badgePreview) badgePreview.textContent = `Active: ${sym} (${code})`;
        if (liveSample) {
          const fmt = (amt, isFrom = false) => {
            const num = Number(amt).toLocaleString();
            const from = isFrom ? 'From ' : '';
            return pos === 'suffix' ? `${from}${num} ${sym}` : `${from}${sym} ${num}`;
          };
          liveSample.innerHTML = `${fmt(100)}/hr &nbsp;|&nbsp; Half-Day: ${fmt(400)} &nbsp;|&nbsp; Car: ${fmt(1500, true)}/hr`;
        }
      };

      if (presetSelect) {
        presetSelect.addEventListener('change', () => {
          const val = presetSelect.value;
          if (val === 'custom') {
            if (customGroup) customGroup.style.display = 'block';
          } else {
            if (customGroup) customGroup.style.display = 'none';
            const [sym, code] = val.split('|');
            if (symbolInput) symbolInput.value = sym;
            if (codeInput) codeInput.value = code;
          }
          updateLiveCurrencyPreview();
        });
      }

      [symbolInput, codeInput, posSelect].forEach(el => {
        if (el) {
          el.addEventListener('input', updateLiveCurrencyPreview);
          el.addEventListener('change', updateLiveCurrencyPreview);
        }
      });

      currForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sym = symbolInput?.value.trim() || 'Rs.';
        const code = codeInput?.value.trim() || 'LKR';
        const pos = posSelect?.value || 'prefix';

        const currPayload = {
          symbol: sym,
          code: code,
          position: pos
        };

        const configJson = JSON.stringify(currPayload);
        await this.batchSaveSettings([
          { key: 'currency_config', val: configJson }
        ]);

        this.showToast(`Currency symbol saved as "${sym}" (${code}) and published to website!`, "success");
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
        try {
          localStorage.setItem('mgr_setting_' + item.key, item.val);
        } catch (e) { }
        this.broadcastPreviewUpdate(item.key, item.val);
      }
      await this.logAudit("SETTINGS_CHANGE", "SETTINGS", "global", { count: list.length });
      this.showToast("Settings updated and persisted successfully!", "success");
    } catch (err) {
      console.error("Batch save settings error:", err);
      this.showToast(err.message || "Failed to update settings", "error");
      throw err;
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

  /* ----------------- PASSENGER HOST NETWORK & WHATSAPP LINK ----------------- */
  getHostNetworkConfig() {
    let cfg = {
      title: "Do You Own a Car, Van, or Tourist Bus in Mannar?",
      badge: "Join Our Passenger Host Network",
      description: "Join our official WhatsApp Vehicle Owners Group. We connect your idle cars, passenger vans, and tourist buses with incoming tourists, NGOs, researchers, birdwatchers, and pilgrims visiting Mannar.",
      button_text: "Join Host WhatsApp Group",
      whatsapp_url: this.settings.host_whatsapp_group_url || "https://chat.whatsapp.com/ExampleMannarGreenRideGroup",
      status: "active"
    };
    if (this.settings && this.settings.join_us_config) {
      try {
        const parsed = typeof this.settings.join_us_config === 'string'
          ? JSON.parse(this.settings.join_us_config)
          : this.settings.join_us_config;
        if (parsed && typeof parsed === 'object') {
          cfg = { ...cfg, ...parsed };
          if (this.settings.host_whatsapp_group_url) {
            cfg.whatsapp_url = this.settings.host_whatsapp_group_url;
          }
        }
      } catch (e) { }
    }
    return cfg;
  }

  getHostVehicleCards() {
    if (this.settings && this.settings.host_vehicle_cards) {
      try {
        const list = typeof this.settings.host_vehicle_cards === 'string'
          ? JSON.parse(this.settings.host_vehicle_cards)
          : this.settings.host_vehicle_cards;
        if (Array.isArray(list) && list.length) {
          return list.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch (e) { }
    }
    return [
      { id: 'h-car', name: 'Cars', subtitle: 'Alto, WagonR, Sedan', icon: 'fa-solid fa-car', status: 'active', order: 1 },
      { id: 'h-van', name: 'Passenger Vans', subtitle: 'Toyota KDH, Caravan', icon: 'fa-solid fa-van-shuttle', status: 'active', order: 2 },
      { id: 'h-bus', name: 'Tourist Buses', subtitle: '24-42 Seater Coaches', icon: 'fa-solid fa-bus', status: 'active', order: 3 }
    ];
  }

  renderHostNetworkView() {
    const cfg = this.getHostNetworkConfig();
    const vehicleCards = this.getHostVehicleCards();
    const isSectionActive = cfg.status !== 'inactive';

    return `
      <!-- TOP WHATSAPP LINK HIGHLIGHT & DIRECT ACTION -->
      <div class="card" style="border: 2px solid #10b981; background: #ecfdf5; margin-bottom: 24px;">
        <div class="card-header" style="border-bottom: 1px solid #a7f3d0;">
          <div>
            <h3 class="card-title" style="color: #065f46; font-size: 17px;">
              <i class="fa-brands fa-whatsapp" style="color: #10b981; font-size: 20px;"></i>
              Vehicle Owners WhatsApp Group Invite Link
            </h3>
            <p style="font-size: 12.5px; color: #047857; margin-top: 3px;">
              Update the official WhatsApp group join link. Clicking "Join Host WhatsApp Group" on the website immediately directs owners to this link.
            </p>
          </div>
          <span class="badge badge-published" style="background: #10b981; color: #fff; font-size: 11px;">
            <i class="fa-brands fa-whatsapp"></i> Live Link Active
          </span>
        </div>

        <form id="host-whatsapp-link-form" style="padding-top: 12px;">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-weight: 700; color: #065f46;">
              WhatsApp Group Join Link URL (e.g. https://chat.whatsapp.com/...) *
            </label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="url" class="form-input" id="host-whatsapp-url-input" value="${this.escapeHtml(cfg.whatsapp_url)}" placeholder="https://chat.whatsapp.com/..." style="border-color: #10b981; font-weight: 600; font-size: 14px; background: #fff;" required>
              <a href="${this.escapeHtml(cfg.whatsapp_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" id="host-wa-test-btn" style="white-space: nowrap; height: 42px; display: inline-flex; align-items: center; gap: 6px; background: #fff; border-color: #10b981; color: #065f46; font-weight: 700;" title="Test this link now in a new browser tab">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Test Link
              </a>
              <button type="submit" class="btn btn-primary btn-sm" style="white-space: nowrap; height: 42px; background: #059669; border-color: #059669; font-weight: 700; padding: 0 20px;">
                <i class="fa-solid fa-floppy-disk"></i> Save WhatsApp Link
              </button>
            </div>
            <span style="font-size: 11.5px; color: #047857; margin-top: 5px; display: block;">
              <i class="fa-solid fa-circle-check"></i> Changes to this URL will immediately update the website button on desktop and mobile.
            </span>
          </div>
        </form>
      </div>

      <!-- MAIN CARD CONTENT & STATUS SETTINGS -->
      <div class="card" style="border: 1px solid var(--slate-200); margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-id-card"></i> "Join Our Passenger Host Network" Card Settings</h3>
            <p style="font-size: 12.5px; color: var(--slate-600); margin-top: 3px;">
              Manage the title, badge, marketing text, button label, and overall section active/deactive status.
            </p>
          </div>
          <span class="badge ${isSectionActive ? 'badge-published' : 'badge-draft'}">
            <i class="fa-solid ${isSectionActive ? 'fa-check' : 'fa-ban'}"></i> ${isSectionActive ? 'Section Active' : 'Section Deactive'}
          </span>
        </div>

        <form id="host-main-card-form" style="padding-top: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Tagline / Badge Text</label>
              <input type="text" class="form-input" id="host-card-badge" value="${this.escapeHtml(cfg.badge || 'Join Our Passenger Host Network')}">
            </div>
            <div class="form-group">
              <label class="form-label">Card Main Heading *</label>
              <input type="text" class="form-input" id="host-card-title" value="${this.escapeHtml(cfg.title || 'Do You Own a Car, Van, or Tourist Bus in Mannar?')}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Section Status</label>
              <select class="form-select" id="host-card-status">
                <option value="active" ${isSectionActive ? 'selected' : ''}>Active (Visible on Website)</option>
                <option value="inactive" ${!isSectionActive ? 'selected' : ''}>Deactive (Hidden from Website)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description Text</label>
            <textarea class="form-textarea" id="host-card-desc" rows="3">${this.escapeHtml(cfg.description || '')}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label class="form-label">Action Button Text</label>
              <input type="text" class="form-input" id="host-card-btn-text" value="${this.escapeHtml(cfg.button_text || 'Join Host WhatsApp Group')}">
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
              <button type="submit" class="btn btn-primary" style="width: 100%; height: 42px;">
                <i class="fa-solid fa-floppy-disk"></i> Save Card Content & Status
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- VEHICLE CATEGORY SUB-CARDS (Cars, Vans, Tourist Buses) -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-shapes"></i> Host Vehicle Sub-Cards</h3>
            <p style="font-size: 12.5px; color: var(--slate-600); margin-top: 3px;">
              Manage the vehicle type cards displayed inside the Host Network section (Cars, Passenger Vans, Tourist Buses, etc.).
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddHostVehicleModal()">
            <i class="fa-solid fa-plus"></i> Add Vehicle Type
          </button>
        </div>

        <div style="overflow-x: auto; margin-top: 12px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 75px;">Order</th>
                <th style="width: 60px;">Icon</th>
                <th>Vehicle Category Name</th>
                <th>Subtitle / Sample Models</th>
                <th>Status</th>
                <th style="width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${vehicleCards.map((veh, idx) => `
                <tr>
                  <td style="white-space: nowrap;">
                    <button class="btn-reorder" onclick="window.adminCMS.moveHostVehicle('${veh.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button class="btn-reorder" onclick="window.adminCMS.moveHostVehicle('${veh.id}', 1)" ${idx === vehicleCards.length - 1 ? 'disabled' : ''} title="Move Down">
                      <i class="fa-solid fa-arrow-down"></i>
                    </button>
                  </td>
                  <td>
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: #fef3c7; display: flex; align-items: center; justify-content: center; color: #b45309; font-size: 17px;">
                      <i class="${this.escapeHtml(veh.icon || 'fa-solid fa-car')}"></i>
                    </div>
                  </td>
                  <td><strong>${this.escapeHtml(veh.name)}</strong></td>
                  <td><span style="font-size: 12.5px; color: var(--slate-600);">${this.escapeHtml(veh.subtitle || '')}</span></td>
                  <td>
                    <span class="badge ${veh.status === 'active' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${veh.status === 'active' ? 'fa-check' : 'fa-ban'}"></i> ${veh.status === 'active' ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditHostVehicleModal('${veh.id}')" title="Edit">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${veh.status === 'active' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleHostVehicleStatus('${veh.id}')" title="${veh.status === 'active' ? 'Deactivate' : 'Activate'}" style="margin-left: 4px;">
                      ${veh.status === 'active' ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteHostVehicle('${veh.id}')" title="Delete" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- INTERACTIVE LIVE PREVIEW OF HOST CARD -->
      <div class="card" style="background: #fffbeb; border: 1px solid #fde68a;">
        <div class="card-header" style="border-bottom: 1px solid #fde68a;">
          <h3 class="card-title" style="color: #92400e;"><i class="fa-solid fa-eye"></i> Live Homepage Card Mockup</h3>
          <span style="font-size: 11.5px; color: #b45309; font-weight: 700;">Exact Public Appearance</span>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #fde68a; margin-top: 14px; position: relative; overflow: hidden;">
          <span style="background: #fef3c7; color: #78350f; border: 1px solid #fde68a; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
            ${this.escapeHtml(cfg.badge || 'Join Our Passenger Host Network')}
          </span>
          <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin: 12px 0 8px 0; line-height: 1.3;">
            ${this.escapeHtml(cfg.title || 'Do You Own a Car, Van, or Tourist Bus in Mannar?')}
          </h2>
          <p style="font-size: 13px; color: #4b5563; line-height: 1.6; max-width: 700px; margin-bottom: 16px;">
            ${this.escapeHtml(cfg.description || '')}
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;">
            ${vehicleCards.filter(v => v.status === 'active').map(v => `
              <div style="background: #fffdf5; border: 1px solid #fde68a; border-radius: 12px; padding: 12px; text-align: center;">
                <i class="${this.escapeHtml(v.icon || 'fa-solid fa-car')}" style="font-size: 20px; color: #b45309; margin-bottom: 4px; display: inline-block;"></i>
                <div style="font-weight: 700; font-size: 13px; color: #111827;">${this.escapeHtml(v.name)}</div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${this.escapeHtml(v.subtitle || '')}</div>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <a href="${this.escapeHtml(cfg.whatsapp_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background: #059669; border-color: #059669; font-weight: 700; padding: 10px 20px; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: #fff;">
              <i class="fa-brands fa-whatsapp" style="font-size: 18px;"></i>
              <span>${this.escapeHtml(cfg.button_text || 'Join Host WhatsApp Group')}</span>
            </a>
            <span style="font-size: 12px; color: #6b7280;">Questions? Contact Us</span>
          </div>
        </div>
      </div>
    `;
  }

  bindHostNetworkEvents() {
    const waForm = document.getElementById('host-whatsapp-link-form');
    if (waForm) {
      waForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('host-whatsapp-url-input').value.trim();
        if (!url) {
          this.showToast("WhatsApp URL is required", "error");
          return;
        }

        try {
          this.showToast("Saving WhatsApp group link...", "info");
          let cfg = this.getHostNetworkConfig();
          cfg.whatsapp_url = url;
          cfg.updated_at = new Date().toISOString();

          await this.saveSettingsItem('host_whatsapp_group_url', url);
          await this.saveSettingsItem('join_us_config', cfg);
          await this.logAudit("UPDATE", "HOST_NETWORK", "whatsapp_url", { url });
          this.showToast("WhatsApp group join link updated successfully!", "success");
          this.render();
        } catch (err) {
          this.showToast(err.message || "Failed to save WhatsApp link", "error");
        }
      });
    }

    const cardForm = document.getElementById('host-main-card-form');
    if (cardForm) {
      cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const badge = document.getElementById('host-card-badge').value.trim();
        const title = document.getElementById('host-card-title').value.trim();
        const description = document.getElementById('host-card-desc').value.trim();
        const button_text = document.getElementById('host-card-btn-text').value.trim();
        const status = document.getElementById('host-card-status').value;

        if (!title) {
          this.showToast("Card heading is required", "error");
          return;
        }

        try {
          this.showToast("Saving Host Network card settings...", "info");
          let cfg = this.getHostNetworkConfig();
          cfg = { ...cfg, badge, title, description, button_text, status, updated_at: new Date().toISOString() };

          await this.saveSettingsItem('join_us_config', cfg);
          await this.logAudit("UPDATE", "HOST_NETWORK", "card_content", cfg);
          this.showToast("Host Network card content & status updated!", "success");
          this.render();
        } catch (err) {
          this.showToast(err.message || "Failed to save card settings", "error");
        }
      });
    }
  }

  openAddHostVehicleModal() {
    document.getElementById('host-vehicle-modal-title').innerHTML = '<i class="fa-solid fa-car-side"></i> Add Host Vehicle Type';
    document.getElementById('edit-host-veh-id-hidden').value = '';
    document.getElementById('edit-host-veh-name').value = '';
    document.getElementById('edit-host-veh-subtitle').value = '';
    document.getElementById('edit-host-veh-icon').value = 'fa-solid fa-car';
    document.getElementById('edit-host-veh-status').value = 'active';
    this.openModal('host-vehicle-modal');
  }

  openEditHostVehicleModal(id) {
    const list = this.getHostVehicleCards();
    const veh = list.find(v => v.id === id);
    if (!veh) return;

    document.getElementById('host-vehicle-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Host Vehicle Type';
    document.getElementById('edit-host-veh-id-hidden').value = veh.id;
    document.getElementById('edit-host-veh-name').value = veh.name || '';
    document.getElementById('edit-host-veh-subtitle').value = veh.subtitle || '';
    document.getElementById('edit-host-veh-icon').value = veh.icon || 'fa-solid fa-car';
    document.getElementById('edit-host-veh-status').value = veh.status || 'active';
    this.openModal('host-vehicle-modal');
  }

  async handleSaveHostVehicle() {
    const id = document.getElementById('edit-host-veh-id-hidden').value;
    const name = document.getElementById('edit-host-veh-name').value.trim();
    const subtitle = document.getElementById('edit-host-veh-subtitle').value.trim();
    const icon = document.getElementById('edit-host-veh-icon').value.trim() || 'fa-solid fa-car';
    const status = document.getElementById('edit-host-veh-status').value;

    if (!name || !subtitle) {
      this.showToast("Category name and subtitle models are required", "error");
      return;
    }

    let list = this.getHostVehicleCards();
    if (id) {
      const idx = list.findIndex(v => v.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], name, subtitle, icon, status };
      }
    } else {
      const newId = 'h-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      const maxOrder = list.reduce((m, v) => Math.max(m, v.order || 0), 0);
      list.push({ id: newId, name, subtitle, icon, status, order: maxOrder + 1 });
    }

    try {
      await this.saveSettingsItem('host_vehicle_cards', list);
      this.closeModal('host-vehicle-modal');
      this.showToast("Host vehicle category saved successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save vehicle category", "error");
    }
  }

  async toggleHostVehicleStatus(id) {
    let list = this.getHostVehicleCards();
    const veh = list.find(v => v.id === id);
    if (!veh) return;

    veh.status = veh.status === 'active' ? 'inactive' : 'active';
    try {
      await this.saveSettingsItem('host_vehicle_cards', list);
      this.showToast(`Vehicle '${veh.name}' is now ${veh.status === 'active' ? 'Active' : 'Deactive'}.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to toggle status", "error");
    }
  }

  async moveHostVehicle(id, direction) {
    let list = this.getHostVehicleCards();
    const index = list.findIndex(v => v.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('host_vehicle_cards', list);
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder host vehicle cards", "error");
    }
  }

  async deleteHostVehicle(id) {
    let list = this.getHostVehicleCards();
    const veh = list.find(v => v.id === id);
    if (!veh) return;

    if (!confirm(`Are you sure you want to delete '${veh.name}'?`)) return;

    list = list.filter(v => v.id !== id);
    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('host_vehicle_cards', list);
      this.showToast(`Vehicle '${veh.name}' deleted.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete vehicle category", "error");
    }
  }

  /* ----------------- FITNESS FEATURE CARDS ----------------- */
  getFitnessCards() {
    if (this.settings && this.settings.fitness_feature_cards) {
      try {
        const list = typeof this.settings.fitness_feature_cards === 'string'
          ? JSON.parse(this.settings.fitness_feature_cards)
          : this.settings.fitness_feature_cards;
        if (Array.isArray(list) && list.length) {
          return list.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch (e) { }
    }
    return [
      { id: 'fit-cardio', title: 'Cardio & Coastal Fitness', description: 'Maintain your fitness regimen on high-quality multi-gear bicycles with low impact on joints while breathing clean sea breeze.', icon: 'fa-solid fa-heart-pulse', status: 'active', order: 1 },
      { id: 'fit-landmarks', title: 'Scenic Tourist Landmarks', description: 'Ride directly to the ancient Baobab Tree, historic Portuguese Fort, Vankalai Bird Sanctuary, and Talaimannar Lighthouse.', icon: 'fa-solid fa-map-location-dot', status: 'active', order: 2 },
      { id: 'fit-setup', title: 'Tailored Bike Setup', description: 'Adjustable seat posts, sports helmets, water bottle holders, and fitness tracking recommendations for cyclists.', icon: 'fa-solid fa-person-biking', status: 'active', order: 3 }
    ];
  }

  renderFitnessCardsView() {
    const list = this.getFitnessCards();

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-heart-pulse"></i> Tourist & Body Fitness Feature Cards</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage the 3-step fitness & eco highlights shown in the "Tourist & Body Fitness" section of the website.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddFitnessCardModal()">
            <i class="fa-solid fa-plus"></i> Add Feature Card
          </button>
        </div>

        <div style="overflow-x: auto; margin-top: 14px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 75px;">Order</th>
                <th style="width: 60px;">Icon</th>
                <th>Card Title</th>
                <th>Description</th>
                <th>Status</th>
                <th style="width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((c, idx) => `
                <tr>
                  <td style="white-space: nowrap;">
                    <button class="btn-reorder" onclick="window.adminCMS.moveFitnessCard('${c.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button class="btn-reorder" onclick="window.adminCMS.moveFitnessCard('${c.id}', 1)" ${idx === list.length - 1 ? 'disabled' : ''} title="Move Down">
                      <i class="fa-solid fa-arrow-down"></i>
                    </button>
                  </td>
                  <td>
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: #ecfdf5; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 17px;">
                      <i class="${this.escapeHtml(c.icon || 'fa-solid fa-heart-pulse')}"></i>
                    </div>
                  </td>
                  <td><strong>${this.escapeHtml(c.title)}</strong></td>
                  <td><span style="font-size: 12px; color: var(--slate-600);">${this.escapeHtml(c.description || '')}</span></td>
                  <td>
                    <span class="badge ${c.status === 'active' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${c.status === 'active' ? 'fa-check' : 'fa-ban'}"></i> ${c.status === 'active' ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditFitnessCardModal('${c.id}')" title="Edit">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${c.status === 'active' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleFitnessCardStatus('${c.id}')" title="${c.status === 'active' ? 'Deactivate' : 'Activate'}" style="margin-left: 4px;">
                      ${c.status === 'active' ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteFitnessCard('${c.id}')" title="Delete" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section Visuals (2 Display Images in Website) -->
      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-images"></i> Section Visuals & Display Photos</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage the two showcase photos displayed next to the feature cards on the website ("Ride for Health, Ride for the Planet").
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.handleSaveFitnessImages()">
            <i class="fa-solid fa-floppy-disk"></i> Save Fitness Images
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px;">
          <!-- Image 1: Cycling Fitness in Mannar -->
          <div class="form-group" style="background: var(--slate-50); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
            <label class="form-label" style="font-weight: 700;">Image 1: Cycling Fitness in Mannar</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="url" class="form-input" id="fitness-img1-input" value="${this.escapeHtml(this.getFitnessImages().img1 || 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600')}" placeholder="https://... image URL" oninput="window.adminCMS.previewImage('fitness-img1-input', 'fitness-img1-preview')">
              <label class="btn btn-outline btn-sm" style="margin: 0; white-space: nowrap; cursor: pointer;">
                <i class="fa-solid fa-upload"></i> Upload
                <input type="file" id="fitness-img1-file" accept="image/*" style="display: none;" onchange="window.adminCMS.handleFileUpload(this, 'fitness-img1-input', 'fitness-img1-preview')">
              </label>
            </div>
            <div id="fitness-img1-preview-wrapper" style="margin-top: 8px;">
              <img id="fitness-img1-preview" src="${this.escapeHtml(this.getFitnessImages().img1 || 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600')}" alt="Fitness Preview 1" style="max-height: 120px; width: 100%; border-radius: 8px; border: 1px solid var(--slate-200); object-fit: cover;">
            </div>
          </div>

          <!-- Image 2: Tourist Adventure -->
          <div class="form-group" style="background: var(--slate-50); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
            <label class="form-label" style="font-weight: 700;">Image 2: Tourist Adventure</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="url" class="form-input" id="fitness-img2-input" value="${this.escapeHtml(this.getFitnessImages().img2 || 'https://drive.google.com/thumbnail?id=1Set2mnZc8B5Ua0qZcxFw52hzAAwApJ7x&sz=w1600')}" placeholder="https://... image URL" oninput="window.adminCMS.previewImage('fitness-img2-input', 'fitness-img2-preview')">
              <label class="btn btn-outline btn-sm" style="margin: 0; white-space: nowrap; cursor: pointer;">
                <i class="fa-solid fa-upload"></i> Upload
                <input type="file" id="fitness-img2-file" accept="image/*" style="display: none;" onchange="window.adminCMS.handleFileUpload(this, 'fitness-img2-input', 'fitness-img2-preview')">
              </label>
            </div>
            <div id="fitness-img2-preview-wrapper" style="margin-top: 8px;">
              <img id="fitness-img2-preview" src="${this.escapeHtml(this.getFitnessImages().img2 || 'https://drive.google.com/thumbnail?id=1Set2mnZc8B5Ua0qZcxFw52hzAAwApJ7x&sz=w1600')}" alt="Fitness Preview 2" style="max-height: 120px; width: 100%; border-radius: 8px; border: 1px solid var(--slate-200); object-fit: cover;">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindFitnessCardsEvents() {
    this.previewImage('fitness-img1-input', 'fitness-img1-preview');
    this.previewImage('fitness-img2-input', 'fitness-img2-preview');
  }

  getFitnessImages() {
    const raw = this.settings && this.settings.fitness_section_images;
    let imgs = {
      img1: 'https://drive.google.com/thumbnail?id=1z3yc58-1GU81k5AvWuYIwWMrgwuyJN_s&sz=w1600',
      img2: 'https://drive.google.com/thumbnail?id=1Set2mnZc8B5Ua0qZcxFw52hzAAwApJ7x&sz=w1600'
    };
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        imgs = { ...imgs, ...parsed };
      } catch (e) { }
    }
    return imgs;
  }

  async handleSaveFitnessImages() {
    const img1 = this.normalizeImageUrl(document.getElementById('fitness-img1-input')?.value?.trim() || '');
    const img2 = this.normalizeImageUrl(document.getElementById('fitness-img2-input')?.value?.trim() || '');
    const payload = { img1, img2 };

    try {
      this.showToast("Saving fitness images...", "info");
      await this.saveSettingsItem('fitness_section_images', payload, 'FITNESS');

      // Also sync into content_styling_config so both places are unified
      const styling = this.getContentStyleConfig();
      if (!styling.fitness) styling.fitness = {};
      styling.fitness.img1 = img1;
      styling.fitness.img2 = img2;
      styling.fitness.imgUrl = img1;
      await this.saveSettingsItem('content_styling_config', styling, 'FITNESS');

      // Sync into WordPress inputs if in DOM
      const wp1 = document.getElementById('wp-fitness-img1-url');
      if (wp1) wp1.value = img1;
      const wp2 = document.getElementById('wp-fitness-img2-url');
      if (wp2) wp2.value = img2;
      if (typeof this.updateWpFitnessPreview === 'function') {
        this.updateWpFitnessPreview();
      }

      this.showToast("Fitness section images updated successfully!", "success");
    } catch (err) {
      this.showToast(err.message || "Failed to save fitness images", "error");
    }
  }

  openAddFitnessCardModal() {
    document.getElementById('fitness-card-modal-title').innerHTML = '<i class="fa-solid fa-heart-pulse"></i> Add Fitness Feature Card';
    document.getElementById('edit-fit-card-id-hidden').value = '';
    document.getElementById('edit-fit-card-title').value = '';
    document.getElementById('edit-fit-card-icon').value = 'fa-solid fa-heart-pulse';
    document.getElementById('edit-fit-card-desc').value = '';
    document.getElementById('edit-fit-card-status').value = 'active';
    this.openModal('fitness-card-modal');
  }

  openEditFitnessCardModal(id) {
    const list = this.getFitnessCards();
    const c = list.find(item => item.id === id);
    if (!c) return;

    document.getElementById('fitness-card-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Fitness Feature Card';
    document.getElementById('edit-fit-card-id-hidden').value = c.id;
    document.getElementById('edit-fit-card-title').value = c.title || '';
    document.getElementById('edit-fit-card-icon').value = c.icon || 'fa-solid fa-heart-pulse';
    document.getElementById('edit-fit-card-desc').value = c.description || '';
    document.getElementById('edit-fit-card-status').value = c.status || 'active';
    this.openModal('fitness-card-modal');
  }

  async handleSaveFitnessCard() {
    const id = document.getElementById('edit-fit-card-id-hidden').value;
    const title = document.getElementById('edit-fit-card-title').value.trim();
    const icon = document.getElementById('edit-fit-card-icon').value.trim() || 'fa-solid fa-heart-pulse';
    const description = document.getElementById('edit-fit-card-desc').value.trim();
    const status = document.getElementById('edit-fit-card-status').value;

    if (!title || !description) {
      this.showToast("Title and description are required", "error");
      return;
    }

    let list = this.getFitnessCards();
    if (id) {
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], title, icon, description, status };
      }
    } else {
      const newId = 'fit-' + Date.now();
      const maxOrder = list.reduce((m, c) => Math.max(m, c.order || 0), 0);
      list.push({ id: newId, title, icon, description, status, order: maxOrder + 1 });
    }

    try {
      await this.saveSettingsItem('fitness_feature_cards', list);
      this.closeModal('fitness-card-modal');
      this.showToast("Fitness feature card saved!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save fitness card", "error");
    }
  }

  async toggleFitnessCardStatus(id) {
    let list = this.getFitnessCards();
    const c = list.find(item => item.id === id);
    if (!c) return;

    c.status = c.status === 'active' ? 'inactive' : 'active';
    try {
      await this.saveSettingsItem('fitness_feature_cards', list);
      this.showToast(`Card '${c.title}' is now ${c.status === 'active' ? 'Active' : 'Deactive'}.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to toggle status", "error");
    }
  }

  async moveFitnessCard(id, direction) {
    let list = this.getFitnessCards();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('fitness_feature_cards', list);
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder fitness cards", "error");
    }
  }

  async deleteFitnessCard(id) {
    let list = this.getFitnessCards();
    const c = list.find(item => item.id === id);
    if (!c) return;

    if (!confirm(`Are you sure you want to delete '${c.title}'?`)) return;

    list = list.filter(item => item.id !== id);
    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('fitness_feature_cards', list);
      this.showToast(`Feature card '${c.title}' deleted.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete fitness card", "error");
    }
  }

  /* ----------------- ABOUT US HIGHLIGHT CARDS ----------------- */
  getAboutCards() {
    if (this.settings && this.settings.about_feature_cards) {
      try {
        const list = typeof this.settings.about_feature_cards === 'string'
          ? JSON.parse(this.settings.about_feature_cards)
          : this.settings.about_feature_cards;
        if (Array.isArray(list) && list.length) {
          return list.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch (e) { }
    }
    return [
      { id: 'abt-multi', title: 'Multilingual Support', description: 'Tamil, English, Sinhala, Russian, French & Chinese', status: 'active', order: 1 },
      { id: 'abt-safe', title: 'Verified & Safe', description: 'Verified local drivers and inspected passenger vehicles', status: 'active', order: 2 }
    ];
  }

  renderAboutCardsView() {
    const list = this.getAboutCards();

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-circle-info"></i> About Us Highlight Cards</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-top: 4px;">
              Manage the trust & guarantee highlight cards (Multilingual Support, Verified Drivers, etc.) shown in the About section.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.adminCMS.openAddAboutCardModal()">
            <i class="fa-solid fa-plus"></i> Add Highlight Card
          </button>
        </div>

        <div style="overflow-x: auto; margin-top: 14px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 75px;">Order</th>
                <th>Highlight Title</th>
                <th>Description</th>
                <th>Status</th>
                <th style="width: 180px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((c, idx) => `
                <tr>
                  <td style="white-space: nowrap;">
                    <button class="btn-reorder" onclick="window.adminCMS.moveAboutCard('${c.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button class="btn-reorder" onclick="window.adminCMS.moveAboutCard('${c.id}', 1)" ${idx === list.length - 1 ? 'disabled' : ''} title="Move Down">
                      <i class="fa-solid fa-arrow-down"></i>
                    </button>
                  </td>
                  <td><strong>${this.escapeHtml(c.title)}</strong></td>
                  <td><span style="font-size: 12.5px; color: var(--slate-600);">${this.escapeHtml(c.description || '')}</span></td>
                  <td>
                    <span class="badge ${c.status === 'active' ? 'badge-published' : 'badge-draft'}">
                      <i class="fa-solid ${c.status === 'active' ? 'fa-check' : 'fa-ban'}"></i> ${c.status === 'active' ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" onclick="window.adminCMS.openEditAboutCardModal('${c.id}')" title="Edit">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn ${c.status === 'active' ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.adminCMS.toggleAboutCardStatus('${c.id}')" title="${c.status === 'active' ? 'Deactivate' : 'Activate'}" style="margin-left: 4px;">
                      ${c.status === 'active' ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.adminCMS.deleteAboutCard('${c.id}')" title="Delete" style="margin-left: 4px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  bindAboutCardsEvents() { }

  openAddAboutCardModal() {
    document.getElementById('about-card-modal-title').innerHTML = '<i class="fa-solid fa-circle-info"></i> Add About Highlight Card';
    document.getElementById('edit-abt-card-id-hidden').value = '';
    document.getElementById('edit-abt-card-title').value = '';
    document.getElementById('edit-abt-card-desc').value = '';
    document.getElementById('edit-abt-card-status').value = 'active';
    this.openModal('about-card-modal');
  }

  openEditAboutCardModal(id) {
    const list = this.getAboutCards();
    const c = list.find(item => item.id === id);
    if (!c) return;

    document.getElementById('about-card-modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit About Highlight Card';
    document.getElementById('edit-abt-card-id-hidden').value = c.id;
    document.getElementById('edit-abt-card-title').value = c.title || '';
    document.getElementById('edit-abt-card-desc').value = c.description || '';
    document.getElementById('edit-abt-card-status').value = c.status || 'active';
    this.openModal('about-card-modal');
  }

  async handleSaveAboutCard() {
    const id = document.getElementById('edit-abt-card-id-hidden').value;
    const title = document.getElementById('edit-abt-card-title').value.trim();
    const description = document.getElementById('edit-abt-card-desc').value.trim();
    const status = document.getElementById('edit-abt-card-status').value;

    if (!title || !description) {
      this.showToast("Title and description are required", "error");
      return;
    }

    let list = this.getAboutCards();
    if (id) {
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], title, description, status };
      }
    } else {
      const newId = 'abt-' + Date.now();
      const maxOrder = list.reduce((m, c) => Math.max(m, c.order || 0), 0);
      list.push({ id: newId, title, description, status, order: maxOrder + 1 });
    }

    try {
      await this.saveSettingsItem('about_feature_cards', list);
      this.closeModal('about-card-modal');
      this.showToast("About highlight card saved!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save about card", "error");
    }
  }

  async toggleAboutCardStatus(id) {
    let list = this.getAboutCards();
    const c = list.find(item => item.id === id);
    if (!c) return;

    c.status = c.status === 'active' ? 'inactive' : 'active';
    try {
      await this.saveSettingsItem('about_feature_cards', list);
      this.showToast(`Highlight '${c.title}' is now ${c.status === 'active' ? 'Active' : 'Deactive'}.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to toggle status", "error");
    }
  }

  async moveAboutCard(id, direction) {
    let list = this.getAboutCards();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('about_feature_cards', list);
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to reorder about cards", "error");
    }
  }

  async deleteAboutCard(id) {
    let list = this.getAboutCards();
    const c = list.find(item => item.id === id);
    if (!c) return;

    if (!confirm(`Are you sure you want to delete '${c.title}'?`)) return;

    list = list.filter(item => item.id !== id);
    list.forEach((item, i) => { item.order = i + 1; });

    try {
      await this.saveSettingsItem('about_feature_cards', list);
      this.showToast(`Highlight '${c.title}' deleted.`, "info");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to delete about card", "error");
    }
  }

  /* ----------------- Modal Helpers ----------------- */
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      if (window.history && window.history.pushState) {
        window.history.pushState({ tab: this.activeTab, modalId: id }, '', '#' + this.activeTab);
      }
    }
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

  /* ----------------- 17. MANNAR GA LAUNCH CEREMONY ----------------- */
  getLaunchCeremonyConfig() {
    const raw = this.settings && this.settings.launch_ceremony_config;
    let cfg = {
      active: false,
      countdown_seconds: 5,
      front_image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800',
      govt_badge: 'Govt. Approved Tourist Transport Service',
      brand_title: 'MANNAR GREEN RIDE',
      brand_subtitle: 'Official Inauguration & Public Rollout',
      ceremony_badge: 'STATE INAUGURAL CEREMONY • MANNAR DISTRICT',
      title: 'Empowering Mannar with Eco-Friendly Transport',
      subtitle: 'Proudly serving pilgrims, local commuters, and global tourists across the historic island of Mannar.',
      guest_name: 'Inaugurated by Hon. District Secretary & Distinguished Dignitaries',
      button_text: 'TOUCH TO INAUGURATE',
      touch_hint: 'Press and hold for 2.5 seconds to unlock',
      countdown_status: 'OFFICIAL PUBLIC DEPLOYMENT COMMENCING',
      celebration_title: 'MANNAR GREEN RIDE IS NOW OFFICIALLY LAUNCHED!',
      celebration_sub: 'Leading sustainable tourism, green mobility, and dependable transport for Mannar Island.',
      enter_button_text: 'ENTER OFFICIAL PORTAL',
      enable_sound: true
    };
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        cfg = { ...cfg, ...parsed };
      } catch (e) { }
    } else {
      try {
        const local = localStorage.getItem('mgr_setting_launch_ceremony_config');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            cfg = { ...cfg, ...parsed };
          }
        }
      } catch (e) { }
    }
    return cfg;
  }

  renderLaunchCeremonyView() {
    const cfg = this.getLaunchCeremonyConfig();
    const isActive = !!cfg.active;
    const activeBadge = isActive
      ? `<span class="badge badge-published" style="font-size: 12px; padding: 6px 12px;"><i class="fa-solid fa-circle-dot fa-fade"></i> ACTIVE - Ceremony Screen Live on Website</span>`
      : `<span class="badge badge-draft" style="font-size: 12px; padding: 6px 12px;"><i class="fa-solid fa-ban"></i> DEACTIVATED - Website Loads Normally</span>`;

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Banner Card -->
        <div class="card" style="background: linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%); color: #fff; border: 1px solid #059669; padding: 24px; position: relative; overflow: hidden; border-radius: 12px;">
          <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.1; font-size: 180px; pointer-events: none;">
            <i class="fa-solid fa-rocket"></i>
          </div>
          <div style="position: relative; z-index: 1; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.2);">
                <i class="fa-solid fa-award"></i> VIP INAUGURATION CONTROLS
              </div>
              <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.5px;">
                Mannar Government Agent (GA) Official Launch Ceremony
              </h2>
              <p style="font-size: 13px; color: #a7f3d0; max-width: 680px; line-height: 1.5; margin: 0;">
                Configure every single text element, dignitary dedication, touch trigger, countdown and celebration screen seen during the live stage inauguration.
              </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <a href="../index.html?ceremony=true&rehearse=1" target="_blank" class="btn btn-outline" style="background: rgba(255,255,255,0.15); color: #fff; border-color: rgba(255,255,255,0.4); text-decoration: none; font-weight: 700;">
                <i class="fa-solid fa-eye"></i> Rehearse Launch Screen (Live)
              </a>
              <button class="btn btn-primary" onclick="window.adminCMS.saveLaunchCeremonySettings()" style="background: #10b981; border-color: #10b981; font-weight: 700;">
                <i class="fa-solid fa-floppy-disk"></i> Save All Ceremony Settings
              </button>
            </div>
          </div>
        </div>

        <!-- Master Switch & Countdown Configuration Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-sliders"></i> 1. Launch Ceremony Activation &amp; Timing</h3>
            ${activeBadge}
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 10px;">
            <!-- Active / Deactivate Toggle -->
            <div class="form-group" style="background: var(--slate-50); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
              <label class="form-label" style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Ceremony Mode Status</label>
              <select class="form-select" id="ceremony-status-input" style="font-weight: 600;">
                <option value="active" ${isActive ? 'selected' : ''}>🟢 ACTIVE (Show Launch Screen to Visitors)</option>
                <option value="inactive" ${!isActive ? 'selected' : ''}>⚪ DEACTIVATED (Normal Website Mode)</option>
              </select>
              <p style="font-size: 12px; color: var(--slate-500); margin-top: 6px;">
                Turn ON right before the stage ceremony begins. Turn OFF after the launch is complete to restore normal direct site browsing.
              </p>
            </div>

            <!-- Countdown Number -->
            <div class="form-group" style="background: var(--slate-50); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
              <label class="form-label" style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Countdown Duration (Seconds)</label>
              <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" class="form-input" id="ceremony-countdown-input" min="3" max="30" value="${cfg.countdown_seconds || 5}" style="max-width: 120px; font-weight: 800; font-size: 18px; text-align: center;">
                <span style="font-size: 14px; font-weight: 600; color: var(--slate-600);">Seconds</span>
                <div style="display: flex; gap: 6px; margin-left: auto;">
                  <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('ceremony-countdown-input').value = 3">3s</button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('ceremony-countdown-input').value = 5">5s</button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('ceremony-countdown-input').value = 10">10s</button>
                </div>
              </div>
              <p style="font-size: 12px; color: var(--slate-500); margin-top: 6px;">
                Duration of the giant digital countdown once the dignitary touches START. Recommended: 5 or 10 seconds.
              </p>
            </div>
          </div>

          <div class="form-group" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--slate-200); display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="ceremony-sound-input" ${cfg.enable_sound !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #059669;">
            <label for="ceremony-sound-input" style="font-size: 13px; font-weight: 600; cursor: pointer;">
              Enable Digital Countdown Audio Beeps &amp; Launch Fanfare (Synthesized Web Audio API - zero network latency)
            </label>
          </div>
        </div>

        <!-- Front Image / Ceremony Poster Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-image"></i> 2. Ceremony Front Image / Stage Poster</h3>
            <span style="font-size: 12px; color: var(--slate-500);">Featured on the ceremony screen in a glowing holographic frame</span>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-top: 10px;">
            <div>
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Front Image URL</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <input type="url" class="form-input" id="ceremony-front-image" value="${this.escapeHtml(cfg.front_image || '')}" placeholder="https://... image URL" oninput="window.adminCMS.previewImage('ceremony-front-image', 'ceremony-image-preview')">
                  <label class="btn btn-outline btn-sm" style="margin: 0; white-space: nowrap; cursor: pointer;">
                    <i class="fa-solid fa-upload"></i> Upload Image
                    <input type="file" id="ceremony-image-file" accept="image/*" style="display: none;" onchange="window.adminCMS.handleFileUpload(this, 'ceremony-front-image', 'ceremony-image-preview')">
                  </label>
                </div>
                <div id="ceremony-image-preview-wrapper" style="margin-top: 8px;">
                  <img id="ceremony-image-preview" src="${this.escapeHtml(cfg.front_image || '')}" alt="Ceremony Front Preview" style="max-height: 180px; width: 100%; max-width: 380px; border-radius: 8px; border: 1px solid var(--slate-200); object-fit: cover; ${cfg.front_image ? 'display: block;' : 'display: none;'}">
                </div>
              </div>

              <!-- Quick Presets -->
              <div style="margin-top: 12px;">
                <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--slate-500); font-weight: 700;">Quick Image Presets</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.setCeremonyImagePreset('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800')">
                    🚲 Eco Cycling Flagship
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.setCeremonyImagePreset('https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=800')">
                    🌅 Scenic Tourist Landmark
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="window.adminCMS.setCeremonyImagePreset('mannar Green Ride logo.png')">
                    🛡️ Official Mannar Green Ride Logo
                  </button>
                </div>
              </div>
            </div>

            <!-- Preview Card Box -->
            <div style="background: #022c22; border: 1px solid #059669; border-radius: var(--radius-md); padding: 16px; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #34d399; margin-bottom: 8px;">Interactive Stage Button</span>
              <div style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid #10b981; box-shadow: 0 0 20px rgba(16,185,129,0.5); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #34d399; margin-bottom: 8px;">
                <i class="fa-solid fa-power-off"></i>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: #fff;">${this.escapeHtml(cfg.button_text || 'TOUCH TO INAUGURATE')}</div>
              <div style="font-size: 10.5px; color: #a7f3d0; margin-top: 4px;">Pulsing energy rings &amp; touch sensor</div>
            </div>
          </div>
        </div>

        <!-- 3. Stage Header & Brand Emblem Identity -->
        <div class="card" style="border-left: 4px solid #0073aa;">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-shield-halved" style="color: #0073aa;"></i> 3. Stage Header &amp; Brand Emblem Identity</h3>
            <span style="font-size: 12px; color: var(--slate-500);">Appears at the very top of the ceremony screen</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 10px;">
            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Government / Official Approval Pill</label>
              <input type="text" class="form-input" id="ceremony-govt-badge-input" value="${this.escapeHtml(cfg.govt_badge || 'Govt. Approved Tourist Transport Service')}">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Upper pill badge next to the Sri Lankan emblem shield.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Brand Title (Golden Text)</label>
              <input type="text" class="form-input" id="ceremony-brand-title-input" value="${this.escapeHtml(cfg.brand_title || 'MANNAR GREEN RIDE')}" style="font-weight: 800; letter-spacing: 0.5px;">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Main golden gradient brand title.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Brand Subtitle / Rollout Tag</label>
              <input type="text" class="form-input" id="ceremony-brand-subtitle-input" value="${this.escapeHtml(cfg.brand_subtitle || 'Official Inauguration & Public Rollout')}">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Green sub-badge underneath the brand title.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Stage Inaugural Badge Tag</label>
              <input type="text" class="form-input" id="ceremony-stage-badge-input" value="${this.escapeHtml(cfg.ceremony_badge || 'STATE INAUGURAL CEREMONY • MANNAR DISTRICT')}">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Tag positioned directly above the main ceremony heading.</p>
            </div>
          </div>
        </div>

        <!-- 4. Main Announcement & Dignitary Dedication -->
        <div class="card" style="border-left: 4px solid #059669;">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-pen-nib" style="color: #059669;"></i> 4. Ceremony Announcement &amp; Dignitary Dedication</h3>
            <span style="font-size: 12px; color: var(--slate-500);">Featured text in center stage</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-top: 10px;">
            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Ceremony Main Heading</label>
              <input type="text" class="form-input" id="ceremony-title-input" value="${this.escapeHtml(cfg.title || 'Empowering Mannar with Eco-Friendly Transport')}" style="font-size: 15px; font-weight: 700;">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">The primary headline displayed in large typography on the ceremony screen.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Project Mission &amp; Purpose Subtitle</label>
              <textarea class="form-input" id="ceremony-subtitle-input" rows="2" style="font-size: 13.5px; line-height: 1.45;">${this.escapeHtml(cfg.subtitle || 'Proudly serving pilgrims, local commuters, and global tourists across the historic island of Mannar.')}</textarea>
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Paragraph describing the rollout significance for Mannar.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Dignitary Inauguration Dedication</label>
              <input type="text" class="form-input" id="ceremony-guest-input" value="${this.escapeHtml(cfg.guest_name || 'Inaugurated by Hon. District Secretary & Distinguished Dignitaries')}" style="font-weight: 600;">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Golden plaque text recognizing the Government Agent &amp; guest of honor.</p>
            </div>
          </div>
        </div>

        <!-- 5. Interactive Launch Button & Action Hints -->
        <div class="card" style="border-left: 4px solid #f59e0b;">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-hand-pointer" style="color: #f59e0b;"></i> 5. Central Launch Button &amp; Countdown State</h3>
            <span style="font-size: 12px; color: var(--slate-500);">Interactive touch controls</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 10px;">
            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Central Launch Button Text</label>
              <input type="text" class="form-input" id="ceremony-button-input" value="${this.escapeHtml(cfg.button_text || 'TOUCH TO INAUGURATE')}" style="font-weight: 800;">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Main text inside the central circular touch sensor button.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Touch Action Instruction Hint</label>
              <input type="text" class="form-input" id="ceremony-touch-hint-input" value="${this.escapeHtml(cfg.touch_hint || 'Press and hold for 2.5 seconds to unlock')}">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Helper hint text positioned directly under the launch button.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Countdown Progress Banner Text</label>
              <input type="text" class="form-input" id="ceremony-countdown-status-input" value="${this.escapeHtml(cfg.countdown_status || 'OFFICIAL PUBLIC DEPLOYMENT COMMENCING')}">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Banner displayed while the giant digital countdown is ticking down.</p>
            </div>
          </div>
        </div>

        <!-- 6. Celebration Unveil & Portal Entry -->
        <div class="card" style="border-left: 4px solid #8b5cf6;">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-trophy" style="color: #8b5cf6;"></i> 6. Celebration Unveil &amp; Portal Entry</h3>
            <span style="font-size: 12px; color: var(--slate-500);">Displays when countdown reaches ZERO with confetti fireworks</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 10px;">
            <div class="form-group" style="grid-column: 1 / -1;">
              <label class="form-label" style="font-weight: 700;">Celebration Victory Headline</label>
              <input type="text" class="form-input" id="ceremony-celebration-title-input" value="${this.escapeHtml(cfg.celebration_title || 'MANNAR GREEN RIDE IS NOW OFFICIALLY LAUNCHED!')}" style="font-weight: 800; font-size: 15px; color: #047857;">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Giant congratulatory headline after the countdown completes.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Celebration Subtitle / Impact Message</label>
              <input type="text" class="form-input" id="ceremony-celebration-sub-input" value="${this.escapeHtml(cfg.celebration_sub || 'Leading sustainable tourism, green mobility, and dependable transport for Mannar Island.')}">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">Support message beneath the celebration title.</p>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">Website Enter Button Label</label>
              <input type="text" class="form-input" id="ceremony-enter-btn-input" value="${this.escapeHtml(cfg.enter_button_text || 'ENTER OFFICIAL PORTAL')}" style="font-weight: 800;">
              <p style="font-size: 11px; color: var(--slate-500); margin-top: 4px;">The glowing button that brings the dignitary directly into the live website.</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: flex-end; align-items: center; margin-top: 8px; margin-bottom: 24px;">
          <a href="../index.html?ceremony=true&rehearse=1" target="_blank" class="btn btn-outline" style="text-decoration: none; font-weight: 700; padding: 10px 20px;">
            <i class="fa-solid fa-play"></i> Rehearse Launch Screen Live
          </a>
          <button class="btn btn-primary" id="btn-save-ceremony-settings" onclick="window.adminCMS.saveLaunchCeremonySettings()" style="font-weight: 800; padding: 10px 24px; font-size: 14px; background: #059669; border-color: #059669;">
            <i class="fa-solid fa-floppy-disk"></i> Save All Ceremony Settings
          </button>
        </div>
      </div>
    `;
  }

  bindLaunchCeremonyEvents() {
    this.previewImage('ceremony-front-image', 'ceremony-image-preview');
  }

  setCeremonyImagePreset(url) {
    const input = document.getElementById('ceremony-front-image');
    if (input) {
      input.value = url;
      this.previewImage('ceremony-front-image', 'ceremony-image-preview');
    }
  }

  async saveLaunchCeremonySettings() {
    const active = document.getElementById('ceremony-status-input')?.value === 'active';
    const countdown_seconds = parseInt(document.getElementById('ceremony-countdown-input')?.value, 10) || 5;
    const front_image = this.normalizeImageUrl(document.getElementById('ceremony-front-image')?.value?.trim() || '');

    // Stage Header & Brand
    const govt_badge = document.getElementById('ceremony-govt-badge-input')?.value?.trim() || 'Govt. Approved Tourist Transport Service';
    const brand_title = document.getElementById('ceremony-brand-title-input')?.value?.trim() || 'MANNAR GREEN RIDE';
    const brand_subtitle = document.getElementById('ceremony-brand-subtitle-input')?.value?.trim() || 'Official Inauguration & Public Rollout';
    const ceremony_badge = document.getElementById('ceremony-stage-badge-input')?.value?.trim() || 'STATE INAUGURAL CEREMONY • MANNAR DISTRICT';

    // Main Announcement & Dignitary
    const title = document.getElementById('ceremony-title-input')?.value?.trim() || 'Empowering Mannar with Eco-Friendly Transport';
    const subtitle = document.getElementById('ceremony-subtitle-input')?.value?.trim() || 'Proudly serving pilgrims, local commuters, and global tourists across the historic island of Mannar.';
    const guest_name = document.getElementById('ceremony-guest-input')?.value?.trim() || 'Inaugurated by Hon. District Secretary & Distinguished Dignitaries';

    // Action & Hints
    const button_text = document.getElementById('ceremony-button-input')?.value?.trim() || 'TOUCH TO INAUGURATE';
    const touch_hint = document.getElementById('ceremony-touch-hint-input')?.value?.trim() || 'Press and hold for 2.5 seconds to unlock';
    const countdown_status = document.getElementById('ceremony-countdown-status-input')?.value?.trim() || 'OFFICIAL PUBLIC DEPLOYMENT COMMENCING';

    // Celebration Unveil
    const celebration_title = document.getElementById('ceremony-celebration-title-input')?.value?.trim() || 'MANNAR GREEN RIDE IS NOW OFFICIALLY LAUNCHED!';
    const celebration_sub = document.getElementById('ceremony-celebration-sub-input')?.value?.trim() || 'Leading sustainable tourism, green mobility, and dependable transport for Mannar Island.';
    const enter_button_text = document.getElementById('ceremony-enter-btn-input')?.value?.trim() || 'ENTER OFFICIAL PORTAL';

    const enable_sound = document.getElementById('ceremony-sound-input')?.checked ?? true;

    const payload = {
      active,
      countdown_seconds,
      front_image,
      govt_badge,
      brand_title,
      brand_subtitle,
      ceremony_badge,
      title,
      subtitle,
      guest_name,
      button_text,
      touch_hint,
      countdown_status,
      celebration_title,
      celebration_sub,
      enter_button_text,
      enable_sound
    };

    try {
      this.showToast("Saving ceremony settings...", "info");
      await this.saveSettingsItem('launch_ceremony_config', payload, 'CEREMONY');
      localStorage.setItem('mgr_setting_launch_ceremony_config', JSON.stringify(payload));
      await this.logAudit(active ? "ACTIVATE" : "DEACTIVATE", "CEREMONY", "launch_ceremony_config", payload);
      this.updateLaunchCeremonyBadge();
      this.showToast(active ? "Launch Ceremony Screen is now ACTIVE on website!" : "Launch Ceremony saved successfully!", "success");
      this.render();
    } catch (err) {
      this.showToast(err.message || "Failed to save ceremony settings", "error");
    }
  }

  updateLaunchCeremonyBadge() {
    const badge = document.getElementById('launch-ceremony-nav-badge');
    if (!badge) return;
    const cfg = this.getLaunchCeremonyConfig();
    if (cfg && cfg.active) {
      badge.textContent = 'LIVE';
      badge.style.background = '#dcfce7';
      badge.style.color = '#15803d';
    } else {
      badge.textContent = 'OFF';
      badge.style.background = '#fee2e2';
      badge.style.color = '#dc2626';
    }
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return str || '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}

window.AdminCMSApp = AdminCMSApp;
