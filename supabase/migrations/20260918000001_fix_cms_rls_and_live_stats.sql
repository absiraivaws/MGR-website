-- ==============================================================================
-- MANNAR GREEN RIDE - FIX CMS RLS POLICIES & ENHANCE LIVE STATS
-- Date: 2026-09-18
-- ==============================================================================

-- 1. Permissive Policies for Website CMS tables to allow Admin management
DROP POLICY IF EXISTS "Public can manage website_settings" ON public.website_settings;
CREATE POLICY "Public can manage website_settings" ON public.website_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_pages" ON public.website_pages;
CREATE POLICY "Public can manage website_pages" ON public.website_pages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_sections" ON public.website_sections;
CREATE POLICY "Public can manage website_sections" ON public.website_sections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_services" ON public.website_services;
CREATE POLICY "Public can manage website_services" ON public.website_services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_media" ON public.website_media;
CREATE POLICY "Public can manage website_media" ON public.website_media FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_gallery" ON public.website_gallery;
CREATE POLICY "Public can manage website_gallery" ON public.website_gallery FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_offers" ON public.website_offers;
CREATE POLICY "Public can manage website_offers" ON public.website_offers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage blog_categories" ON public.blog_categories;
CREATE POLICY "Public can manage blog_categories" ON public.blog_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage blog_posts" ON public.blog_posts;
CREATE POLICY "Public can manage blog_posts" ON public.blog_posts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_testimonials" ON public.website_testimonials;
CREATE POLICY "Public can manage website_testimonials" ON public.website_testimonials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage seo_metadata" ON public.seo_metadata;
CREATE POLICY "Public can manage seo_metadata" ON public.seo_metadata FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage website_audit_logs" ON public.website_audit_logs;
CREATE POLICY "Public can manage website_audit_logs" ON public.website_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Enhanced get_public_business_stats supporting live counts and settings overrides
CREATE OR REPLACE FUNCTION public.get_public_business_stats()
RETURNS TABLE (
    total_customers BIGINT,
    registered_vehicles BIGINT,
    completed_services BIGINT,
    active_rentals BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customers BIGINT;
    v_vehicles BIGINT;
    v_services BIGINT;
    v_active BIGINT;
    v_cust_override TEXT;
    v_veh_override TEXT;
    v_serv_override TEXT;
BEGIN
    -- Live counts
    SELECT count(*)::bigint INTO v_customers FROM public.customers;
    SELECT count(*)::bigint INTO v_vehicles FROM public.vehicles;
    SELECT count(*)::bigint INTO v_services FROM public.rentals WHERE status = 'completed';
    SELECT count(*)::bigint INTO v_active FROM public.rentals WHERE status = 'active';

    -- Check for optional admin manual overrides in website_settings
    SELECT setting_value INTO v_cust_override FROM public.website_settings WHERE setting_key = 'stat_customers_override';
    SELECT setting_value INTO v_veh_override FROM public.website_settings WHERE setting_key = 'stat_fleet_override';
    SELECT setting_value INTO v_serv_override FROM public.website_settings WHERE setting_key = 'stat_rides_override';

    IF v_cust_override IS NOT NULL AND v_cust_override ~ '^[0-9]+$' THEN
        v_customers := v_cust_override::bigint;
    END IF;

    IF v_veh_override IS NOT NULL AND v_veh_override ~ '^[0-9]+$' THEN
        v_vehicles := v_veh_override::bigint;
    END IF;

    IF v_serv_override IS NOT NULL AND v_serv_override ~ '^[0-9]+$' THEN
        v_services := v_serv_override::bigint;
    END IF;

    RETURN QUERY SELECT v_customers, v_vehicles, v_services, v_active;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_business_stats() TO anon, authenticated;
