import type { Client } from "@libsql/client";

export async function seedDatabase(db: Client) {
  // Check if users already seeded
  const existingUsers = await db.execute("SELECT COUNT(*) as count FROM app_users");
  if (Number(existingUsers.rows[0]?.["count"] ?? 0) > 0) {
    return;
  }

  console.log("Seeding Banadir Online FOS initial business data...");

  await db.batch([
    // App Users
    {
      sql: `INSERT INTO app_users (id, email, full_name, role) VALUES 
        ('system', 'system@banadironline.com', 'System Automation Engine', 'admin'),
        ('usr-admin-1', 'admin@banadironline.com', 'Ahmed Nor (Owner & Admin)', 'admin'),
        ('usr-mgr-1', 'manager@banadironline.com', 'Hassan Omar (Operations Manager)', 'manager'),
        ('usr-cashier-1', 'sales@banadironline.com', 'Amina Yusuf (Lead Cashier)', 'cashier'),
        ('usr-driver-1', 'dispatch@banadironline.com', 'Mohamed Ali (Logistics Dispatcher)', 'driver')`,
      args: [],
    },
    {
      sql: `INSERT INTO user_roles (id, user_id, role) VALUES 
        ('ur-1', 'usr-admin-1', 'admin'),
        ('ur-2', 'usr-mgr-1', 'manager'),
        ('ur-3', 'usr-cashier-1', 'cashier'),
        ('ur-4', 'usr-driver-1', 'driver')`,
      args: [],
    },

    // App Settings
    {
      sql: `INSERT INTO app_settings (key, value, description) VALUES
        ('company_name', 'Banadir Online FOS', 'Business Name'),
        ('company_phone', '+252 61 500 0000', 'Official Hotline'),
        ('company_email', 'support@banadironline.com', 'Support Email'),
        ('company_address', 'KM4, Maka Al-Mukarama Rd, Mogadishu, Somalia', 'Head Office'),
        ('currency', 'USD', 'Base System Currency'),
        ('tax_rate', '0', 'Default VAT / Sales Tax Rate'),
        ('receipt_header', 'BANADIR ONLINE FOS\\nWholesale & Retail Command Center', 'Receipt Header'),
        ('receipt_footer', 'Thank you for choosing Banadir Online!\\nNo cash refunds after 48 hours.', 'Receipt Footer'),
        ('auto_delivery_assignment', 'false', 'Automatically assign closest driver')`,
      args: [],
    },

    // Payment Accounts
    {
      sql: `INSERT INTO payment_accounts (id, name, code, type, currency, opening_balance, current_balance) VALUES
        ('acc-cash-1', 'Main Cash Drawer', 'CASH-MAIN', 'cash', 'USD', 5000.00, 5000.00),
        ('acc-evc-1', 'EVC Plus Merchant (Hormuud)', 'MOMT-EVC-1', 'mobile_money', 'USD', 12500.00, 12500.00),
        ('acc-edahab-1', 'E-Dahab Merchant (Somtel)', 'MOMT-EDH-1', 'mobile_money', 'USD', 3400.00, 3400.00),
        ('acc-bank-1', 'Premier Bank Current Account', 'BANK-PRM-01', 'bank', 'USD', 45000.00, 45000.00),
        ('acc-bank-2', 'Dahabshiil Bank Commercial', 'BANK-DHB-01', 'bank', 'USD', 18000.00, 18000.00)`,
      args: [],
    },

    // Payment Channels
    {
      sql: `INSERT INTO payment_channels (id, name, group_name, method, requires_bank_name, is_default, sort_order, active, account_id) VALUES
        ('pch-cash', 'Physical Cash (USD)', 'Cash', 'cash', 0, 1, 1, 1, 'acc-cash-1'),
        ('pch-evc', 'EVC Plus (Hormuud)', 'Mobile Money', 'evc_plus', 0, 0, 2, 1, 'acc-evc-1'),
        ('pch-edahab', 'E-Dahab (Somtel)', 'Mobile Money', 'edahab', 0, 0, 3, 1, 'acc-edahab-1'),
        ('pch-premier', 'Premier Bank Transfer', 'Bank', 'bank', 1, 0, 4, 1, 'acc-bank-1'),
        ('pch-dahabshiil', 'Dahabshiil International Bank', 'Bank', 'bank', 1, 0, 5, 1, 'acc-bank-2')`,
      args: [],
    },

    // Expense Categories
    {
      sql: `INSERT INTO expense_categories (id, name, description) VALUES
        ('exp-cat-rent', 'Store & Warehouse Rent', 'Monthly leases for storefront and storage facilities'),
        ('exp-cat-salaries', 'Payroll & Staff Salaries', 'Base salaries, allowances, and bonuses'),
        ('exp-cat-fuel', 'Vehicle Fuel & Transport', 'Fuel for delivery bikes and vans'),
        ('exp-cat-utils', 'Utilities (Power, Water, Internet)', 'Electricity generators, water, fiber connection'),
        ('exp-cat-maint', 'Repairs & Maintenance', 'Vehicle servicing, equipment repairs'),
        ('exp-cat-pack', 'Packaging & Supplies', 'Boxes, tapes, thermal printer rolls, shopping bags'),
        ('exp-cat-mkt', 'Marketing & Advertising', 'Social media ads, SMS campaigns, banners')`,
      args: [],
    },

    // Product Categories
    {
      sql: `INSERT INTO product_categories (id, name, description) VALUES
        ('cat-phones', 'Smartphones & Tablets', 'Mobile phones, iPads, Android tablets'),
        ('cat-laptops', 'Laptops & Computers', 'Desktops, ultrabooks, monitors, keyboards'),
        ('cat-audio', 'Audio & Accessories', 'Headphones, earbuds, Bluetooth speakers, chargers'),
        ('cat-appliances', 'Home Appliances', 'Blenders, microwaves, electric kettles, fans'),
        ('cat-hardware', 'Networking & Smart Home', 'Routers, cables, solar lights, CCTV cameras')`,
      args: [],
    },

    // Product Brands
    {
      sql: `INSERT INTO product_brands (id, name, description) VALUES
        ('brd-samsung', 'Samsung', 'Global electronics leader'),
        ('brd-apple', 'Apple', 'Premium iPhones, MacBooks, and iPads'),
        ('brd-anker', 'Anker Innovations', 'Fast chargers, power banks, and Soundcore audio'),
        ('brd-hp', 'HP Inc.', 'Laptops, desktops, and printers'),
        ('brd-xiaomi', 'Xiaomi', 'Affordable smartphones and lifestyle gadgets')`,
      args: [],
    },

    // Products
    {
      sql: `INSERT INTO products (id, name, sku, barcode, description, category_id, brand_id, cost_price, selling_price, min_price, wholesale_price, stock_quantity, min_stock, max_stock, unit) VALUES
        ('prod-s24', 'Samsung Galaxy S24 Ultra (256GB Titanium)', 'SAM-S24U-256', '8806095304915', 'Flagship AI smartphone with 200MP camera and S-Pen', 'cat-phones', 'brd-samsung', 890.00, 1099.00, 1050.00, 1020.00, 24, 4, 60, 'pcs'),
        ('prod-ip15', 'Apple iPhone 15 Pro Max (256GB Natural Titanium)', 'APL-IP15PM-256', '195949038291', 'Super Retina XDR display, A17 Pro chip, Titanium build', 'cat-phones', 'brd-apple', 980.00, 1180.00, 1140.00, 1110.00, 18, 3, 50, 'pcs'),
        ('prod-macbook', 'Apple MacBook Air M3 13-inch (16GB / 512GB)', 'APL-MBA-M3', '195949112938', 'Lightweight power with Liquid Retina display and 18h battery', 'cat-laptops', 'brd-apple', 1100.00, 1320.00, 1280.00, 1240.00, 12, 2, 30, 'pcs'),
        ('prod-hpenvy', 'HP Envy x360 2-in-1 (Intel Core i7, 16GB, 1TB SSD)', 'HP-ENVY-X360', '196548293847', 'Convertible touchscreen laptop with active stylus', 'cat-laptops', 'brd-hp', 780.00, 950.00, 910.00, 880.00, 15, 3, 40, 'pcs'),
        ('prod-ankerpb', 'Anker 737 Power Bank (PowerCore 24K, 140W)', 'ANK-737-PB', '194644098712', 'Ultra-fast charging power bank with smart digital display', 'cat-audio', 'brd-anker', 95.00, 135.00, 125.00, 118.00, 65, 10, 150, 'pcs'),
        ('prod-airpods', 'Apple AirPods Pro (2nd Generation with USB-C)', 'APL-APP2-USBC', '195949019283', 'Active Noise Cancellation with Adaptive Audio', 'cat-audio', 'brd-apple', 175.00, 225.00, 215.00, 205.00, 42, 8, 100, 'pcs'),
        ('prod-rn13', 'Xiaomi Redmi Note 13 Pro 4G (8GB / 256GB)', 'XIA-RN13P-256', '6941812758392', '200MP ultra-clear camera, 120Hz AMOLED, 67W turbo charge', 'cat-phones', 'brd-xiaomi', 185.00, 240.00, 225.00, 215.00, 50, 10, 120, 'pcs'),
        ('prod-ankercable', 'Anker PowerLine III Flow USB-C to USB-C 100W', 'ANK-PL3F-USBC', '194644082736', 'Silicone soft, tangle-free fast charging cable (6ft)', 'cat-audio', 'brd-anker', 11.00, 18.00, 16.00, 14.00, 180, 25, 400, 'pcs')`,
      args: [],
    },

    // Customers
    {
      sql: `INSERT INTO customers (id, name, phone, email, address, credit_limit, notes) VALUES
        ('cust-1', 'Dahir Trading Co.', '+252 61 555 1234', 'dahir@dahirtrading.so', 'Bakaara Market, Block C-14, Mogadishu', 5000.00, 'High-volume wholesale client with 30-day terms'),
        ('cust-2', 'Somali Tech Hub', '+252 61 777 9876', 'procure@somalitechhub.org', 'KM5, Zobe intersection, Wadajir', 3000.00, 'Corporate orders and IT accessories'),
        ('cust-3', 'Faduma Abdi Noor', '+252 61 888 4321', 'faduma.noor@gmail.com', 'Hodan District, near Digfeer Hospital', 500.00, 'Regular retail buyer'),
        ('cust-4', 'Jubba Electronics Kismayo', '+252 69 444 3322', 'orders@jubba-elec.com', 'Farjano, Port Road, Kismayo', 8000.00, 'Regional cargo client, weekly consignments'),
        ('cust-5', 'Hodan Retail Outlet', '+252 61 222 6655', 'hodan.retail@yahoo.com', 'Taleex Junction, Hodan, Mogadishu', 2000.00, 'Retail reseller')`,
      args: [],
    },

    // Suppliers
    {
      sql: `INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes) VALUES
        ('sup-1', 'Gulf Tech Wholesale FZE', 'Tariq Al-Mansoor', '+971 4 223 8899', 'orders@gulftech-fze.ae', 'Deira Electronics Market, Dubai, UAE', 'Primary supplier for Apple and Samsung devices'),
        ('sup-2', 'East Africa IT Importers', 'Khadar Warsame', '+252 61 511 2233', 'khadar@ea-importers.so', 'Hamar Weyne Port Road, Mogadishu', 'Local distributor for cables, peripherals, and screens'),
        ('sup-3', 'Shenzhen Global Direct', 'Michael Chen', '+86 755 8329 1000', 'export@sz-globaldirect.cn', 'Huaqiangbei, Futian, Shenzhen, China', 'Direct container consignments for chargers and accessories')`,
      args: [],
    },

    // Delivery Companies
    {
      sql: `INSERT INTO delivery_companies (id, name, phone, contact_person) VALUES
        ('delco-internal', 'Banadir In-House Express', '+252 61 500 0001', 'Liban Hassan'),
        ('delco-speedy', 'Speedy Go Mogadishu', '+252 61 999 1122', 'Guled Farah')`,
      args: [],
    },

    // Delivery Zones
    {
      sql: `INSERT INTO delivery_zones (id, name, base_rate, delivery_company_id, estimated_time) VALUES
        ('zone-hodan', 'Hodan & KM4 (Zone 1)', 2.50, 'delco-internal', '30-45 mins'),
        ('zone-waberi', 'Waberi & Airport Road (Zone 2)', 3.00, 'delco-internal', '40-60 mins'),
        ('zone-wadajir', 'Wadajir & Madina (Zone 3)', 3.50, 'delco-internal', '45-70 mins'),
        ('zone-hamar', 'Hamar Weyne & Shangani (Zone 4)', 3.00, 'delco-internal', '40-60 mins'),
        ('zone-yaaqshiid', 'Yaaqshiid & Karan (Zone 5)', 4.00, 'delco-internal', '60-90 mins'),
        ('zone-dayniile', 'Dayniile & Gubta (Zone 6)', 5.00, 'delco-internal', '75-110 mins')`,
      args: [],
    },

    // Drivers
    {
      sql: `INSERT INTO drivers (id, name, phone, vehicle_type, vehicle_plate, license_number, commission_rate) VALUES
        ('drv-1', 'Ahmed Mohamed Jama', '+252 61 333 4455', 'Motorcycle TVS 125', 'MOG-4829', 'DL-2024-0981', 1.00),
        ('drv-2', 'Farah Abdullahi Nur', '+252 61 444 5566', 'Bajaj Auto Rickshaw', 'MOG-7193', 'DL-2023-1142', 1.25),
        ('drv-3', 'Yasin Osman Hirsi', '+252 61 666 7788', 'Delivery Van Toyota Probox', 'MOG-2041', 'DL-2022-0477', 2.00)`,
      args: [],
    },

    // Cargo Companies
    {
      sql: `INSERT INTO cargo_companies (id, name, phone, contact_person, base_rate_per_kg, base_rate_per_cbm, min_charge) VALUES
        ('cargo-air', 'Somali Wings Air Cargo', '+252 61 588 9900', 'Abdirahman Ali', 2.50, 45.00, 15.00),
        ('cargo-land', 'Horseed Inter-City Logistics (Trucking)', '+252 61 577 6655', 'Bashir Duale', 0.80, 22.00, 10.00),
        ('cargo-sea', 'Indian Ocean Coastal Shipping', '+252 61 544 3322', 'Mukhtar Sheikh', 0.45, 14.00, 20.00)`,
      args: [],
    },

    // Cargo Rates
    {
      sql: `INSERT INTO cargo_rates (id, company_id, destination, rate_per_kg, rate_per_cbm, min_fee) VALUES
        ('crate-kismayo-air', 'cargo-air', 'Kismayo (Airport)', 2.50, 45.00, 15.00),
        ('crate-baidoa-air', 'cargo-air', 'Baidoa (Airport)', 2.20, 40.00, 15.00),
        ('crate-hargeisa-air', 'cargo-air', 'Hargeisa (Egal Intl)', 3.00, 55.00, 20.00),
        ('crate-garowe-air', 'cargo-air', 'Garowe (Airport)', 2.80, 50.00, 20.00),
        ('crate-kismayo-land', 'cargo-land', 'Kismayo Central Hub', 0.85, 24.00, 10.00),
        ('crate-baidoa-land', 'cargo-land', 'Baidoa Main Warehouse', 0.75, 20.00, 10.00)`,
      args: [],
    },

    // Financial Settings
    {
      sql: `INSERT INTO financial_settings (id, currency, fiscal_year_start, enable_audit_log, auto_reconcile, default_cash_account_id, default_bank_account_id) VALUES
        ('fin-set-1', 'USD', '01-01', 1, 1, 'acc-cash-1', 'acc-bank-1')`,
      args: [],
    },

    // Initial Sales & Items
    {
      sql: `INSERT INTO sales (id, sale_no, sale_date, sale_time, customer_id, customer_name, customer_phone, customer_address, subtotal, discount, vat_rate, vat_amount, total, paid_amount, advance_amount, returned_total, balance, payment_status, payment_channel_id, payment_account_id, payment_method, fulfillment, delivery_fee, cargo_fee, fee_paid, fee_balance, status, created_by) VALUES
        ('sale-1001', 'INV-2026-0001', '2026-09-12', '10:30', 'cust-1', 'Dahir Trading Co.', '+252 61 555 1234', 'Bakaara Market, Block C-14', 2198.00, 48.00, 0, 0, 2150.00, 2150.00, 0, 0, 0, 'full_paid', 'pch-evc', 'acc-evc-1', 'evc_plus', 'pickup', 0, 0, 0, 0, 'completed', 'usr-cashier-1'),
        ('sale-1002', 'INV-2026-0002', '2026-09-13', '14:15', 'cust-3', 'Faduma Abdi Noor', '+252 61 888 4321', 'Hodan District, near Digfeer', 360.00, 0, 0, 0, 360.00, 360.00, 0, 0, 0, 'full_paid', 'pch-cash', 'acc-cash-1', 'cash', 'delivery', 2.50, 0, 2.50, 0, 'completed', 'usr-cashier-1'),
        ('sale-1003', 'INV-2026-0003', '2026-09-14', '09:45', 'cust-2', 'Somali Tech Hub', '+252 61 777 9876', 'KM5, Zobe intersection', 1545.00, 45.00, 0, 0, 1500.00, 1000.00, 0, 0, 500.00, 'partial', 'pch-premier', 'acc-bank-1', 'bank', 'delivery', 3.00, 0, 3.00, 0, 'completed', 'usr-cashier-1')`,
      args: [],
    },
    {
      sql: `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, cost_price, discount, total) VALUES
        ('si-1', 'sale-1001', 'prod-s24', 'Samsung Galaxy S24 Ultra (256GB Titanium)', 2, 1099.00, 890.00, 48.00, 2150.00),
        ('si-2', 'sale-1002', 'prod-ankerpb', 'Anker 737 Power Bank (PowerCore 24K, 140W)', 1, 135.00, 95.00, 0, 135.00),
        ('si-3', 'sale-1002', 'prod-airpods', 'Apple AirPods Pro (2nd Generation with USB-C)', 1, 225.00, 175.00, 0, 225.00),
        ('si-4', 'sale-1003', 'prod-macbook', 'Apple MacBook Air M3 13-inch (16GB / 512GB)', 1, 1320.00, 1100.00, 45.00, 1275.00),
        ('si-5', 'sale-1003', 'prod-rn13', 'Xiaomi Redmi Note 13 Pro 4G (8GB / 256GB)', 1, 225.00, 185.00, 0, 225.00)`,
      args: [],
    },

    // Initial Orders
    {
      sql: `INSERT INTO orders (id, order_no, order_date, customer_id, customer_name, customer_phone, customer_address, subtotal, discount, vat_rate, vat_amount, total, advance_amount, balance, payment_status, fulfillment, delivery_fee, cargo_fee, fee_paid, fee_balance, recipient_name, recipient_phone, recipient_address, delivery_zone_id, status, created_by) VALUES
        ('ord-5001', 'ORD-2026-0001', '2026-09-14', 'cust-5', 'Hodan Retail Outlet', '+252 61 222 6655', 'Taleex Junction, Hodan', 480.00, 0, 0, 0, 480.00, 100.00, 380.00, 'partial', 'delivery', 2.50, 0, 2.50, 0, 'Hodan Manager', '+252 61 222 6655', 'Taleex Junction, Hodan', 'zone-hodan', 'ready', 'usr-cashier-1'),
        ('ord-5002', 'ORD-2026-0002', '2026-09-14', 'cust-4', 'Jubba Electronics Kismayo', '+252 69 444 3322', 'Farjano, Port Road, Kismayo', 2360.00, 60.00, 0, 0, 2300.00, 500.00, 1800.00, 'partial', 'cargo', 0, 45.00, 45.00, 0, 'Jubba Receiving', '+252 69 444 3322', 'Farjano, Port Road, Kismayo', NULL, 'confirmed', 'usr-mgr-1')`,
      args: [],
    },
    {
      sql: `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, cost_price, discount, total) VALUES
        ('oi-1', 'ord-5001', 'prod-rn13', 'Xiaomi Redmi Note 13 Pro 4G', 2, 240.00, 185.00, 0, 480.00),
        ('oi-2', 'ord-5002', 'prod-ip15', 'Apple iPhone 15 Pro Max', 2, 1180.00, 980.00, 60.00, 2300.00)`,
      args: [],
    },

    // Initial Deliveries
    {
      sql: `INSERT INTO deliveries (id, delivery_no, order_id, sale_id, status, fulfillment, driver_id, delivery_zone_id, recipient_name, recipient_phone, recipient_address, fee, fee_paid, fee_balance, cod_amount, cod_collected, notes) VALUES
        ('del-7001', 'DEL-2026-0001', 'ord-5001', NULL, 'assigned', 'delivery', 'drv-1', 'zone-hodan', 'Hodan Manager', '+252 61 222 6655', 'Taleex Junction, Hodan', 2.50, 2.50, 0, 380.00, 0, 'Customer requested morning delivery before 12:00 PM'),
        ('del-7002', 'DEL-2026-0002', NULL, 'sale-1002', 'delivered', 'delivery', 'drv-2', 'zone-hodan', 'Faduma Abdi Noor', '+252 61 888 4321', 'Hodan District, near Digfeer', 2.50, 2.50, 0, 0, 0, 'Delivered and verified by customer')`,
      args: [],
    },

    // Initial Purchases
    {
      sql: `INSERT INTO purchases (id, purchase_no, purchase_date, supplier_id, supplier_name, subtotal, discount, tax, total, paid_amount, balance, payment_status, payment_account_id, status, created_by) VALUES
        ('po-9001', 'PO-2026-0001', '2026-09-10', 'sup-1', 'Gulf Tech Wholesale FZE', 18700.00, 200.00, 0, 18500.00, 18500.00, 0, 'full_paid', 'acc-bank-1', 'received', 'usr-admin-1'),
        ('po-9002', 'PO-2026-0002', '2026-09-11', 'sup-2', 'East Africa IT Importers', 2450.00, 50.00, 0, 2400.00, 1500.00, 900.00, 'partial', 'acc-cash-1', 'received', 'usr-mgr-1')`,
      args: [],
    },

    // Financial Transactions (Ledger)
    {
      sql: `INSERT INTO financial_transactions (id, txn_no, txn_date, txn_type, amount, fee_amount, net_amount, account_id, category, reference_type, reference_id, party_type, party_id, description, status) VALUES
        ('txn-1', 'TXN-2026-0001', '2026-09-12', 'sale', 2150.00, 0, 2150.00, 'acc-evc-1', 'Sales Revenue', 'sale', 'sale-1001', 'customer', 'cust-1', 'Payment for Sale #INV-2026-0001', 'completed'),
        ('txn-2', 'TXN-2026-0002', '2026-09-13', 'sale', 360.00, 0, 360.00, 'acc-cash-1', 'Sales Revenue', 'sale', 'sale-1002', 'customer', 'cust-3', 'Payment for Sale #INV-2026-0002', 'completed'),
        ('txn-3', 'TXN-2026-0003', '2026-09-14', 'sale', 1000.00, 0, 1000.00, 'acc-bank-1', 'Sales Revenue', 'sale', 'sale-1003', 'customer', 'cust-2', 'Advance payment for Sale #INV-2026-0003', 'completed'),
        ('txn-4', 'TXN-2026-0004', '2026-09-13', 'expense', 450.00, 0, 450.00, 'acc-cash-1', 'Store & Warehouse Rent', 'expense', NULL, 'other', NULL, 'September Warehouse lease partial payment', 'completed'),
        ('txn-5', 'TXN-2026-0005', '2026-09-14', 'expense', 85.00, 0, 85.00, 'acc-cash-1', 'Utilities (Power, Water, Internet)', 'expense', NULL, 'other', NULL, 'Generator fuel and backup power', 'completed')`,
      args: [],
    },

    // Daily Financial State
    {
      sql: `INSERT INTO daily_financial_states (id, day_date, opening_cash, total_income, total_expenses, total_sales, total_collections, net_cash_flow, closing_cash, total_receivables, total_payables) VALUES
        ('dfs-2026-09-12', '2026-09-12', 5000.00, 2150.00, 0, 2150.00, 2150.00, 2150.00, 7150.00, 0, 0),
        ('dfs-2026-09-13', '2026-09-13', 7150.00, 360.00, 450.00, 360.00, 360.00, -90.00, 7060.00, 0, 0),
        ('dfs-2026-09-14', '2026-09-14', 7060.00, 1000.00, 85.00, 1500.00, 1000.00, 915.00, 7975.00, 500.00, 900.00)`,
      args: [],
    },
  ]);

  console.log("Banadir Online FOS database seeded successfully!");
}
