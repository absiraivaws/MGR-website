# MANNAR GREEN RIDE
# WEBSITE BACKEND CMS APPLICATION
## Development Specification

**Project:** Mannar Green Ride Website Backend / CMS  
**Version:** 1.0  
**Public Website:** MGR Website  
**Backend Application:** Separate Website Administration Application  
**Database / Backend:** Existing Supabase Project  
**Deployment:** Vercel  
**Source Control:** GitHub  
**Development Approach:** Phase-by-phase

---

# 1. CRITICAL REQUIREMENT — PRESERVE EXISTING WEBSITE

The existing Mannar Green Ride public website must remain visually unchanged.

The development team MUST NOT change the existing:

- Theme
- Visual model
- Page layout
- Branding
- Colors
- Typography
- Navigation style
- Card design
- Buttons
- Spacing
- Responsive behavior
- Existing animations
- Existing section appearance
- Existing content positioning

The objective is **not to redesign the website**.

The objective is to create a separate backend application that allows authorized users to update the content displayed inside the existing design.

The current public website structure should therefore be treated as the approved frontend design.

---

# 2. OBJECTIVE

Create a separate secure Website Backend / CMS application for Mannar Green Ride.

The backend application will allow authorized users to manage:

- Website text
- Images
- Hero content
- Services
- Prices
- Promotional blocks
- Offers
- Gallery
- Blog / News
- About Us content
- Contact information
- Social media links
- SEO
- Website settings
- Selected live business statistics

The CMS must use the existing Supabase project.

Routine content updates must not require editing HTML/CSS/JavaScript, Git commits, or Vercel redeployment.

---

# 3. APPLICATION SEPARATION

```text
MGR PUBLIC WEBSITE
        |
        | Read published content
        v
     SUPABASE
        ^
        |
        | Manage website content
        |
MGR WEBSITE BACKEND / CMS
```

The existing Rental Management System may continue using the same Supabase project for operational data.

```text
                 EXISTING SUPABASE PROJECT
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
  Public Website     Website CMS      Rental System
      Content          Tables        Operational Data
```

The Website CMS must be a **separate application/interface** from the public website.

---

# 4. EXISTING PUBLIC WEBSITE

The current public website must be preserved. The developer must first inspect all existing pages, sections, CSS, JavaScript and assets before modifying data bindings.

The frontend migration should replace only hard-coded content values with CMS data.

Example:

```html
<h2>Bicycle Rental</h2>
<p>Rs.100 per hour</p>
```

Future concept:

```text
Existing HTML/Layout
        +
CMS Data from Supabase
        =
Same Website Appearance
with Editable Content
```

---

# 5. BACKEND APPLICATION

Create a dedicated website administration application.

Recommended application name:

```text
MGR Website Admin
```

Deploy it as a separate Vercel application. Do not expose administration functionality inside the public website.

---

# 6. BACKEND NAVIGATION

```text
Dashboard

Website Content
   ├── Home Page
   ├── Services
   ├── About Us
   ├── Contact
   └── Footer

Media
   ├── Media Library
   └── Gallery

Marketing
   ├── Offers
   ├── Blog / News
   └── Testimonials

Business Information
   ├── Website Pricing
   ├── Business Statistics
   ├── Contact Details
   └── Social Media

SEO
   ├── Page SEO
   └── Global SEO

Settings
   ├── Website Settings
   ├── Users
   └── Audit Log
```

---

# 7. CMS DASHBOARD

Display website-management information:

```text
Published Pages
Draft Changes
Active Offers
Blog Posts
Gallery Images
Last Website Update
Last Published By
```

Also display selected live business information from existing operational Supabase tables:

```text
Registered Customers
Total Vehicles
Available Vehicles
Currently Rented Vehicles
Vehicles Under Maintenance
Total Rentals
Today's Rentals
Completed Rentals
Today's Revenue
Monthly Revenue
```

These operational statistics must be calculated from existing tables. Do not duplicate operational records into CMS tables.

---

# 8. EXISTING SUPABASE SCHEMA REVIEW

Before creating any database objects:

1. Inspect existing Supabase tables.
2. Identify customer table.
3. Identify vehicle table.
4. Identify rental table.
5. Identify payment table.
6. Identify maintenance table.
7. Identify pricing configuration.
8. Identify existing profiles/users.
9. Identify current RLS policies.
10. Identify existing Storage buckets.

Do not assume table or column names. Do not create duplicate operational tables if they already exist.

---

# 9. WEBSITE CONTENT MANAGEMENT

The CMS should manage content without changing layout.

Editable properties may include:

```text
Heading
Subheading
Description
Button Text
Button URL
Image
Price Text
Badge Text
Display Status
Display Order
```

Only make fields editable where the existing website already has corresponding content. Do not automatically create new frontend designs.

---

# 10. HOME PAGE MANAGEMENT

Allow editing of existing Home Page content, including where present:

```text
Hero Heading
Hero Subheading
Hero Description
Hero Image
Primary Button Text
Primary Button Link
Secondary Button Text
Secondary Button Link
Service Content
Price Display
Why Choose Us
Statistics
Tourism Content
Gallery
Promotional Content
Call to Action
```

The CMS must preserve the existing visual presentation.

---

# 11. CONTENT BLOCKS

Where the existing website contains reusable blocks, store their content in Supabase.

Recommended block types:

```text
HERO
TEXT
IMAGE
TEXT_IMAGE
SERVICE
STATISTIC
GALLERY
OFFER
TESTIMONIAL
CTA
CONTACT
```

Suggested fields:

```text
id
page_id
section_key
section_type
title
subtitle
content
image_id
button_text
button_url
display_order
is_visible
status
created_at
updated_at
```

`section_key` maps the CMS record to an existing frontend section, for example:

```text
home_hero
home_services
home_statistics
home_gallery
home_cta
```

---

# 12. SECTION ORDER

Default behavior must preserve the current section order. If reordering is enabled later, it should be permission-controlled and must not change the approved design unless explicitly requested.

---

# 13. SERVICES MANAGEMENT

Create:

```text
Website Content
→ Services
```

Fields:

```text
Service Name
Short Description
Full Description
Image
Icon Reference
Displayed Price
Price Unit
Button Text
Button Link
Featured
Display Order
Status
```

Example:

```text
Bicycle Rental
Rs.100
Per Hour
```

---

# 14. WEBSITE PRICING

Support two pricing sources:

```text
AUTO
MANUAL
```

### AUTO

Read the applicable price from the existing rental pricing configuration.

### MANUAL

Allow an administrator to specify marketing/display pricing.

Manual display pricing must not silently change the operational rental calculation.

---

# 15. MEDIA LIBRARY

Use Supabase Storage.

Recommended bucket:

```text
website-media
```

Suggested folders:

```text
hero/
services/
gallery/
offers/
blog/
tourism/
about/
testimonials/
```

Admin functions:

```text
Upload
Preview
Select
Replace
Rename metadata
ALT Text
Caption
Category
Search
Archive
```

Do not store image binary data directly in normal database columns.

---

# 16. IMAGE REPLACEMENT

```text
Select Existing Website Image
        ↓
Upload / Select New Image
        ↓
Preview
        ↓
Save Draft
        ↓
Publish
        ↓
Public Website uses New Image
```

The image container, dimensions and frontend styling must continue to follow the existing theme.

---

# 17. GALLERY

Admin functions:

```text
Add Image
Edit Caption
ALT Text
Category
Show / Hide
Display Order
Archive
```

Suggested categories:

```text
Mannar
Cycling
Customers
Tourism
Fitness
Events
```

---

# 18. OFFERS

Fields:

```text
Offer ID
Title
Description
Image
Discount Type
Discount Value
Start Date
End Date
Button Text
Button URL
Status
```

Statuses:

```text
DRAFT
SCHEDULED
ACTIVE
EXPIRED
ARCHIVED
```

Offers may automatically become active/expired based on dates.

---

# 19. BLOG / NEWS

Functions:

```text
Create
Edit
Preview
Publish
Unpublish
Archive
```

Fields:

```text
Title
Slug
Summary
Content
Featured Image
Category
Author
Published Date
SEO Title
Meta Description
Status
```

Statuses:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Suggested categories:

```text
Mannar Tourism
Cycling
Fitness
Travel Tips
Mannar Green Ride News
Offers
Events
```

---

# 20. ABOUT US

Allow editing only of content within the existing About section/page, such as:

```text
Business Introduction
Our Story
Mission
Vision
Why Choose Us
Images
```

Do not redesign the section.

---

# 21. CONTACT DETAILS

Centralize:

```text
Business Name
Phone
WhatsApp
Email
Address
Google Maps Link
Opening Hours
Closing Hours
```

The public website should reference these settings instead of repeating hard-coded values.

---

# 22. SOCIAL MEDIA

Centralize:

```text
Facebook
Instagram
YouTube
TikTok
WhatsApp
```

---

# 23. SEO MANAGEMENT

Per-page fields:

```text
SEO Title
Meta Description
Keywords
Canonical URL
OG Title
OG Description
OG Image
Robots Index
Robots Follow
```

SEO management must not change visible website design.

---

# 24. GLOBAL WEBSITE SETTINGS

Recommended:

```text
Website Name
Logo
Favicon
Primary Phone
WhatsApp
Email
Currency
Business Address
Google Maps
Default SEO Image
Facebook
Instagram
YouTube
TikTok
Maintenance Mode
```

---

# 25. DRAFT / PREVIEW / PUBLISH

```text
Edit
 ↓
Save Draft
 ↓
Preview
 ↓
Publish
 ↓
Public Website Updated
```

Content states:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Do not show drafts publicly.

---

# 26. PREVIEW

Preview must:

- Use the existing theme
- Use the existing responsive design
- Show draft content
- Not modify production content
- Not be search-engine indexed

---

# 27. RECOMMENDED CMS TABLES

Create only after inspecting the current Supabase schema:

```text
website_settings
website_pages
website_sections
website_services
website_media
website_gallery
website_offers
blog_posts
blog_categories
seo_metadata
social_links
```

---

# 28. WEBSITE_SETTINGS

```text
id
setting_key
setting_value
setting_type
is_public
created_at
updated_at
```

---

# 29. WEBSITE_PAGES

```text
id
page_name
slug
title
status
created_at
updated_at
published_at
```

---

# 30. WEBSITE_SECTIONS

```text
id
page_id
section_key
section_type
title
subtitle
content
image_id
button_text
button_url
display_order
is_visible
status
created_at
updated_at
published_at
```

---

# 31. WEBSITE_MEDIA

```text
id
file_name
storage_path
media_type
category
alt_text
caption
file_size
uploaded_by
created_at
status
```

---

# 32. WEBSITE_SERVICES

```text
id
service_name
slug
short_description
description
image_id
icon_reference
price_source
manual_price
price_unit
button_text
button_url
featured
display_order
status
```

Price source:

```text
RENTAL_SYSTEM
MANUAL
```

---

# 33. WEBSITE_OFFERS

```text
id
title
description
image_id
discount_type
discount_value
start_at
end_at
button_text
button_url
status
created_at
updated_at
```

---

# 34. BLOG_POSTS

```text
id
title
slug
summary
content
featured_image_id
category_id
author_id
status
published_at
seo_title
meta_description
created_at
updated_at
```

---

# 35. SEO_METADATA

```text
id
page_id
seo_title
meta_description
keywords
canonical_url
og_title
og_description
og_image_id
robots_index
robots_follow
updated_at
```

---

# 36. LIVE OPERATIONAL STATISTICS

Read selected metrics from existing Supabase operational data:

```text
Total Registered Customers
Total Vehicles
Available Vehicles
Rented Vehicles
Reserved Vehicles
Maintenance Vehicles
Total Rentals
Active Rentals
Completed Rentals
Cancelled Rentals
Overdue Rentals
Today's Rentals
Today's Revenue
Monthly Revenue
```

These must be calculated from operational records, not manually duplicated.

---

# 37. PUBLIC BUSINESS STATISTICS

If the public website displays statistics, support:

```text
LIVE
MANUAL
```

Public statistics must never expose individual customer or transaction records.

---

# 38. SAFE STATISTICS LAYER

Do not give the anonymous website client unrestricted access to sensitive operational tables.

Use one of:

- Secure database view
- Supabase RPC/database function
- Server-side endpoint
- Server-side Supabase query

Example conceptual function:

```text
get_public_business_stats()
```

Return only approved aggregates.

---

# 39. AUTHENTICATION

Use Supabase Auth for Website Admin.

Minimum:

```text
Email
Password
Forgot Password
Secure Session
Logout
```

Recommended CMS roles:

```text
SUPER_ADMIN
WEBSITE_ADMIN
CONTENT_EDITOR
```

---

# 40. CMS PERMISSIONS

### SUPER_ADMIN
Full CMS and settings access.

### WEBSITE_ADMIN
Manage and publish website content.

### CONTENT_EDITOR
Create/edit drafts; publishing may require Website Admin permission.

Permissions must be enforced using RLS and server-side authorization, not only hidden buttons.

---

# 41. RLS

Enable Row Level Security for all CMS tables.

```text
PUBLIC
→ Read PUBLISHED public website records only

CONTENT_EDITOR
→ Read CMS + create/update drafts

WEBSITE_ADMIN
→ Create/update/publish/archive

SUPER_ADMIN
→ Full authorized CMS access
```

---

# 42. STORAGE SECURITY

Public website media may be publicly readable. Operational private documents must remain separate.

Never place customer, owner, driver or private transaction documents inside the public `website-media` bucket.

---

# 43. AUDIT LOG

Track:

```text
CREATE
UPDATE
PUBLISH
UNPUBLISH
ARCHIVE
IMAGE_CHANGE
PRICE_CHANGE
SEO_CHANGE
SETTINGS_CHANGE
```

Record:

```text
User
Action
Module
Record ID
Old Value
New Value
Timestamp
```

---

# 44. PUBLIC WEBSITE DATA INTEGRATION

For every hard-coded editable value:

1. Identify the existing element.
2. Preserve its HTML/CSS appearance.
3. Create/match a CMS field.
4. Fetch the published value.
5. Insert it into the existing element.
6. Verify visual output against the original.
7. Test desktop and mobile.

Do not redesign while performing the migration.

---

# 45. VISUAL REGRESSION REQUIREMENT

Before CMS integration, capture/reference the current website appearance.

After each frontend integration phase verify:

```text
Theme unchanged
Colors unchanged
Fonts unchanged
Layout unchanged
Spacing unchanged
Navigation unchanged
Cards unchanged
Buttons unchanged
Responsive behavior unchanged
```

Only content values should change.

---

# 46. PERFORMANCE

Use appropriate caching for:

```text
Website Settings
Published Pages
Services
Gallery
Offers
Blog
SEO
```

After publishing, revalidate/invalidate relevant cached data. Normal content updates must not require full deployment.

---

# 47. FAILURE HANDLING

If CMS/Supabase data cannot be loaded:

- Do not expose technical errors.
- Use safe fallback/cached published content where technically appropriate.
- Do not expose database credentials.
- Do not display private data.
- Keep the website usable where possible.

---

# 48. BACKEND RESPONSIVENESS

The CMS must work on desktop, laptop, tablet and mobile.

The user should be able to update price, text, offer, image and contact information from a mobile device.

---

# 49. DEVELOPMENT PHASES

## PHASE 1 — Audit Existing Website and Supabase

Do not change the public frontend.

Tasks:

- Inspect repository
- Identify every existing section
- Identify editable content
- Identify existing images
- Identify hard-coded prices
- Inspect Supabase schema
- Inspect Auth
- Inspect RLS
- Inspect Storage
- Identify operational statistics sources
- Document current visual baseline

**Acceptance:** Existing website is unchanged.

## PHASE 2 — Create Separate CMS Application

Create `MGR Website Admin` with:

- Login
- Authentication
- Role checking
- Dashboard shell
- Navigation
- Responsive layout

Do not integrate public frontend changes yet.

## PHASE 3 — CMS Database and Security

Create required CMS tables after schema review.

Implement:

- Foreign keys
- Indexes
- RLS
- Audit support
- Seed records for existing website content

Seed CMS using current website content so the first CMS-driven website looks the same as the current website.

## PHASE 4 — Content Management

Develop:

```text
Home
Services
About
Contact
Footer
Website Settings
Social Media
```

## PHASE 5 — Media Library

Develop upload, preview, select, replace, ALT text, caption, categories and archive using Supabase Storage.

## PHASE 6 — Pricing and Statistics

Develop:

- Website pricing
- AUTO/MANUAL price source
- Operational statistics
- Public-safe statistics
- Dashboard statistics

Do not modify operational rental calculations from website CMS unless explicitly authorized.

## PHASE 7 — Offers, Gallery and Blog

Develop offers, gallery, blog, categories, publish/unpublish and scheduled offers.

## PHASE 8 — Preview and Publish

Implement Draft, Preview, Publish and Archive. Preview must use the existing website theme.

## PHASE 9 — Public Website Data Binding

Progressively connect:

```text
Global Settings
Contact
Home Text
Services
Pricing
Images
Gallery
Offers
Blog
SEO
```

Perform visual regression verification after each step.

## PHASE 10 — SEO

Connect SEO Title, Meta Description, Canonical, Open Graph, Robots and structured data without altering visible design.

## PHASE 11 — Testing

Test authentication, permissions, RLS, content editing, images, pricing, statistics, draft, preview, publish, offers, blog, SEO, responsive layouts, public/private data separation and visual regression.

## PHASE 12 — Production Deployment

Deploy the CMS as a separate Vercel application while keeping the public website and Website Admin as separate interfaces sharing the approved Supabase backend.

---

# 50. OPENCODE DEVELOPMENT RULES

```text
1. Do not redesign the existing MGR public website.
2. Do not change the existing theme.
3. Do not change the existing visual model.
4. Do not change existing branding.
5. Do not change colors unless specifically requested.
6. Do not change fonts unless specifically requested.
7. Do not change layout unless specifically requested.
8. Do not change navigation unless specifically requested.
9. Do not change existing responsive behavior.
10. Create a separate Website Backend / CMS application.
11. Use the existing Supabase project.
12. Inspect existing Supabase tables before creating new tables.
13. Do not duplicate operational customer, vehicle, rental or payment data.
14. Use new tables only for CMS-specific content.
15. Use Supabase Auth.
16. Use Supabase RLS.
17. Use Supabase Storage for website media.
18. Keep public website media separate from private operational documents.
19. Replace hard-coded editable content progressively.
20. Preserve existing HTML/CSS visual output when binding CMS data.
21. Seed CMS using the existing website content.
22. The first CMS-driven public website must visually match the existing website.
23. Normal content updates must not require source-code editing.
24. Normal content updates must not require Vercel redeployment.
25. Support Draft → Preview → Publish.
26. Preview must use the existing public website theme.
27. Do not expose drafts publicly.
28. Do not expose sensitive operational data publicly.
29. Use controlled aggregate queries for public statistics.
30. Maintain audit logs.
31. Implement role-based permissions.
32. Make the CMS responsive.
33. Test desktop, tablet and mobile.
34. Perform visual regression checks after every public frontend integration.
35. Build phase-by-phase.
36. Do not continue to the next phase until the current phase is manually verified.
```

---

# 51. TARGET WORKFLOWS

### Change Website Price

```text
Admin Login
    ↓
Website Pricing
    ↓
Bicycle Rental
    ↓
Change Display Price
    ↓
Save Draft
    ↓
Preview
    ↓
Publish
    ↓
Existing Website Theme Displays New Price
```

### Change Image

```text
Admin Login
    ↓
Media Library
    ↓
Upload Image
    ↓
Home Page
    ↓
Select Existing Hero Section
    ↓
Choose New Image
    ↓
Preview
    ↓
Publish
    ↓
Same Hero Design / New Image
```

### Update Contact Number

```text
Admin Login
    ↓
Contact Details
    ↓
Change Phone
    ↓
Publish
    ↓
All Existing Website Locations Use New Phone
```

---

# 52. FINAL ARCHITECTURE

```text
                   MANNAR GREEN RIDE
                          |
        +-----------------+------------------+
        |                                    |
        v                                    v
PUBLIC WEBSITE                      WEBSITE BACKEND CMS
Existing Theme                       Separate Application
Existing Layout                              |
Existing Model                               |
        |                                    |
        +-----------------+------------------+
                          |
                          v
                 EXISTING SUPABASE
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
     CMS CONTENT      WEBSITE MEDIA   OPERATIONAL DATA
          |                               |
       Pages                           Customers
       Sections                        Vehicles
       Services                        Rentals
       Offers                          Payments
       Blog                            Maintenance
       SEO
```

---

# 53. FINAL PRINCIPLE

> **Keep the existing Mannar Green Ride website theme, model, layout and user experience unchanged. Build a separate secure CMS application that controls the website's editable content through the existing Supabase backend.**

The CMS changes the **content**, not the **design**.

The rental system remains the source of truth for operational business data, while the Website CMS becomes the source of truth for public website content.
