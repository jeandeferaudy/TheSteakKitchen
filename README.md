# The Steak Kitchen

Custom Next.js ecommerce storefront and admin back office for The Steak Kitchen.

## Current Status

The project is actively in development and already supports the core ordering and admin workflows.

Implemented and working:
- storefront product grid and product drawer
- cart and checkout flow
- customer account signup and login
- customer profile drawer
- my orders and reviews flows
- admin orders, customers, purchases, inventory, analytics, and reviews drawers
- payment proof upload during checkout
- branded order email flow
- customer-level Steak Credits enable/disable
- customer-level Steak Credits balance management
- Steak Credits application in cart and checkout totals
- customer cleanup tools in admin:
  - delete orphan customer
  - link customer to user
  - combine duplicate customers
  - delete linked user when server capability is configured
- customer profile editing popup in the customer drawer
- loyalty program settings drawer scaffold and persistence for:
  - offer steak credits to guests to encourage account creation
  - auto-activate steak credits for guests who create an account

Recent important fixes:
- image optimization added for key storefront surfaces
- product thumbnail handling fixed so a dedicated thumbnail is preserved
- mobile user dropdown visibility fixed
- customer drawer made scrollable
- customer actions moved below the order list
- customer email editing supports clearing the email
- customer overview email source aligned with customer records
- checkout can reuse the logged-in customer's linked customer record
- earned Steak Credits calculation reverted to the original pre-discount basis
- deleting an order now returns packed quantities to inventory

## Project Structure

Main areas:
- `src/app/page.tsx`
  Main application shell and state orchestration.
- `src/components/`
  Drawers, modals, and admin UI.
- `src/lib/`
  Supabase data helpers and business logic.
- `supabase/migrations/`
  Database schema and function updates.

## Local Development

Run the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

Expected local environment variables include:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is required for the admin delete-user capability.

## Database / Migrations

Recent migrations added for the current feature set:
- `20260405_add_customer_steak_credits_enabled.sql`
- `20260405_reuse_linked_customer_in_checkout.sql`
- `20260405_fix_customer_overview_email_source.sql`
- `20260405_use_customer_email_only_in_overview.sql`
- `20260405_add_admin_customer_cleanup_rpcs.sql`
- `20260405_add_loyalty_program_settings.sql`
- `20260405_apply_steak_credits_in_checkout.sql`

If local or production behavior looks inconsistent, first verify that the latest Supabase migrations have been applied.

## Notes

- `profiles` and `customers` are separate objects.
- Every signed-up user should have a linked customer.
- A customer may exist without a user account yet, for example for guest checkout or orders placed on behalf.
- Steak Credits visibility is customer-based and controlled by `customers.steak_credits_enabled`.

## To Do

- test all ordering scenarios with and without credits
- add referral Steak Credits program
- add promotions
- add a magic invitation link to invite past customers
