# Nagi Book Store

**Migration status: source code prepared; cover-image transfer is pending approval. Do not deploy until all `public/assets` files are present.**

Bookstore with 5,977 published books, local covers, owner product management, percentage/IQD discounts, delivery pricing, WhatsApp checkout and saved order requests.

The existing store stays live at https://nagi-book-store.ahmed-mayi.chatgpt.site until the Cloudflare migration is completed. A GitHub repository alone does not host this application. Do not use GitHub Pages.

## Deploy to your Cloudflare account

1. Create a D1 database named `nagi-book-store` and copy its database ID.
2. Create an R2 bucket named `nagi-book-covers` for future owner uploads. Catalogue covers are included in this repository as static assets.
3. Under Workers & Pages, connect this GitHub repository to a **Worker** named `nagi-book-store`, production branch `main`.
4. Set build command `npm run build:cloudflare` and deploy command `npm run deploy:cloudflare`.
5. Add the build variable `NAGI_D1_DATABASE_ID` with the actual database ID. If the bucket has another name, also set build variable `NAGI_R2_BUCKET`.
6. Deploy. The deploy command applies the versioned database migrations before publishing.
7. In the Worker's runtime settings, add a **secret** named `NAGI_SETUP_TOKEN`: a unique random key of at least 32 characters. Never put it in GitHub, source files, a URL or a chat message. Redeploy if Cloudflare asks you to apply the secret.
8. Visit `/admin/setup` on the new Worker URL. Enter that setup key, a username and a password of at least 16 characters. Keep the setup key private; it can reset the owner's account.
9. The owner can then use `/admin/login` to manage products, upload covers, create/remove discounts and manage orders without GitHub or ChatGPT access.

The build needs Node 22.13 or newer and the pinned pnpm version from `package.json`. Cloudflare's build environment must have permissions for Workers deployment, D1 migrations and the configured R2 bucket. Review provider plan limits and any billing requirements when enabling services.

## Migration boundaries

This repository contains the audited catalogue and application code. It does **not** contain passwords, sessions, customer orders, inquiries, runtime secrets or later dashboard uploads/edits. Those remain in the original host's database/bucket and need a separate authenticated data migration before any final cutover. Do not change a domain until the new host, owner login, cover uploads, product creation, discounts and checkout have been verified.

The external-host setup uses the private Cloudflare setup secret rather than trusting ChatGPT identity headers. The original Sites publication remains unchanged.

## Checks

- `node scripts/test-products.mjs`
- `node scripts/test-discounts.mjs`
- `node scripts/test-product-routes.mjs`
- `node scripts/test-catalogue.mjs`
- `node scripts/test-cloudflare-setup.mjs`

The original `scripts/test-admin.mjs` targets Sites owner authentication and is retained as reference; use the Cloudflare setup test for this deployment target.
