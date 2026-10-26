# Kovai Fresh Cuts implementation status

## Implemented in GitHub
- React 19 + TypeScript + Vite responsive website
- Home, shop, product detail and cart load products, cuts, variants and demo prices from Supabase `catalogue` Edge Function
- TanStack Query caches catalogue responses and displays loading/error states
- Draft cart persists locally and displays current API prices for reference
- Supabase SQL schema, service-role-only order creation procedure, demo seed SQL
- Edge Function source for `catalogue`, `create-order` and `verify-payment`
- Checkout form exists but requires valid delivery slots and a deployed, tested payment backend
- Admin and customer tracking placeholders remain protected/unavailable

## Already done by project owner
- Created Supabase project qpotkhsladbwejekeodz
- Applied initial two database migration scripts
- Applied demo seed and deployed the catalogue function
- Verified catalogue API returns two demo products, twelve variants and four zones

## Outstanding before real orders
- Real catalogue and business prices, approved photos, logo and legal policies
- Confirm postal code coverage, charges, order cutoff, delivery schedule and slot capacity
- Deploy/test create-order only after implementing rate limiting, abuse controls and payment reconciliation
- Add payment webhook signature validation, idempotency, pending-order expiry and refund handling
- Supabase Auth admin access with secure role checks, operational dashboard
- Customer ownership verification, secure order tracking
- Test all flows (browser, database, concurrent orders, payments) and deploy production site

**This repository is not production-ready. Never accept real orders or money using the demo dataset.**

## How to see live catalogue
1. `git pull origin main`
2. Confirm `.env` or `.env.local` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase publishable key).
3. `npm install`
4. `npm run dev` and open `/shop`.

This development integration has not been independently built or browser-tested in this session.

## Sunday-only schedule (October 26, 2026)
- Migration `202610260001_sunday_only_delivery.sql` must be applied in Supabase SQL Editor.
- Active delivery slots restricted to Sundays (database triggers); weekday slots deactivated.
- Store setting `ordering_rules.delivery_days=[7]` (`7` = Sunday) and timezone `Asia/Kolkata`.
- Delivery cutoff, time windows, capacity, delivery fees and eligible PIN codes remain owner decisions.
- No orders can proceed until owner-approved cutoff is configured and real Sunday slots are added.
- Redeploy `catalogue` Edge Function to filter API slots to Sundays, and pull frontend changes.
