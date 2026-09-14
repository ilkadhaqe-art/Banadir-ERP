# Sales + Delivery + Cargo as one operational engine

This is a large build. It extends the existing canonical engines (financial chain, inventory movements, customer balances, payment accounts, RBAC/RLS) rather than adding new ones. Work is grouped into phases that each end in a working, verifiable state.

## Phase 1 — Database foundation

- **Sale reference**: switch numbering to the plain sequential `S00001` format, backed by a sequence so numbers are never reused or duplicated under concurrent users. Existing sale numbers stay as-is.
- **Sale time**: add a sale timestamp alongside the existing date, editable and defaulting to now.
- **VAT**: add VAT rate/amount columns on sales. Selecting Merchant applies 5% dynamically; the rate lives in settings, not in code.
- **Fulfillment on the sale**: sales carry pickup / delivery / cargo, delivery fee, cargo fee, recipient name and phone, location, zone, region.
- **Hormaris (advance) reconciliation**: an advance is applied to the delivery/cargo charge first, and any excess reduces the sale balance. Under-payment leaves the delivery remainder collectible. Implemented once, in the database, so no dollar is counted twice.
- **Locations as one dataset**: districts/zones/regions unified into a single location table with a level (district vs region), replacing duplicate zone/region concepts. Existing zones migrate into it.
- **Rate tables**: delivery-company-by-district rates and cargo-company-by-region rates, fully editable, with effective dates.
- **Drivers**: optional company name/phone so independent moto/bajaaj/car drivers are supported.
- **Tracking events**: one event log for delivery and cargo status transitions (assigned, picked up, in transit, arrived, delivered, handed to cargo office, sent, customer received, collected, failed, returned) with driver, amount collected, note, timestamp, actor.
- **Audit**: extend the existing audit log to cover sale edits, collections, returns, delivery/cargo status and rate changes (who, what, before, after, when).
- **Edit/reverse RPCs**: `update_sale` and `reverse_sale` that re-post inventory and financial transactions atomically and rebuild the financial chain from the earliest affected date forward, so backdating and edits propagate automatically.

## Phase 2 — Sales workflow

- Rebuilt New Sale popup: product cards showing image, name, SKU, barcode, price, stock, unit, category, brand; search; stock validation.
- Smart defaults from real history: most-sold product, most-used payment method, delivery company, driver, district, cargo company, region — all computed, none hardcoded, all overridable.
- Defaults on open: EVC Plus, Full payment, Pickup; editable date and time.
- Payment modes: full paid, partial/Hormaris, full debt, with a live breakdown of total, VAT, delivery/cargo fee, advance applied, paid, remaining sale, remaining delivery.
- Edit Sale popup reusing the same form, plus reverse/void with reason.

## Phase 3 — Delivery and Cargo

- Fulfillment-driven form: choosing Delivery reveals company, driver, recipient, district, zone, auto-filled rate and collection fields; Cargo reveals cargo company, region, cargo rate and cargo tracking; Pickup hides both.
- Delivery Tracking Center: reference, customer, phone, order summary, driver and phone, company, location, fee, to collect, collected, remaining, status, created/delivery/completion times.
- Cargo Tracking Center with the full handover → sent → in transit → arrived → received → collected workflow.
- Explicit Complete Delivery and Collected actions kept separate, so delivered never implies paid.
- Driver responsibility view: sale amount, paid before delivery, remaining sale, delivery charge, delivery paid/remaining, driver collected, still outstanding.
- Management popups for delivery companies, cargo companies, drivers, locations and both rate tables.

## Phase 4 — Statement, integration, verification

- Full Sale Statement popup preserving everything: identity, products with images, financials incl. VAT/discount/fees/advance, payment and account, collection history, fulfillment details with company/driver/location/zone/region/rate/status, and the audit history.
- Verify end to end that a sale updates inventory, customer balance, payment account, receivables, delivery/cargo, collections, financial chain, targets and dashboard — including a backdated sale rebuilding from that date forward.
- Responsive checks at 1440 / 834 / 390 px on every new screen and popup.

## Phase 5 — Deploy and environment safety

- Migrations applied automatically as part of deploy so schema stays in sync across environments.
- A clear on-screen message when the backend environment variables are missing, instead of a blank screen.

## Notes

- All logic lives in database functions already used by the app; the UI stays a thin caller. No second calculation engine.
- Permissions stay enforced by the existing role checks and row-level rules; UI hiding is cosmetic only.
