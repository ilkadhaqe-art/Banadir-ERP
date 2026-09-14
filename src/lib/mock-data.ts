// In-memory database & zero-state store for Banadir Online FOS
// Factory reset: ZERO sample products, ZERO sample sales, ZERO debt, ZERO sample transactions.

export const MOCK_APP_SETTINGS = [
  {
    key: "business_name",
    value: "Banadir Online FOS",
    description: "Magaca Ganacsiga (Business Name)",
  },
  { key: "currency", value: "USD", description: "Lacagta (Currency code)" },
  { key: "vat_rate", value: "0.00", description: "Cashuurta / VAT rate" },
  {
    key: "receipt_header",
    value: "Banadir Online Store - Muqdisho, Soomaaliya",
    description: "Qoraalka sare ee rasiidka",
  },
  {
    key: "receipt_footer",
    value: "Mahadsanid! Alaabta la iibsaday lama celin karo 3 cisho kadib.",
    description: "Qoraalka hoose ee rasiidka",
  },
  { key: "receipt_phone", value: "+252 61 555 0123", description: "Telefoonka rasiidka" },
  {
    key: "receipt_address",
    value: "Wadada Maka Al-Mukarama, Muqdisho",
    description: "Cinwaanka xarunta",
  },
  { key: "receipt_whatsapp", value: "+252 61 555 0123", description: "WhatsApp-ka rasiidka" },
  {
    key: "receipt_terms",
    value: "Wixii cillad ah fadlan la xiriir 24 saac gudahood.",
    description: "Shuruudaha iibka",
  },
];

export const MOCK_PAYMENT_ACCOUNTS = [
  { id: "acc-evc", name: "EVC Plus (Main)", kind: "wallet", scope: "business", active: true },
  { id: "acc-premier", name: "Premier Bank USD", kind: "bank", scope: "business", active: true },
  { id: "acc-salaam", name: "Salaam Somali Bank", kind: "bank", scope: "business", active: true },
  { id: "acc-cash", name: "Cash Box (Khasnadda)", kind: "cash", scope: "business", active: true },
];

export const MOCK_ACCOUNT_BALANCES = [
  {
    account_id: "acc-evc",
    name: "EVC Plus (Main)",
    kind: "wallet",
    scope: "business",
    balance: 0.0,
    active: true,
  },
  {
    account_id: "acc-premier",
    name: "Premier Bank USD",
    kind: "bank",
    scope: "business",
    balance: 0.0,
    active: true,
  },
  {
    account_id: "acc-salaam",
    name: "Salaam Somali Bank",
    kind: "bank",
    scope: "business",
    balance: 0.0,
    active: true,
  },
  {
    account_id: "acc-cash",
    name: "Cash Box (Khasnadda)",
    kind: "cash",
    scope: "business",
    balance: 0.0,
    active: true,
  },
];

export const MOCK_PAYMENT_CHANNELS = [
  {
    id: "chan-evc",
    name: "EVC Plus",
    group_name: "Wallets",
    canonical_method: "evc_plus",
    account_id: "acc-evc",
    sort_order: 1,
    active: true,
  },
  {
    id: "chan-premier-w",
    name: "Premier Wallet",
    group_name: "Wallets",
    canonical_method: "evc_plus",
    account_id: "acc-premier",
    sort_order: 2,
    active: true,
  },
  {
    id: "chan-ebessa",
    name: "Ebessa",
    group_name: "Wallets",
    canonical_method: "edahab",
    account_id: "acc-evc",
    sort_order: 3,
    active: true,
  },
  {
    id: "chan-hormuud-m",
    name: "Hormuud Merchant",
    group_name: "Merchants",
    canonical_method: "merchant",
    account_id: "acc-evc",
    sort_order: 10,
    active: true,
  },
  {
    id: "chan-somtel-m",
    name: "Somtel Merchant",
    group_name: "Merchants",
    canonical_method: "merchant",
    account_id: "acc-evc",
    sort_order: 11,
    active: true,
  },
  {
    id: "chan-salaam",
    name: "Salaam Somali Bank",
    group_name: "Banks",
    canonical_method: "bank",
    account_id: "acc-salaam",
    sort_order: 20,
    active: true,
  },
  {
    id: "chan-premier-b",
    name: "Premier Bank",
    group_name: "Banks",
    canonical_method: "bank",
    account_id: "acc-premier",
    sort_order: 21,
    active: true,
  },
  {
    id: "chan-mybank",
    name: "MyBank",
    group_name: "Banks",
    canonical_method: "bank",
    account_id: "acc-premier",
    sort_order: 22,
    active: true,
  },
  {
    id: "chan-ibs",
    name: "IBS Bank",
    group_name: "Banks",
    canonical_method: "bank",
    account_id: "acc-premier",
    sort_order: 23,
    active: true,
  },
  {
    id: "chan-other",
    name: "Other Bank",
    group_name: "Other",
    canonical_method: "bank",
    account_id: "acc-premier",
    sort_order: 99,
    active: true,
  },
];

export const MOCK_LOCATIONS = [
  { id: "loc-hodan", name: "Hodan", level: "district", parent_id: null, active: true },
  { id: "loc-waberi", name: "Waberi", level: "district", parent_id: null, active: true },
  { id: "loc-wadajir", name: "Wadajir (Medina)", level: "district", parent_id: null, active: true },
  { id: "loc-yaqshid", name: "Yaqshid", level: "district", parent_id: null, active: true },
  { id: "loc-boondheere", name: "Boondheere", level: "district", parent_id: null, active: true },
  { id: "loc-hargeisa", name: "Hargeisa", level: "region", parent_id: null, active: true },
  { id: "loc-garowe", name: "Garowe", level: "region", parent_id: null, active: true },
  { id: "loc-kismayo", name: "Kismayo", level: "region", parent_id: null, active: true },
];

export const MOCK_DELIVERY_COMPANIES: Record<string, unknown>[] = [];
export const MOCK_DRIVERS: Record<string, unknown>[] = [];
export const MOCK_CARGO_COMPANIES: Record<string, unknown>[] = [];

// ZERO DATA CATALOG
export const MOCK_PRODUCTS: Record<string, unknown>[] = [];
export const MOCK_PRODUCT_STOCK: Record<string, unknown>[] = [];

// ZERO DATA CUSTOMERS & BALANCES
export const MOCK_CUSTOMERS: Record<string, unknown>[] = [];
export const MOCK_CUSTOMER_BALANCES: Record<string, unknown>[] = [];

// ZERO DATA SALES & TRANSACTIONS
export const MOCK_SALES_OVERVIEW: Record<string, unknown>[] = [];
export const MOCK_SALE_ITEMS: Record<string, unknown>[] = [];
export const MOCK_FINANCIAL_RULES: Record<string, unknown>[] = [];

export const MOCK_FINANCIAL_SNAPSHOT = {
  current_date: new Date().toISOString().slice(0, 10),
  financial_start: new Date().toISOString().slice(0, 10),
  financial_period: {
    id: "period-current",
    start_date: new Date().toISOString().slice(0, 7) + "-01",
    end_date: new Date().toISOString().slice(0, 7) + "-28",
    status: "open" as const,
    days_total: 30,
    days_elapsed: 1,
    days_remaining: 29,
    opening_carry_deficit: 0,
  },
  today_target: 0.0,
  today_target_base: 0.0,
  today_achievement: 0.0,
  today_plus: 0.0,
  today_minus: 0.0,
  carry_in: 0.0,
  carry_out: 0.0,
  progress_percentage: 0.0,
  business_obligation_today: 0.0,
  personal_obligation_today: 0.0,
  today: {
    sales: 0.0,
    cogs: 0.0,
    gross_profit: 0.0,
    net_profit: 0.0,
    business_expenses: 0.0,
    personal_expenses: 0.0,
    guaranteed_income: 0.0,
    other_income: 0.0,
    collections: 0.0,
    is_friday: false,
  },
  period_totals: {
    sales: 0.0,
    cogs: 0.0,
    gross_profit: 0.0,
    business_expenses: 0.0,
    personal_expenses: 0.0,
    net_profit: 0.0,
    guaranteed_income: 0.0,
    other_income: 0.0,
    collections: 0.0,
    target: 0.0,
    achievement: 0.0,
    plus_total: 0.0,
    minus_total: 0.0,
  },
  cash_balance: 0.0,
  receivables: 0.0,
  business_capital: 0.0,
  computed_at: new Date().toISOString(),
};

export const MOCK_BUSINESS_OVERVIEW = {
  from: new Date().toISOString().slice(0, 7) + "-01",
  to: new Date().toISOString().slice(0, 10),
  sales: 0.0,
  gross_profit: 0.0,
  expenses: 0.0,
  income: 0.0,
  receivables: 0.0,
  payables: 0.0,
  stock_value: 0.0,
  low_stock_count: 0,
  cash_total: 0.0,
  open_orders: 0,
  active_deliveries: 0,
  driver_cash_outstanding: 0.0,
};

// Store container (Fresh Clean Factory Reset State)
export const mockDb: Record<string, Record<string, unknown>[]> = {
  app_settings: [...MOCK_APP_SETTINGS],
  payment_accounts: [...MOCK_PAYMENT_ACCOUNTS],
  account_balances: [...MOCK_ACCOUNT_BALANCES],
  account_balances_report: MOCK_PAYMENT_ACCOUNTS.map((a) => ({
    account_id: a.id,
    name: a.name,
    kind: a.kind,
    scope: a.scope,
    balance: 0.0,
    active: a.active,
    total_in: 0.0,
    total_out: 0.0,
    net_change: 0.0,
  })),
  payment_channels: [...MOCK_PAYMENT_CHANNELS],
  locations: [...MOCK_LOCATIONS],
  delivery_companies: [],
  drivers: [],
  cargo_companies: [],
  products: [],
  product_stock: [],
  customers: [],
  customer_balances: [],
  sales: [],
  sales_overview: [],
  sale_items: [],
  purchases: [],
  purchase_items: [],
  orders: [],
  order_items: [],
  deliveries: [],
  financial_rules: [],
  financial_transactions: [],
  account_transfers: [],
  expense_report: [],
  income_report: [],
  profit_loss_report: [],
  inventory_valuation_report: [],
  audit_log_view: [],
  user_roles: [{ id: "role-1", user_id: "demo-user-1", role: "owner" }],
  profiles: [{ id: "demo-user-1", full_name: "Admin User", avatar_url: null }],
};
