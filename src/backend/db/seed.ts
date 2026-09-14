import type { SqlDatabase } from "./database";

export function seedInitialData(db: SqlDatabase) {
  // Check if already seeded
  const settingsCount = db.get<{ count: number }>("SELECT COUNT(*) as count FROM app_settings");
  if (settingsCount && settingsCount.count > 0) {
    return; // Already initialized
  }

  db.transaction(() => {
    // 1. Users & Roles
    db.run(`INSERT OR IGNORE INTO users (id, email) VALUES ('user-admin-1', 'admin@banadir.com')`);
    db.run(
      `INSERT OR IGNORE INTO profiles (id, full_name, phone) VALUES ('user-admin-1', 'Admin User', '+252 61 555 0000')`,
    );
    db.run(
      `INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES ('role-admin-1', 'user-admin-1', 'owner')`,
    );

    // 2. App Settings
    const settings = [
      ["business_name", "Banadir Online FOS", "Magaca Ganacsiga"],
      ["currency", "USD", "Lacagta la isticmaalo"],
      ["vat_rate", "0.05", "Cashuurta 5%"],
      ["receipt_phone", "+252 61 555 0123", "Telefoonka Xarunta"],
      ["receipt_address", "Maka Al-Mukarama, Mogadishu", "Cinwaanka Guud"],
      ["receipt_header", "Banadir Online FOS - Quality & Speed", "Cinwaanka Rasiidka"],
      ["receipt_footer", "Mahadsanid! Waad ku mahadsan tahay ganacsigaaga.", "Fariinta Rasiidka"],
      ["allow_negative_stock", "false", "U ogolow iibka alaabta marka ay dhammaato"],
    ];
    for (const [k, v, desc] of settings) {
      db.run(`INSERT OR REPLACE INTO app_settings (key, value, description) VALUES (?, ?, ?)`, [
        k,
        v,
        desc,
      ]);
    }

    // 3. Payment Accounts
    const accounts = [
      ["acc-evc", "EVC Plus (Main)", "wallet", "business", "615550123", 0],
      ["acc-premier", "Premier Bank USD", "bank", "business", "0102030405", 0],
      ["acc-salaam", "Salaam Somali Bank", "bank", "business", "9988776655", 0],
      ["acc-cash", "Cash Box (Khasnadda)", "cash", "business", null, 0],
      ["acc-dahab", "e-Dahab", "wallet", "business", "625550123", 0],
    ];
    for (const [id, name, kind, scope, num, bal] of accounts) {
      db.run(
        `INSERT OR IGNORE INTO payment_accounts (id, name, kind, scope, account_number, balance) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name, kind, scope, num, bal],
      );
    }

    // 4. Payment Channels
    const channels = [
      ["chan-evc", "EVC Plus", "mobile_wallet", "acc-evc"],
      ["chan-premier", "Premier Bank", "bank_transfer", "acc-premier"],
      ["chan-salaam", "Salaam Bank", "bank_transfer", "acc-salaam"],
      ["chan-dahab", "e-Dahab", "mobile_wallet", "acc-dahab"],
      ["chan-cash", "Cash on Delivery", "cash", "acc-cash"],
    ];
    for (const [id, name, kind, accId] of channels) {
      db.run(
        `INSERT OR IGNORE INTO payment_channels (id, name, kind, account_id) VALUES (?, ?, ?, ?)`,
        [id, name, kind, accId],
      );
    }

    // 5. Locations (Districts & Regions)
    const locations = [
      ["loc-hodan", "Hodan", "district", null],
      ["loc-howlwadaag", "Howlwadaag", "district", null],
      ["loc-waberi", "Waberi", "district", null],
      ["loc-shibis", "Shibis", "district", null],
      ["loc-boondheere", "Boondheere", "district", null],
      ["loc-wadajir", "Wadajir", "district", null],
      ["loc-dayniile", "Dayniile", "district", null],
      ["loc-yaaqshiid", "Yaaqshiid", "district", null],
      ["loc-kaaran", "Kaaran", "district", null],
      ["loc-hargeisa", "Hargeisa", "region", null],
      ["loc-garowe", "Garowe", "region", null],
      ["loc-bosaso", "Bosaso", "region", null],
      ["loc-kismayo", "Kismayo", "region", null],
    ];
    for (const [id, name, level, parentId] of locations) {
      db.run(`INSERT OR IGNORE INTO locations (id, name, level, parent_id) VALUES (?, ?, ?, ?)`, [
        id,
        name,
        level,
        parentId,
      ]);
    }

    // 6. Delivery Companies & Cargo Companies
    const deliveryCompanies = [
      [
        "deliv-banadir",
        "Banadir Express Delivery",
        "+252 61 500 1122",
        "Cabdi Nuur",
        "Same-day delivery across Banadir",
      ],
      [
        "deliv-hilaac",
        "Hilaac Logistics",
        "+252 61 500 3344",
        "Faarax Cali",
        "Motorbike & car fleet",
      ],
    ];
    for (const [id, name, phone, contact, notes] of deliveryCompanies) {
      db.run(
        `INSERT OR IGNORE INTO delivery_companies (id, name, phone, contact_person, notes) VALUES (?, ?, ?, ?, ?)`,
        [id, name, phone, contact, notes],
      );
    }

    const cargoCompanies = [
      [
        "cargo-buraaq",
        "Al-Buraaq Cargo",
        "+252 61 800 2211",
        "Jaamac Warsame",
        "Inter-regional cargo",
      ],
      [
        "cargo-barwaaqo",
        "Barwaaqo Cargo",
        "+252 61 800 4433",
        "Shariif Axmed",
        "Air and ground transport",
      ],
    ];
    for (const [id, name, phone, contact, notes] of cargoCompanies) {
      db.run(
        `INSERT OR IGNORE INTO cargo_companies (id, name, phone, contact_person, notes) VALUES (?, ?, ?, ?, ?)`,
        [id, name, phone, contact, notes],
      );
    }

    // 7. Drivers
    const drivers = [
      ["driver-guuleed", "Guuleed Maxamed", "+252 61 700 8899", "deliv-banadir", "Bajaj"],
      ["driver-xasan", "Xasan Warsame", "+252 61 700 6655", "deliv-hilaac", "Mooto"],
    ];
    for (const [id, name, phone, compId, veh] of drivers) {
      db.run(
        `INSERT OR IGNORE INTO drivers (id, name, phone, company_id, vehicle) VALUES (?, ?, ?, ?, ?)`,
        [id, name, phone, compId, veh],
      );
    }

    // 8. Delivery Zones
    const zones = [
      ["zone-hodan", "Hodan", "Banaadir", 2.0],
      ["zone-howlwadaag", "Howlwadaag", "Banaadir", 2.0],
      ["zone-waberi", "Waberi", "Banaadir", 2.0],
      ["zone-shibis", "Shibis", "Banaadir", 2.5],
      ["zone-boondheere", "Boondheere", "Banaadir", 2.5],
      ["zone-wadajir", "Wadajir", "Banaadir", 2.0],
      ["zone-dayniile", "Dayniile", "Banaadir", 3.0],
      ["zone-yaaqshiid", "Yaaqshiid", "Banaadir", 3.0],
      ["zone-kaaran", "Kaaran", "Banaadir", 3.5],
    ];
    for (const [id, name, region, fee] of zones) {
      db.run(`INSERT OR IGNORE INTO delivery_zones (id, name, region, fee) VALUES (?, ?, ?, ?)`, [
        id,
        name,
        region,
        fee,
      ]);
    }

    // 9. Categories & Brands
    const categories = [
      ["cat-smartphones", "Smartphones", "Mobile phones and handsets"],
      ["cat-audio", "Audio & Wearables", "Headphones, earbuds and smartwatches"],
      ["cat-accessories", "Accessories", "Power banks, chargers and cables"],
    ];
    for (const [id, name, desc] of categories) {
      db.run(`INSERT OR IGNORE INTO product_categories (id, name, description) VALUES (?, ?, ?)`, [
        id,
        name,
        desc,
      ]);
    }

    const brands = [
      ["brand-samsung", "Samsung", "Samsung Electronics"],
      ["brand-apple", "Apple", "Apple Inc."],
      ["brand-xiaomi", "Xiaomi", "Xiaomi Corporation"],
      ["brand-anker", "Anker", "Anker Innovations"],
    ];
    for (const [id, name, desc] of brands) {
      db.run(`INSERT OR IGNORE INTO product_brands (id, name, description) VALUES (?, ?, ?)`, [
        id,
        name,
        desc,
      ]);
    }

    // 10. Initial Products with real inventory
    const products = [
      [
        "prod-sam-a55",
        "SAM-A55-128",
        "Samsung Galaxy A55 5G (128GB)",
        "cat-smartphones",
        "brand-samsung",
        "pcs",
        290.0,
        340.0,
        15,
        5,
        "8806091234567",
      ],
      [
        "prod-airpods-pro2",
        "APP-PRO2",
        "Apple AirPods Pro (2nd Gen)",
        "cat-audio",
        "brand-apple",
        "pcs",
        175.0,
        210.0,
        20,
        4,
        "194253397472",
      ],
      [
        "prod-xia-s3",
        "XIA-S3-BLK",
        "Xiaomi Smart Watch S3 Black",
        "cat-audio",
        "brand-xiaomi",
        "pcs",
        95.0,
        125.0,
        18,
        3,
        "6941812756184",
      ],
      [
        "prod-ank-pb20k",
        "ANK-PB20K",
        "Anker PowerCore 20000mAh Power Bank",
        "cat-accessories",
        "brand-anker",
        "pcs",
        32.0,
        45.0,
        35,
        10,
        "796435489123",
      ],
    ];
    for (const [
      id,
      sku,
      name,
      cat,
      brand,
      unit,
      cost,
      price,
      stock,
      reorder,
      barcode,
    ] of products) {
      db.run(
        `INSERT OR IGNORE INTO products (id, sku, name, category_id, brand_id, unit, cost_price, sell_price, stock, reorder_level, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, sku, name, cat, brand, unit, cost, price, stock, reorder, barcode],
      );

      // Record opening stock movement
      db.run(
        `INSERT OR IGNORE INTO inventory_movements (id, product_id, movement_type, quantity, previous_stock, new_stock, unit_cost, reference, notes)
         VALUES (?, ?, 'opening', ?, 0, ?, ?, 'INIT-STOCK', 'Initial warehouse inventory')`,
        [`mov-${id}-init`, id, stock, stock, cost],
      );
    }

    // 11. Initial Customers
    const customers = [
      ["cust-maxamed", "Maxamed Cali Cumar", "+252 61 511 2233", "Hodan, Taleex, Muqdisho", 500.0],
      [
        "cust-aamina",
        "Aamina Xuseen Yuusuf",
        "+252 61 522 3344",
        "Waberi, Maka Al-Mukarama",
        1000.0,
      ],
      [
        "cust-cabdiraxmaan",
        "Cabdiraxmaan Shariif",
        "+252 61 533 4455",
        "Wadajir, Buulo Xuubeey",
        300.0,
      ],
    ];
    for (const [id, name, phone, address, creditLimit] of customers) {
      db.run(
        `INSERT OR IGNORE INTO customers (id, name, phone, address, credit_limit) VALUES (?, ?, ?, ?, ?)`,
        [id, name, phone, address, creditLimit],
      );
    }

    // 12. Initial Suppliers
    const suppliers = [
      [
        "sup-dubai",
        "Dubai General Trading LLC",
        "Khaalid Cumar",
        "+971 4 223 3445",
        "orders@dubaitrading.ae",
        "Deira, Dubai, UAE",
      ],
      [
        "sup-mogadishu",
        "Al-Nour Electronics Wholesale",
        "Bashiir Cali",
        "+252 61 599 8877",
        "alnour@gmail.com",
        "Bakaaro Market, Muqdisho",
      ],
    ];
    for (const [id, name, contact, phone, email, address] of suppliers) {
      db.run(
        `INSERT OR IGNORE INTO suppliers (id, name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name, contact, phone, email, address],
      );
    }
  });
}
