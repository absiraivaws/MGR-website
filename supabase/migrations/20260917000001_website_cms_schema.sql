-- ==============================================================================
-- MANNAR GREEN RIDE - WEBSITE BACKEND CMS SCHEMA
-- Version: 1.0
-- Database: Supabase (Project szzhzpjfmyeulxjhbbov)
-- Notice: Strictly non-financial metrics (Total Customers, Registered Vehicles, Completed Services)
-- ==============================================================================

-- 1. Website Settings
CREATE TABLE IF NOT EXISTS public.website_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL DEFAULT '',
    setting_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'boolean', 'json', 'image'
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Website Pages
CREATE TABLE IF NOT EXISTS public.website_pages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    page_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Website Sections
CREATE TABLE IF NOT EXISTS public.website_sections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    page_slug TEXT NOT NULL DEFAULT 'home',
    section_key TEXT UNIQUE NOT NULL,
    section_type TEXT NOT NULL DEFAULT 'text',
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT DEFAULT '',
    content TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    button_text TEXT DEFAULT '',
    button_url TEXT DEFAULT '',
    display_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Website Services
CREATE TABLE IF NOT EXISTS public.website_services (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    service_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    short_description TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    icon_reference TEXT DEFAULT 'fa-bicycle',
    price_source TEXT NOT NULL DEFAULT 'AUTO', -- 'AUTO' (from vehicle_types rates) or 'MANUAL'
    manual_price NUMERIC DEFAULT 100,
    price_unit TEXT DEFAULT 'per hour',
    button_text TEXT DEFAULT 'Book on WhatsApp',
    button_url TEXT DEFAULT '#booking',
    featured BOOLEAN DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Website Media
CREATE TABLE IF NOT EXISTS public.website_media (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image/jpeg',
    category TEXT DEFAULT 'general',
    alt_text TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    file_size INT DEFAULT 0,
    uploaded_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'active'
);

-- 6. Website Gallery
CREATE TABLE IF NOT EXISTS public.website_gallery (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'Tourism',
    alt_text TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    display_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Website Promotional Offers
CREATE TABLE IF NOT EXISTS public.website_offers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    discount_type TEXT DEFAULT 'percentage', -- 'percentage', 'fixed'
    discount_value TEXT DEFAULT '15% OFF',
    start_at TIMESTAMPTZ DEFAULT now(),
    end_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    button_text TEXT DEFAULT 'Claim Offer',
    button_url TEXT DEFAULT '#booking',
    status TEXT DEFAULT 'active', -- 'draft', 'scheduled', 'active', 'expired'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Blog Categories & Posts
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT DEFAULT '',
    content TEXT DEFAULT '',
    featured_image_url TEXT DEFAULT '',
    category_id TEXT DEFAULT 'Route Guide',
    author_name TEXT DEFAULT 'Mannar Green Ride Team',
    status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'archived'
    published_at TIMESTAMPTZ DEFAULT now(),
    seo_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Customer Testimonials
CREATE TABLE IF NOT EXISTS public.website_testimonials (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    author_name TEXT NOT NULL,
    author_role TEXT DEFAULT 'Cyclist / Tourist',
    quote TEXT NOT NULL,
    rating INT DEFAULT 5,
    avatar_url TEXT DEFAULT '',
    display_order INT DEFAULT 0,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Dedicated SEO & Keyword Metadata
CREATE TABLE IF NOT EXISTS public.seo_metadata (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    page_slug TEXT UNIQUE NOT NULL, -- 'global', 'home', 'services', 'about', 'contact', 'blogs'
    seo_title TEXT NOT NULL DEFAULT '',
    meta_description TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '',
    canonical_url TEXT DEFAULT '',
    og_title TEXT DEFAULT '',
    og_description TEXT DEFAULT '',
    og_image_url TEXT DEFAULT '',
    robots_index BOOLEAN DEFAULT true,
    robots_follow BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Website CMS Audit Log
CREATE TABLE IF NOT EXISTS public.website_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL DEFAULT 'admin',
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'PUBLISH', 'DELETE'
    module TEXT NOT NULL, -- 'SETTINGS', 'HERO', 'SERVICES', 'OFFERS', 'BLOGS', 'SEO'
    record_id TEXT DEFAULT '',
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- SAFE NON-FINANCIAL BUSINESS STATS FUNCTIONS
-- Excludes all revenue, payment, deposit and cashier figures
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_public_business_stats()
RETURNS TABLE (
    total_customers BIGINT,
    registered_vehicles BIGINT,
    completed_services BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (SELECT count(*)::bigint FROM public.customers) AS total_customers,
        (SELECT count(*)::bigint FROM public.vehicles) AS registered_vehicles,
        (SELECT count(*)::bigint FROM public.rentals WHERE status = 'completed') AS completed_services;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_customers', (SELECT count(*)::bigint FROM public.customers),
        'registered_vehicles', (SELECT count(*)::bigint FROM public.vehicles),
        'available_vehicles', (SELECT count(*)::bigint FROM public.vehicles WHERE status = 'available'),
        'completed_services', (SELECT count(*)::bigint FROM public.rentals WHERE status = 'completed'),
        'active_rentals', (SELECT count(*)::bigint FROM public.rentals WHERE status = 'active'),
        'published_pages', (SELECT count(*)::bigint FROM public.website_pages WHERE status = 'published'),
        'active_offers', (SELECT count(*)::bigint FROM public.website_offers WHERE status = 'active'),
        'blog_posts', (SELECT count(*)::bigint FROM public.blog_posts WHERE status = 'published'),
        'gallery_images', (SELECT count(*)::bigint FROM public.website_gallery WHERE is_visible = true)
    ) INTO result;
    RETURN result;
END;
$$;

-- Grant execute to public and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_business_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO anon, authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Public read on published records, Authenticated full management
-- ==============================================================================

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_audit_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous public read policies
CREATE POLICY "Public can read public settings" ON public.website_settings FOR SELECT USING (is_public = true);
CREATE POLICY "Public can read published pages" ON public.website_pages FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read published sections" ON public.website_sections FOR SELECT USING (status = 'published' AND is_visible = true);
CREATE POLICY "Public can read published services" ON public.website_services FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read active media" ON public.website_media FOR SELECT USING (status = 'active');
CREATE POLICY "Public can read visible gallery" ON public.website_gallery FOR SELECT USING (is_visible = true AND status = 'published');
CREATE POLICY "Public can read active offers" ON public.website_offers FOR SELECT USING (status = 'active');
CREATE POLICY "Public can read blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Public can read published blog posts" ON public.blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read testimonials" ON public.website_testimonials FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read seo metadata" ON public.seo_metadata FOR SELECT USING (true);

-- Authenticated full access policies (Single Admin role access)
CREATE POLICY "Auth users full access settings" ON public.website_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access pages" ON public.website_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access sections" ON public.website_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access services" ON public.website_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access media" ON public.website_media FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access gallery" ON public.website_gallery FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access offers" ON public.website_offers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access blog_categories" ON public.blog_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access blog_posts" ON public.blog_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access testimonials" ON public.website_testimonials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access seo" ON public.seo_metadata FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access audit_logs" ON public.website_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon insert to audit logs for monitoring if needed, or auth only
CREATE POLICY "Auth can insert audit log" ON public.website_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
