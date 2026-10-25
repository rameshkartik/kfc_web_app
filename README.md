# Kovai Fresh Cuts

React 19 + TypeScript + Vite storefront foundation for a Coimbatore fresh meat pre-order business.

## Run locally

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

## Current implementation

Responsive customer-facing home, shop, product options, local draft cart, contact and service areas; all planned customer and admin route paths are present with secure unavailable states.

**Not production-ready.** Product prices, stock, delivery dates, order submission and payment are deliberately disabled until Supabase roles/policies, live inventory and server-side Razorpay payment verification are implemented and tested. Product illustrations are placeholders, not real photos. No payments are accepted.

See `PROJECT_STATUS.md` for the delivery checklist. Copy `.env.example` to `.env.local` when public integration settings are available. Never commit secrets.
