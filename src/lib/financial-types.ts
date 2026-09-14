/**
 * Canonical financial engine contract (Grand Master One).
 * Every screen reads these shapes from the ONE engine — no screen recomputes them.
 */

export type FinancialScope = "business" | "personal";
export type RuleKind = "obligation" | "guaranteed_income";
export type RuleFrequency = "daily" | "friday" | "weekly" | "monthly" | "yearly";
export type TxnType =
  "sale" | "expense" | "income" | "collection" | "capital" | "transfer" | "adjustment";
export type TxnStatus = "active" | "void";

export type FinancialPeriodInfo = {
  id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "open" | "closed" | null;
  days_total: number;
  days_elapsed: number;
  days_remaining: number;
  opening_carry_deficit: number;
};

export type DayFacts = {
  sales: number;
  cogs: number;
  gross_profit: number;
  net_profit: number;
  business_expenses: number;
  personal_expenses: number;
  guaranteed_income: number;
  other_income: number;
  collections: number;
  is_friday: boolean;
};

export type PeriodTotals = {
  sales: number;
  cogs: number;
  gross_profit: number;
  business_expenses: number;
  personal_expenses: number;
  net_profit: number;
  guaranteed_income: number;
  other_income: number;
  collections: number;
  target: number;
  achievement: number;
  plus_total: number;
  minus_total: number;
};

export type FinancialSnapshot = {
  current_date: string;
  financial_start: string;
  financial_period: FinancialPeriodInfo;
  today_target: number;
  today_target_base: number;
  today_achievement: number;
  today_plus: number;
  today_minus: number;
  carry_in: number;
  carry_out: number;
  progress_percentage: number;
  business_obligation_today: number;
  personal_obligation_today: number;
  today: DayFacts;
  period_totals: PeriodTotals;
  cash_balance: number;
  receivables: number;
  business_capital: number;
  computed_at: string;
};

export type DailyState = {
  day: string;
  is_friday: boolean;
  business_daily_obligation: number;
  personal_daily_obligation: number;
  friday_extra_obligation: number;
  monthly_share_business: number;
  monthly_share_personal: number;
  guaranteed_income: number;
  other_income: number;
  collections: number;
  sales_net: number;
  sales_paid: number;
  cogs: number;
  gross_profit: number;
  business_expenses: number;
  personal_expenses: number;
  business_net_profit: number;
  carry_in: number;
  target_base: number;
  target: number;
  achievement: number;
  plus_amount: number;
  minus_amount: number;
  carry_out: number;
  cash_delta: number;
  cash_balance: number;
  receivables: number;
  capital_balance: number;
};

export type FinancialRule = {
  id: string;
  name: string;
  scope: FinancialScope;
  kind: RuleKind;
  category: string | null;
  amount: number;
  frequency: RuleFrequency;
  skip_friday: boolean;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
  notes: string | null;
};

export type FinancialTransaction = {
  id: string;
  txn_date: string;
  type: TxnType;
  scope: FinancialScope;
  category: string | null;
  description: string | null;
  amount: number;
  cogs: number;
  amount_paid: number;
  account_id: string | null;
  settles_rule_id: string | null;
  status: TxnStatus;
  created_at: string;
};

/** Obligation roll-up used by the Master Financial Engine screens. */
export type ObligationSummary = {
  business_daily: number;
  personal_daily: number;
  friday_extra: number;
  business_monthly: number;
  personal_monthly: number;
  total_daily: number;
  total_monthly: number;
};
