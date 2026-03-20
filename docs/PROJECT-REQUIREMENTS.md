# Project Requirements Checklist

Everything that needs to be gathered **before development starts** on a new project cloned from base_system. Share this checklist with copywriters, designers, translators, and stakeholders.

---

## 1. Brand Identity

| Item | Description | Format | Who Provides |
|------|-------------|--------|--------------|
| Project name | Official name shown in browser tab, SEO, emails | Text | Stakeholder |
| Tagline / description | One-line description for SEO and social previews | Text (under 160 chars) | Copywriter |
| Logo (primary) | Main logo for navbar and emails | SVG or PNG (transparent bg) | Designer |
| Logo (icon) | Square icon for favicon and mobile | SVG or PNG, 512x512px min | Designer |
| Favicon | Browser tab icon | `.ico` or `.png`, 32x32px | Designer |
| OG image | Social media preview when link is shared | PNG/JPG, 1200x630px | Designer |
| Brand colors | Primary, secondary, accent, background, text colors | Hex codes | Designer |
| Brand fonts | Heading font, body font, caption font (if custom) | Font files or Google Fonts names | Designer |

**Where it goes:** Logo/favicon/OG image go in `/public/`. Colors and fonts go in `globals.css` and `tailwind.config.ts`.

---

## 2. Copywriting (per locale)

All text content must be provided for each supported language. The base_system supports `en` (English) and `jp` (Japanese) by default. Add more locales as needed.

### Homepage

| Section | Content Needed | Notes |
|---------|---------------|-------|
| Hero | Headline, subheadline, CTA button text | First thing visitors see |
| About Us | Company/product description (2-3 paragraphs) | Who you are, what you do |
| Features / Services | 3-6 feature titles + descriptions | What you offer |
| Testimonials | Client quotes, names, titles, company, photo | Social proof (if applicable) |
| CTA section | Headline, description, button text | Final call-to-action |
| Contact form labels | Name, email, phone, company, message, submit button | Match Zod schema fields |

### Navigation

| Item | Content Needed |
|------|---------------|
| Nav links | Label + destination for each menu item (e.g., "About" -> "/#about") |
| Mobile menu | Same as nav, confirm order |
| Language switcher labels | "EN" / "JP" or full names |

### Footer

| Item | Content Needed |
|------|---------------|
| Copyright text | e.g., "2026 Company Name. All rights reserved." |
| Footer links | Privacy Policy, Terms of Service, any other legal pages |
| Company address | Physical address (if applicable) |
| Contact info | Email, phone number |

### Legal Pages

| Page | Content Needed | Notes |
|------|---------------|-------|
| Privacy Policy | Full legal text | Required by law in most jurisdictions |
| Terms of Service | Full legal text | Required for SaaS/e-commerce |
| Cookie Policy | Full legal text | Required if using cookies/analytics |

### Email Templates

| Template | Content Needed | Notes |
|----------|---------------|-------|
| Contact confirmation | Thank you message sent to user after form submission | Currently says "We received your message" |
| Admin notification | Subject line format, any additional info to include | Sent to admin when contact form is submitted |

**Where it goes:** All translatable text goes in `messages/<locale>.json`. Legal pages go in `src/app/[locale]/privacy/` etc.

---

## 3. Translations

| Item | Details |
|------|---------|
| Source locale | Which language is the "source of truth" (usually `en`) |
| Target locales | List all languages needed (e.g., `jp`, `ko`, `th`, `vi`) |
| Translator contact | Who is responsible for each language |
| Translation format | All translations go in `messages/<locale>.json` — provide as JSON or spreadsheet |

**Important:** Every key in `messages/en.json` must exist in every other locale file. Missing keys will cause build errors.

### Translation checklist per locale

- [ ] All homepage sections
- [ ] Navigation labels
- [ ] Footer content
- [ ] Contact form labels + validation error messages
- [ ] Email template content
- [ ] Legal pages (Privacy Policy, Terms)
- [ ] SEO metadata (title, description)
- [ ] Error pages (404, 500 messages)

---

## 4. Social Media & External Links

| Platform | What's Needed | Example |
|----------|--------------|---------|
| Website URL | Production domain | `https://example.com` |
| Twitter / X | Profile URL | `https://x.com/company` |
| LinkedIn | Company page URL | `https://linkedin.com/company/name` |
| Facebook | Page URL | `https://facebook.com/company` |
| Instagram | Profile URL | `https://instagram.com/company` |
| YouTube | Channel URL | `https://youtube.com/@company` |
| GitHub | Repo or org URL (if public) | `https://github.com/company` |
| LINE | Official account URL (ASEAN) | `https://line.me/R/ti/p/@company` |
| WhatsApp | Business link | `https://wa.me/1234567890` |

**Where it goes:** `src/lib/core/config/site.ts` -> `social` object. Add platforms as needed.

---

## 5. Media Assets

| Asset | Description | Format | Where It Goes |
|-------|-------------|--------|---------------|
| Hero image/video | Main visual on homepage | JPG/PNG/MP4, high-res | `/public/images/` |
| Feature icons | Icons for services/features section | SVG preferred | `/public/icons/` or inline |
| Team photos | Headshots for team section | JPG/PNG, square, 400x400px min | `/public/images/team/` |
| Client logos | For testimonials or partner sections | SVG or PNG (transparent bg) | `/public/images/clients/` |
| Product screenshots | App/product visuals | PNG, high-res | `/public/images/` |
| Background patterns | Decorative backgrounds | SVG or PNG | `/public/images/` |

**Naming convention:** `kebab-case.ext` (e.g., `hero-banner.jpg`, `team-john-doe.png`)

---

## 6. Third-Party Accounts & Services

These accounts need to be created before deployment. Each is optional — only set up what the project needs.

### Required for all projects

| Service | What's Needed | Who Sets It Up | Notes |
|---------|--------------|----------------|-------|
| Vercel | Account + project | Dev team | Hosting and deployment |
| Domain | Domain name + DNS access | Stakeholder / Dev | Point to Vercel |
| GitHub | Repository | Dev team | Already exists for base_system |

### Optional (per module)

| Module | Service | What's Needed | Env Var |
|--------|---------|--------------|---------|
| Auth | Supabase | Project URL + keys | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Database | Supabase / Neon | Postgres connection string | `DATABASE_URL`, `DATABASE_URL_DIRECT` |
| Email | Resend | API key + verified sender domain | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_ADMIN_EMAIL` |
| Security | Arcjet | API key | `ARCJET_KEY` |
| Monitoring | Sentry | Project DSN + auth token | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| Analytics | Vercel Analytics | Auto-configured on Vercel | No manual setup needed |
| Payments | Stripe | API keys (if e-commerce/SaaS) | Add to env schema when needed |

### Email sender verification

For Resend to send emails, the sender domain must be verified:
1. Add domain in Resend dashboard
2. Add DNS records (DKIM, SPF, DMARC) provided by Resend
3. Wait for verification (usually < 1 hour)
4. Set `RESEND_FROM_EMAIL` to an address on the verified domain

---

## 7. SEO & Analytics

| Item | Content Needed | Who Provides |
|------|---------------|--------------|
| Meta title | Page title for search engines (under 60 chars) | Copywriter |
| Meta description | Page description for search results (under 160 chars) | Copywriter |
| OG title | Title shown in social media previews | Copywriter |
| OG description | Description shown in social media previews | Copywriter |
| Google Search Console | Verify site ownership | Dev team |
| Google Analytics ID | GA4 measurement ID (if using alongside Vercel Analytics) | Stakeholder |
| Sitemap pages | List of all public pages to include in sitemap | Dev team + Stakeholder |
| Robots exclusions | Any pages that should NOT be indexed | Stakeholder |

**Where it goes:** Default metadata in `src/lib/core/config/site.ts`. Per-page overrides in each page's `generateMetadata()`.

---

## 8. Contact & Business Information

| Item | Example | Notes |
|------|---------|-------|
| Business email | contact@company.com | Shown on site, receives form submissions |
| Admin email | admin@company.com | Receives contact form notifications (RESEND_ADMIN_EMAIL) |
| Phone number | +1 234 567 8900 | Include country code |
| Physical address | 123 Street, City, Country | For footer / contact page |
| Business hours | Mon-Fri 9:00-18:00 JST | For contact page |
| Google Maps embed | Embed URL or coordinates | If showing map on contact page |

---

## 9. Design & UX Specifications

| Item | Description | Who Provides |
|------|-------------|--------------|
| Figma / design file | Complete design mockups | Designer |
| Responsive breakpoints | Mobile, tablet, desktop layouts | Designer |
| Animation preferences | Fade-in, slide-up, parallax, etc. | Designer |
| Dark mode | Whether to support dark mode | Stakeholder |
| Loading states | Skeleton screens, spinners | Designer |
| Error states | Error message styling, empty states | Designer |
| Form validation UX | Inline errors, toast notifications | Designer |

---

## Quick-Start Checklist

Copy this checklist when starting a new project. Cross off items as they're received.

### Must-have before development

- [ ] Project name and tagline
- [ ] Logo (SVG) + favicon
- [ ] OG image (1200x630px)
- [ ] Brand colors (hex codes)
- [ ] Brand fonts
- [ ] Homepage copy (all sections) — in primary language
- [ ] Navigation structure (links and labels)
- [ ] Footer content (links, copyright, contact info)
- [ ] Social media URLs
- [ ] Contact/admin email addresses
- [ ] Domain name decided
- [ ] Design mockups (Figma or similar)

### Must-have before deployment

- [ ] All translations complete for every supported locale
- [ ] Legal pages (Privacy Policy, Terms of Service)
- [ ] Vercel project created and domain connected
- [ ] Resend domain verified (if using email)
- [ ] Supabase project created (if using auth/database)
- [ ] Sentry project created (if using monitoring)
- [ ] Arcjet account set up (if using security features)
- [ ] All env vars set in Vercel project settings
- [ ] SEO metadata finalized (meta titles, descriptions)
- [ ] OG image and favicon uploaded to `/public/`
- [ ] Sitemap updated with all public routes
- [ ] Google Search Console verified

### Nice-to-have

- [ ] Testimonials with client photos and quotes
- [ ] Team photos and bios
- [ ] Blog content (if applicable)
- [ ] Case studies
- [ ] Product screenshots
- [ ] Video content (hero video, explainer)
- [ ] Custom illustrations / icons
