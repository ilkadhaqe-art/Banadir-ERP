# New Sale — Master Upgrade

Everything below is added on top of the existing system. No existing table, RPC, view or page is deleted; the sales engine (stock, credit, VAT, targets) stays exactly as it is.

## 1. Payment method (grouped, EVC Plus default)

A new `payment_channels` table holds the full list, grouped as Wallets / Merchants / Banks / Other:

- Wallets: EVC Plus, Premier Wallet, Ebessa
- Merchants: Hormuud, Somtel, MyCash, Premier Bank
- Banks: Salaam Somali Bank, Premier Bank, MyBank, IBS, SomBank, Amal Bank, Amaana Bank
- Other Banks (choosing it reveals a free-text **Bank Name** input, saved with the sale)

Each channel maps to one of the five existing engine methods (cash / evc_plus / edahab / merchant / bank), so all financial logic keeps working untouched. The sale stores `payment_channel_id` + optional `bank_name`. The dialog shows a grouped dropdown, default **EVC Plus**.

## 2. Product image upload (file, not URL)

- New private-to-public storage bucket `product-images`.
- Product Registration dialog: the "Image URL" field is replaced by an **Upload File** control (camera/gallery on phone, file picker on desktop) with preview and replace. The uploaded file's public URL is saved to the existing `products.image_url` column, so every existing usage keeps working.
- Add Products inside New Sale shows a clearly visible product thumbnail per row/search result (mobile + desktop), with a clean placeholder when no image exists. The chosen sale lines show the image too.

## 3. Ref NO

- Sale numbering switches format to `S00001`, `S00002`, … (sequence continues after existing sales; existing sale numbers are untouched).
- Ref NO is the **first field** of the New Sale form: auto-filled, editable, uniqueness enforced by the database (duplicate shows a clear error).
- Ref NO appears on the receipt.

## 4. Pickup / Delivery / Cargo as three separate workflows

- **Pickup**: no company, driver, location, fee — nothing delivery-related is rendered.
- **Delivery**: Delivery Company → Driver (only that company's drivers) → Location → delivery fee auto-filled from the company/location rate card (editable only if a rate is missing). Recipient / Recipient Phone are replaced by **Driver Name** and **Driver Phone** (auto-filled from the chosen driver). Cargo and pickup fields are hidden.
- **Cargo**: its own simple workflow — cargo company, cargo fee, note. No advance payment, no recipient, no recipient phone, no address, no full/partial/debt payment split.

## 5. New Customer Quick

The quick-add popup opened from New Sale is reduced to exactly three fields: Name, Phone, Address → Save.

## 6–9. Automatic RECEIPT (never called "Invoice")

On Save Sale the receipt opens automatically. It is a narrow, counter-friendly, mobile-friendly document showing: logo, business branding/contact, Receipt No + Ref NO, date & time, customer name/phone/address, products (image, qty, unit price, line total), subtotal, discount, delivery fee, total, payment method, paid amount, remaining balance, payment status (Paid / Partial / Debt), fulfillment info (type, delivery company, driver name & phone, location) when applicable, cashier and notes, plus header/footer text.

Actions: **Print**, **Download** (PDF), **Send via WhatsApp** (opens WhatsApp to the customer's number with the receipt summary and a link). Any sale can be reopened as a receipt later from the sales register.

## 10. Receipt Settings

New "Receipt" section in Settings (admin-editable, stored in the database — nothing hard-coded): business name, logo upload, phone, WhatsApp number, address, email, receipt header, footer, notes, terms, payment info.

## Technical notes

- Migrations: `payment_channels` table + seed, `sales.payment_channel_id` / `bank_name` columns, `S00001` numbering + editable-unique `sale_no`, receipt settings keys, `product-images` storage bucket and policies. `create_sale` / `update_sale` gain optional new parameters; all existing behaviour is preserved.
- Frontend: `SaleDialog` reworked into ref-no → customer → products → payment → fulfillment order; new `ReceiptDialog` + receipt settings panel; product image upload hook using Supabase Storage.
