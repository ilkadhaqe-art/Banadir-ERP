import {
  LayoutDashboard,
  ShoppingCart,
  Undo2,
  ClipboardList,
  Users,
  Boxes,
  Warehouse,
  PackageOpen,
  Factory,
  Truck,
  Bike,
  HandCoins,
  CreditCard,
  ReceiptText,
  TrendingUp,
  BarChart3,
  Target,
  BookOpen,
  ShieldCheck,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  to: string;
  icon: LucideIcon;
  children?: NavItem[];
};

export const navigation: NavGroup[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Sales", to: "/sales", icon: ShoppingCart },
  { label: "Returns", to: "/returns", icon: Undo2 },
  { label: "Orders", to: "/orders", icon: ClipboardList },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Products", to: "/products", icon: Boxes },
  { label: "Inventory", to: "/inventory", icon: Warehouse },
  { label: "Purchases", to: "/purchases", icon: PackageOpen },
  { label: "Suppliers", to: "/suppliers", icon: Factory },
  { label: "Delivery & Cargo", to: "/delivery", icon: Truck },
  { label: "Drivers", to: "/drivers", icon: Bike },
  { label: "Payments", to: "/payments", icon: HandCoins },
  { label: "Payment Accounts", to: "/payment-accounts", icon: CreditCard },
  { label: "Expenses", to: "/expenses", icon: ReceiptText },
  { label: "Income", to: "/income", icon: TrendingUp },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Targets", to: "/targets", icon: Target },
  { label: "Accounting", to: "/accounting", icon: BookOpen },
  { label: "Users & Roles", to: "/users", icon: ShieldCheck },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];
