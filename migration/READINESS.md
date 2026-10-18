# Database migration readiness audit — 2026-10-18

Inspected repository commit: `f7d26d19fc6e566c2381a85e37bffd6d3888b3a6`.

**Not ready for production cutover.** Repository inspection establishes application structure, not the identity, contents or deployment state of any production database. The follow-up audit used read-only Sites metadata and database-schema inspection. No customer rows, credentials or bucket objects were read; no production data, secrets, deployments or domains were changed. `migration/status.json` is historical evidence, not a live status probe.

## What must survive

| Data | Preservation requirement |
| --- | --- |
| `orders` | All IDs, names, phones, cities, addresses, original item JSON (including historical prices/discounts), totals, delivery fees/regions, payment methods, status, notification IDs/errors, timestamps |
| `inquiries` | All IDs, customer contact details, messages, status, timestamps |
| `managed_books` | Exact JSON and IDs, including new products, catalogue overrides, unpublished/hidden books, original prices, percentage/fixed discounts, cover references and timestamps |
| `admin_credentials` | Existing username, hash, salt and revision unchanged; do not run account setup/reset |
| `admin_sessions`, `admin_login_limits` | Preserve in private backup; any later expiry/revocation policy requires a separate decision, not an implicit migration side effect |
| Other database tables | Preserve all, including migration history, provider metadata and future tables; review provider-internal tables before a cross-provider import |
| Bucket objects | All object bytes and keys, including unreferenced uploads; retain HTTP/custom metadata from provider export |
| Static catalogue/assets | Keep matching application commit and local covers; catalogue aliases/hidden entries must not be dropped |
| Runtime configuration | Separately inventory provider bindings and secrets through authenticated controls; never put secret values in this repository |

Six `drizzle/*.sql` migrations create/extend the six application tables. They do not copy customer data. Orders have no foreign-key relationship to the catalogue: an old order may legitimately refer to a removed product. Never reprice historical orders against today's catalogue. `managed_books.data` is the complete replacement record used by `lib/products.ts`, so exporting only visible storefront products loses hidden products and edits.

`lib/order-utils.ts` supports Cash on Delivery and FIB with delivery fees of 5,000/7,000 IQD. Product discounts are embedded in product JSON, not a separate discount table. This change does not alter either behavior.

The catalogue test passes for 6,369 records, 5,977 published books and local live images. The old README/status warning about absent repository images is stale. Static images do not prove that later owner uploads are present.

`scripts/cloudflare-deploy.mjs` applies remote D1 migrations and deploys a Worker. It neither transfers data nor validates parity. Do not run it as a data migration. No existing runtime endpoint provides a complete authenticated database/bucket export. Admin list routes are insufficient substitutes for a complete snapshot.

## Supported transfer scope

`transfer.py` requires Python 3.10+ and uses only the standard library. It operates on a trusted **local SQLite snapshot supplied by an authenticated provider export**, plus a complete local bucket export and metadata. It has no network connection or live import endpoint. It does not execute SQL dumps, merge databases, update existing records, reset credentials, modify secrets, apply schema migrations or deploy anything.

The SQLite backup API takes a consistent database snapshot, including committed WAL records. All tables, indexes, triggers, schema and values are retained. Bucket/database consistency still requires a source write freeze while acquiring both exports. Freeze all order/inquiry/product/upload/admin writers through the source host's supported controls, then export. Do not infer consistency from a database snapshot alone.

Bucket export input is a directory with object keys as relative paths. Metadata input is a JSON object keyed by exactly those keys; each value should preserve provider `httpMetadata` and `customMetadata`. Supply `{}` and an empty directory only when an authenticated bucket inventory proves it is empty. The tool checks key coverage and byte hashes; it cannot prove remote export completeness or metadata correctness.

Example commands, with private paths outside the checkout:

```sh
python3 migration/transfer.py export \
  --database /private/source.sqlite \
  --objects /private/bucket-objects \
  --metadata /private/bucket-metadata.json \
  --output /private/nagi-snapshot
python3 migration/transfer.py verify --bundle /private/nagi-snapshot
python3 migration/transfer.py restore \
  --bundle /private/nagi-snapshot --output /private/nagi-rehearsal
python3 -m unittest discover -s migration/tests -v
```

Restore means import into a **new offline directory**, containing `database.sqlite`, `objects/`, metadata and manifest. Existing destinations, even empty ones, are refused. The original database and bucket export are never modified. To reverse a rehearsal, discard only the new directory; retain the original host and immutable snapshot. This is not a remote D1/R2 importer. A provider adapter must be designed after source and destination accounts and capabilities are verified; do not feed the database file directly to Wrangler's SQL import option.

Manifests record SHA-256 per file, table counts and order-independent hashes of every row and the schema. Verification checks exact equality, SQLite integrity, foreign keys, product IDs and uploaded-cover references. Invalid JSON/item structure blocks export. Missing customer fields, legacy payment/region values and historical total discrepancies generate aggregate warnings without rewriting history. Review every warning before cutover. Hashes detect accidental changes, not malicious replacement of both a snapshot and its manifest; keep a trusted copy/hash through a separate secure channel.

Snapshots contain customer PII and credential/session material. Outputs use private filesystem permissions; use encrypted storage and secure authenticated transfer. Do not attach them to issues/PRs, put them under public assets, or commit them. The CLI prints aggregate counts only. Metadata is retained as supplied, not applied to a live bucket.

## Production gates still required

1. Establish actual source/destination account, database and bucket identities, deployed commit, all writers, schema version, and authenticated backup/export capabilities. The original Sites publication is confirmed active by the Sites service; external Cloudflare account/deployment and complete data inventory remain unverified.
2. Capture private source counts and inventory, freeze writes, acquire a complete consistent database/bucket export and retain an independent rollback backup. Reconcile any schema mismatch on a disposable copy only.
3. Run export, verification and restore rehearsal. Review warnings, compare source counts with authenticated provider counts, inspect customer fields privately, confirm exact product JSON/discount/hidden-record parity and validate every static/uploaded image.
4. Implement/review provider-specific empty-target import after capabilities are known. Preserve IDs and metadata, avoid replace/upsert semantics, and never touch an existing target's customers/admin credentials. Back up any target with data and stop for reconciliation rather than overwriting it.
5. Verify restored owner login without setup/reset, inquiry and order history, product edits, image serving/metadata, discounts, both payment methods and both delivery regions on an isolated staging deployment. Use synthetic test transactions and distinguish them from imported counts.
6. Reconcile writes since rehearsal using a final freeze and fresh snapshot; prove final parity before separately authorizing cutover. This work does not change the live domain.
7. Keep source and backups intact. A later live rollback must first preserve new destination orders/edits and reconcile them; switching back blindly after accepting new writes would lose data.

## Validation performed

Fourteen offline tests pass, including committed WAL preservation, detection of changing bucket files, metadata-shape validation, rejection of nested destinations, special files and root symlinks, plus: full round trip (Unicode, historical order, hidden discounted product, credentials, sessions, unknown binary table and cover metadata); rejection of overwritten destinations, tampered database/assets, missing assets/metadata, malformed products and symlinks; legacy anomaly reporting. All five existing checks pass: product, discount, catalogue, product-route integration and Cloudflare administrator setup integration. The missing pinned TypeScript 5.9.3 test dependency was installed in an isolated temporary directory without changing the lockfile. No full build, end-to-end production checkout, or complete production data validation is claimed.

## Verified follow-up hosting evidence

On 2026-10-18, authenticated Sites `get_site` confirmed Nagi Book Store is active and public at `https://nagi-book-store.ahmed-mayi.chatgpt.site`, with latest version number 25. This does not establish the deployment state of a separate Cloudflare Worker or custom domain.

Authenticated database overview returned binding `DB` with exactly the six expected user tables: orders, inquiries, managed_books, admin_credentials, admin_sessions and admin_login_limits, with no omitted identifiers. Schema presence is not a data backup, row-count validation or complete export. No customer/credential rows were retrieved.

Available Sites tools offer bounded row inspection, but no complete database snapshot or bucket export. A search for a Cloudflare plugin returned no matching connector. A verified provider export and destination access are still required to complete live migration. The original store remains untouched; do not merge as an excuse to deploy or cut over before the production gates above pass.
