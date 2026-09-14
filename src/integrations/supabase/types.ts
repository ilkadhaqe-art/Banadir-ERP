export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      account_transfers: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          from_account_id: string;
          id: string;
          note: string | null;
          status: Database["public"]["Enums"]["txn_status"];
          to_account_id: string;
          transfer_date: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          from_account_id: string;
          id?: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
          to_account_id: string;
          transfer_date?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          from_account_id?: string;
          id?: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
          to_account_id?: string;
          transfer_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_transfers_from_account_id_fkey";
            columns: ["from_account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "account_transfers_from_account_id_fkey";
            columns: ["from_account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "account_transfers_from_account_id_fkey";
            columns: ["from_account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: string;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: string;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      capital_records: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          effective_date: string;
          id: string;
          note: string | null;
          source: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          effective_date: string;
          id?: string;
          note?: string | null;
          source?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          effective_date?: string;
          id?: string;
          note?: string | null;
          source?: string;
        };
        Relationships: [];
      };
      cargo_companies: {
        Row: {
          active: boolean;
          contact_person: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cargo_rates: {
        Row: {
          active: boolean;
          company_id: string;
          created_at: string;
          created_by: string | null;
          destination: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          location_id: string | null;
          rate: number;
          updated_at: string;
          zone_id: string | null;
        };
        Insert: {
          active?: boolean;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          destination?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          location_id?: string | null;
          rate?: number;
          updated_at?: string;
          zone_id?: string | null;
        };
        Update: {
          active?: boolean;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          destination?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          location_id?: string | null;
          rate?: number;
          updated_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cargo_rates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "cargo_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cargo_rates_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cargo_rates_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_payments: {
        Row: {
          account_id: string | null;
          amount: number;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          payment_date: string;
          reference: string | null;
          sale_id: string | null;
          status: Database["public"]["Enums"]["txn_status"];
        };
        Insert: {
          account_id?: string | null;
          amount: number;
          created_at?: string;
          created_by?: string | null;
          customer_id: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          payment_date?: string;
          reference?: string | null;
          sale_id?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          payment_date?: string;
          reference?: string | null;
          sale_id?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
        };
        Relationships: [
          {
            foreignKeyName: "customer_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "customer_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "customer_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_balances";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_sales_report";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          active: boolean;
          address: string | null;
          created_at: string;
          created_by: string | null;
          credit_limit: number;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          credit_limit?: number;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          credit_limit?: number;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_financial_states: {
        Row: {
          achievement: number;
          business_daily_obligation: number;
          business_expenses: number;
          business_net_profit: number;
          capital_balance: number;
          carry_in: number;
          carry_out: number;
          cash_balance: number;
          cash_delta: number;
          cogs: number;
          collections: number;
          computed_at: string;
          day: string;
          friday_extra_obligation: number;
          gross_profit: number;
          guaranteed_income: number;
          is_friday: boolean;
          minus_amount: number;
          monthly_share_business: number;
          monthly_share_personal: number;
          other_income: number;
          period_id: string | null;
          personal_daily_obligation: number;
          personal_expenses: number;
          plus_amount: number;
          receivables: number;
          sales_net: number;
          sales_paid: number;
          target: number;
          target_base: number;
        };
        Insert: {
          achievement?: number;
          business_daily_obligation?: number;
          business_expenses?: number;
          business_net_profit?: number;
          capital_balance?: number;
          carry_in?: number;
          carry_out?: number;
          cash_balance?: number;
          cash_delta?: number;
          cogs?: number;
          collections?: number;
          computed_at?: string;
          day: string;
          friday_extra_obligation?: number;
          gross_profit?: number;
          guaranteed_income?: number;
          is_friday?: boolean;
          minus_amount?: number;
          monthly_share_business?: number;
          monthly_share_personal?: number;
          other_income?: number;
          period_id?: string | null;
          personal_daily_obligation?: number;
          personal_expenses?: number;
          plus_amount?: number;
          receivables?: number;
          sales_net?: number;
          sales_paid?: number;
          target?: number;
          target_base?: number;
        };
        Update: {
          achievement?: number;
          business_daily_obligation?: number;
          business_expenses?: number;
          business_net_profit?: number;
          capital_balance?: number;
          carry_in?: number;
          carry_out?: number;
          cash_balance?: number;
          cash_delta?: number;
          cogs?: number;
          collections?: number;
          computed_at?: string;
          day?: string;
          friday_extra_obligation?: number;
          gross_profit?: number;
          guaranteed_income?: number;
          is_friday?: boolean;
          minus_amount?: number;
          monthly_share_business?: number;
          monthly_share_personal?: number;
          other_income?: number;
          period_id?: string | null;
          personal_daily_obligation?: number;
          personal_expenses?: number;
          plus_amount?: number;
          receivables?: number;
          sales_net?: number;
          sales_paid?: number;
          target?: number;
          target_base?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_financial_states_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "financial_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      deliveries: {
        Row: {
          address: string | null;
          cargo_company_id: string | null;
          cod_amount: number;
          cod_collected: boolean;
          created_at: string;
          created_by: string | null;
          delivered_at: string | null;
          delivery_no: string;
          dispatch_date: string | null;
          driver_id: string | null;
          fee: number;
          id: string;
          note: string | null;
          order_id: string | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          sale_id: string | null;
          status: Database["public"]["Enums"]["delivery_status"];
          updated_at: string;
          zone_id: string | null;
        };
        Insert: {
          address?: string | null;
          cargo_company_id?: string | null;
          cod_amount?: number;
          cod_collected?: boolean;
          created_at?: string;
          created_by?: string | null;
          delivered_at?: string | null;
          delivery_no?: string;
          dispatch_date?: string | null;
          driver_id?: string | null;
          fee?: number;
          id?: string;
          note?: string | null;
          order_id?: string | null;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          sale_id?: string | null;
          status?: Database["public"]["Enums"]["delivery_status"];
          updated_at?: string;
          zone_id?: string | null;
        };
        Update: {
          address?: string | null;
          cargo_company_id?: string | null;
          cod_amount?: number;
          cod_collected?: boolean;
          created_at?: string;
          created_by?: string | null;
          delivered_at?: string | null;
          delivery_no?: string;
          dispatch_date?: string | null;
          driver_id?: string | null;
          fee?: number;
          id?: string;
          note?: string | null;
          order_id?: string | null;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          sale_id?: string | null;
          status?: Database["public"]["Enums"]["delivery_status"];
          updated_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_cargo_company_id_fkey";
            columns: ["cargo_company_id"];
            isOneToOne: false;
            referencedRelation: "cargo_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_companies: {
        Row: {
          active: boolean;
          contact_person: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_rates: {
        Row: {
          active: boolean;
          company_id: string | null;
          created_at: string;
          created_by: string | null;
          driver_id: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          location_id: string;
          rate: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          driver_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          location_id: string;
          rate?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          driver_id?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          location_id?: string;
          rate?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_rates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "delivery_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_rates_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "delivery_rates_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "delivery_rates_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_rates_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_zones: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          default_fee: number;
          district: string | null;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          default_fee?: number;
          district?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          default_fee?: number;
          district?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      driver_handovers: {
        Row: {
          account_id: string | null;
          amount: number;
          created_at: string;
          created_by: string | null;
          driver_id: string;
          handover_date: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          reference: string | null;
          status: Database["public"]["Enums"]["txn_status"];
        };
        Insert: {
          account_id?: string | null;
          amount: number;
          created_at?: string;
          created_by?: string | null;
          driver_id: string;
          handover_date?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          driver_id?: string;
          handover_date?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
        };
        Relationships: [
          {
            foreignKeyName: "driver_handovers_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "driver_handovers_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "driver_handovers_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_handovers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "driver_handovers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "driver_handovers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
        ];
      };
      drivers: {
        Row: {
          active: boolean;
          company_id: string | null;
          company_name: string | null;
          company_phone: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          license_no: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
          vehicle_type: string;
        };
        Insert: {
          active?: boolean;
          company_id?: string | null;
          company_name?: string | null;
          company_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          license_no?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          vehicle_type?: string;
        };
        Update: {
          active?: boolean;
          company_id?: string | null;
          company_name?: string | null;
          company_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          license_no?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          vehicle_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "delivery_companies";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          kind: string;
          name: string;
          scope: Database["public"]["Enums"]["financial_scope"];
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          kind?: string;
          name: string;
          scope?: Database["public"]["Enums"]["financial_scope"];
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          scope?: Database["public"]["Enums"]["financial_scope"];
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_audit_log: {
        Row: {
          action: string;
          actor: string | null;
          affected_date: string | null;
          created_at: string;
          entity_id: string | null;
          entity_table: string;
          id: string;
          new_value: Json | null;
          old_value: Json | null;
          reason: string | null;
        };
        Insert: {
          action: string;
          actor?: string | null;
          affected_date?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_table: string;
          id?: string;
          new_value?: Json | null;
          old_value?: Json | null;
          reason?: string | null;
        };
        Update: {
          action?: string;
          actor?: string | null;
          affected_date?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_table?: string;
          id?: string;
          new_value?: Json | null;
          old_value?: Json | null;
          reason?: string | null;
        };
        Relationships: [];
      };
      financial_periods: {
        Row: {
          capital_added: number;
          closing_deficit: number;
          created_at: string;
          end_date: string;
          id: string;
          opening_carry_deficit: number;
          start_date: string;
          status: Database["public"]["Enums"]["period_status"];
          surplus: number;
          updated_at: string;
        };
        Insert: {
          capital_added?: number;
          closing_deficit?: number;
          created_at?: string;
          end_date: string;
          id?: string;
          opening_carry_deficit?: number;
          start_date: string;
          status?: Database["public"]["Enums"]["period_status"];
          surplus?: number;
          updated_at?: string;
        };
        Update: {
          capital_added?: number;
          closing_deficit?: number;
          created_at?: string;
          end_date?: string;
          id?: string;
          opening_carry_deficit?: number;
          start_date?: string;
          status?: Database["public"]["Enums"]["period_status"];
          surplus?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_rules: {
        Row: {
          active: boolean;
          amount: number;
          category: string | null;
          created_at: string;
          created_by: string | null;
          effective_from: string;
          effective_to: string | null;
          frequency: Database["public"]["Enums"]["rule_frequency"];
          id: string;
          kind: Database["public"]["Enums"]["rule_kind"];
          name: string;
          notes: string | null;
          priority: number;
          scope: Database["public"]["Enums"]["financial_scope"];
          skip_friday: boolean;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          amount: number;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_from: string;
          effective_to?: string | null;
          frequency?: Database["public"]["Enums"]["rule_frequency"];
          id?: string;
          kind?: Database["public"]["Enums"]["rule_kind"];
          name: string;
          notes?: string | null;
          priority?: number;
          scope: Database["public"]["Enums"]["financial_scope"];
          skip_friday?: boolean;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          amount?: number;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          frequency?: Database["public"]["Enums"]["rule_frequency"];
          id?: string;
          kind?: Database["public"]["Enums"]["rule_kind"];
          name?: string;
          notes?: string | null;
          priority?: number;
          scope?: Database["public"]["Enums"]["financial_scope"];
          skip_friday?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      financial_transactions: {
        Row: {
          account_id: string | null;
          amount: number;
          amount_paid: number;
          category: string | null;
          cogs: number;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          scope: Database["public"]["Enums"]["financial_scope"];
          settles_rule_id: string | null;
          source_id: string | null;
          source_table: string | null;
          status: Database["public"]["Enums"]["txn_status"];
          txn_date: string;
          type: Database["public"]["Enums"]["txn_type"];
          updated_at: string;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          account_id?: string | null;
          amount: number;
          amount_paid?: number;
          category?: string | null;
          cogs?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          scope?: Database["public"]["Enums"]["financial_scope"];
          settles_rule_id?: string | null;
          source_id?: string | null;
          source_table?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
          txn_date: string;
          type: Database["public"]["Enums"]["txn_type"];
          updated_at?: string;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          amount_paid?: number;
          category?: string | null;
          cogs?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          scope?: Database["public"]["Enums"]["financial_scope"];
          settles_rule_id?: string | null;
          source_id?: string | null;
          source_table?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
          txn_date?: string;
          type?: Database["public"]["Enums"]["txn_type"];
          updated_at?: string;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "financial_transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "financial_transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_transactions_settles_rule_id_fkey";
            columns: ["settles_rule_id"];
            isOneToOne: false;
            referencedRelation: "financial_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      fulfillment_events: {
        Row: {
          amount_collected: number;
          created_at: string;
          created_by: string | null;
          delivery_id: string | null;
          driver_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["fulfillment_type"];
          note: string | null;
          occurred_at: string;
          sale_id: string | null;
          status: string;
        };
        Insert: {
          amount_collected?: number;
          created_at?: string;
          created_by?: string | null;
          delivery_id?: string | null;
          driver_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["fulfillment_type"];
          note?: string | null;
          occurred_at?: string;
          sale_id?: string | null;
          status: string;
        };
        Update: {
          amount_collected?: number;
          created_at?: string;
          created_by?: string | null;
          delivery_id?: string | null;
          driver_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["fulfillment_type"];
          note?: string | null;
          occurred_at?: string;
          sale_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_events_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_events_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_events_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "orders_overview";
            referencedColumns: ["delivery_id"];
          },
          {
            foreignKeyName: "fulfillment_events_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["delivery_id"];
          },
          {
            foreignKeyName: "fulfillment_events_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "fulfillment_events_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "fulfillment_events_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_events_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fulfillment_events_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          movement_date: string;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          note: string | null;
          product_id: string;
          quantity: number;
          reference: string | null;
          source_id: string | null;
          source_table: string | null;
          unit_cost: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_date?: string;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          note?: string | null;
          product_id: string;
          quantity: number;
          reference?: string | null;
          source_id?: string | null;
          source_table?: string | null;
          unit_cost?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_date?: string;
          movement_type?: Database["public"]["Enums"]["stock_movement_type"];
          note?: string | null;
          product_id?: string;
          quantity?: number;
          reference?: string | null;
          source_id?: string | null;
          source_table?: string | null;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "inventory_valuation_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_sales_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_stock";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          id: string;
          level: Database["public"]["Enums"]["location_level"];
          name: string;
          notes: string | null;
          parent_id: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["location_level"];
          name: string;
          notes?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["location_level"];
          name?: string;
          notes?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number | null;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_cost?: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_cost?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "inventory_valuation_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_sales_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_stock";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          cargo_company_id: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          delivery_address: string | null;
          delivery_fee: number;
          discount: number;
          fulfillment: Database["public"]["Enums"]["fulfillment_type"];
          id: string;
          note: string | null;
          order_date: string;
          order_no: string;
          sale_id: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          zone_id: string | null;
        };
        Insert: {
          cargo_company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number;
          discount?: number;
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          id?: string;
          note?: string | null;
          order_date?: string;
          order_no?: string;
          sale_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          zone_id?: string | null;
        };
        Update: {
          cargo_company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number;
          discount?: number;
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          id?: string;
          note?: string | null;
          order_date?: string;
          order_no?: string;
          sale_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_cargo_company_id_fkey";
            columns: ["cargo_company_id"];
            isOneToOne: false;
            referencedRelation: "cargo_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_balances";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_sales_report";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_accounts: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          kind: string;
          name: string;
          opening_balance: number;
          scope: Database["public"]["Enums"]["financial_scope"];
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          kind?: string;
          name: string;
          opening_balance?: number;
          scope?: Database["public"]["Enums"]["financial_scope"];
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          opening_balance?: number;
          scope?: Database["public"]["Enums"]["financial_scope"];
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_channels: {
        Row: {
          active: boolean;
          created_at: string;
          group_name: string;
          id: string;
          is_default: boolean;
          method: Database["public"]["Enums"]["payment_method"];
          name: string;
          requires_bank_name: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          group_name: string;
          id?: string;
          is_default?: boolean;
          method: Database["public"]["Enums"]["payment_method"];
          name: string;
          requires_bank_name?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          group_name?: string;
          id?: string;
          is_default?: boolean;
          method?: Database["public"]["Enums"]["payment_method"];
          name?: string;
          requires_bank_name?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_brands: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_price_history: {
        Row: {
          changed_by: string | null;
          cost_price: number;
          created_at: string;
          effective_from: string;
          id: string;
          note: string | null;
          product_id: string;
          sell_price: number;
        };
        Insert: {
          changed_by?: string | null;
          cost_price: number;
          created_at?: string;
          effective_from?: string;
          id?: string;
          note?: string | null;
          product_id: string;
          sell_price: number;
        };
        Update: {
          changed_by?: string | null;
          cost_price?: number;
          created_at?: string;
          effective_from?: string;
          id?: string;
          note?: string | null;
          product_id?: string;
          sell_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "inventory_valuation_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_sales_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_stock";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          barcode: string | null;
          brand_id: string | null;
          category_id: string | null;
          cost_price: number;
          created_at: string;
          created_by: string | null;
          id: string;
          image_url: string | null;
          name: string;
          notes: string | null;
          opening_stock: number;
          reorder_level: number;
          sell_price: number;
          sku: string;
          unit: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          barcode?: string | null;
          brand_id?: string | null;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          notes?: string | null;
          opening_stock?: number;
          reorder_level?: number;
          sell_price?: number;
          sku: string;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          barcode?: string | null;
          brand_id?: string | null;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          notes?: string | null;
          opening_stock?: number;
          reorder_level?: number;
          sell_price?: number;
          sku?: string;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "product_brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number | null;
          product_id: string;
          purchase_id: string;
          quantity: number;
          unit_cost: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id: string;
          purchase_id: string;
          quantity: number;
          unit_cost: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id?: string;
          purchase_id?: string;
          quantity?: number;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "inventory_valuation_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_sales_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_stock";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases_overview";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_return_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number | null;
          product_id: string;
          quantity: number;
          return_id: string;
          unit_cost: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id: string;
          quantity: number;
          return_id: string;
          unit_cost: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id?: string;
          quantity?: number;
          return_id?: string;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "inventory_valuation_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "purchase_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_sales_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "purchase_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_stock";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "purchase_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_return_items_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "purchase_returns";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_returns: {
        Row: {
          account_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          note: string | null;
          purchase_id: string;
          refund_amount: number;
          refund_method: Database["public"]["Enums"]["payment_method"] | null;
          return_date: string;
          status: Database["public"]["Enums"]["txn_status"];
          supplier_id: string | null;
          total: number;
        };
        Insert: {
          account_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          purchase_id: string;
          refund_amount?: number;
          refund_method?: Database["public"]["Enums"]["payment_method"] | null;
          return_date?: string;
          status?: Database["public"]["Enums"]["txn_status"];
          supplier_id?: string | null;
          total?: number;
        };
        Update: {
          account_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          purchase_id?: string;
          refund_amount?: number;
          refund_method?: Database["public"]["Enums"]["payment_method"] | null;
          return_date?: string;
          status?: Database["public"]["Enums"]["txn_status"];
          supplier_id?: string | null;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_returns_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "purchase_returns_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "purchase_returns_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_returns_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_returns_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "supplier_balances";
            referencedColumns: ["supplier_id"];
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          account_id: string | null;
          balance: number | null;
          created_at: string;
          created_by: string | null;
          discount: number;
          extra_cost: number;
          id: string;
          invoice_no: string | null;
          note: string | null;
          paid_amount: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["purchase_payment_status"];
          purchase_date: string;
          purchase_no: string;
          returned_total: number;
          status: Database["public"]["Enums"]["txn_status"];
          subtotal: number;
          supplier_id: string | null;
          total: number;
          updated_at: string;
        };
        Insert: {
          account_id?: string | null;
          balance?: number | null;
          created_at?: string;
          created_by?: string | null;
          discount?: number;
          extra_cost?: number;
          id?: string;
          invoice_no?: string | null;
          note?: string | null;
          paid_amount?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["purchase_payment_status"];
          purchase_date?: string;
          purchase_no?: string;
          returned_total?: number;
          status?: Database["public"]["Enums"]["txn_status"];
          subtotal?: number;
          supplier_id?: string | null;
          total?: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          balance?: number | null;
          created_at?: string;
          created_by?: string | null;
          discount?: number;
          extra_cost?: number;
          id?: string;
          invoice_no?: string | null;
          note?: string | null;
          paid_amount?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["purchase_payment_status"];
          purchase_date?: string;
          purchase_no?: string;
          returned_total?: number;
          status?: Database["public"]["Enums"]["txn_status"];
          subtotal?: number;
          supplier_id?: string | null;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "purchases_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "purchases_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "supplier_balances";
            referencedColumns: ["supplier_id"];
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number | null;
          product_id: string;
          quantity: number;
          sale_id: string;
          unit_cost: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id: string;
          quantity: number;
          sale_id: string;
          unit_cost?: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id?: string;
          quantity?: number;
          sale_id?: string;
          unit_cost?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "inventory_valuation_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_sales_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_stock";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          account_id: string | null;
          address: string | null;
          advance_amount: number;
          balance: number | null;
          bank_name: string | null;
          cargo_company_id: string | null;
          cargo_fee: number;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          delivery_company_id: string | null;
          delivery_fee: number;
          discount: number;
          driver_id: string | null;
          fee_balance: number | null;
          fee_paid: number;
          fulfillment: Database["public"]["Enums"]["fulfillment_type"];
          id: string;
          location_id: string | null;
          note: string | null;
          paid_amount: number;
          payment_channel_id: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["sale_payment_status"];
          recipient_name: string | null;
          recipient_phone: string | null;
          region_id: string | null;
          returned_total: number;
          sale_date: string;
          sale_no: string;
          sale_time: string;
          status: Database["public"]["Enums"]["txn_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          updated_by: string | null;
          vat_amount: number;
          vat_rate: number;
        };
        Insert: {
          account_id?: string | null;
          address?: string | null;
          advance_amount?: number;
          balance?: number | null;
          bank_name?: string | null;
          cargo_company_id?: string | null;
          cargo_fee?: number;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          delivery_company_id?: string | null;
          delivery_fee?: number;
          discount?: number;
          driver_id?: string | null;
          fee_balance?: number | null;
          fee_paid?: number;
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          id?: string;
          location_id?: string | null;
          note?: string | null;
          paid_amount?: number;
          payment_channel_id?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["sale_payment_status"];
          recipient_name?: string | null;
          recipient_phone?: string | null;
          region_id?: string | null;
          returned_total?: number;
          sale_date?: string;
          sale_no?: string;
          sale_time?: string;
          status?: Database["public"]["Enums"]["txn_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          updated_by?: string | null;
          vat_amount?: number;
          vat_rate?: number;
        };
        Update: {
          account_id?: string | null;
          address?: string | null;
          advance_amount?: number;
          balance?: number | null;
          bank_name?: string | null;
          cargo_company_id?: string | null;
          cargo_fee?: number;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          delivery_company_id?: string | null;
          delivery_fee?: number;
          discount?: number;
          driver_id?: string | null;
          fee_balance?: number | null;
          fee_paid?: number;
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          id?: string;
          location_id?: string | null;
          note?: string | null;
          paid_amount?: number;
          payment_channel_id?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["sale_payment_status"];
          recipient_name?: string | null;
          recipient_phone?: string | null;
          region_id?: string | null;
          returned_total?: number;
          sale_date?: string;
          sale_no?: string;
          sale_time?: string;
          status?: Database["public"]["Enums"]["txn_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          updated_by?: string | null;
          vat_amount?: number;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "sales_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "sales_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_cargo_company_id_fkey";
            columns: ["cargo_company_id"];
            isOneToOne: false;
            referencedRelation: "cargo_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_balances";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_sales_report";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_delivery_company_id_fkey";
            columns: ["delivery_company_id"];
            isOneToOne: false;
            referencedRelation: "delivery_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "sales_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "sales_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_payment_channel_id_fkey";
            columns: ["payment_channel_id"];
            isOneToOne: false;
            referencedRelation: "payment_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_return_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number | null;
          product_id: string;
          quantity: number;
          return_id: string;
          unit_cost: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id: string;
          quantity: number;
          return_id: string;
          unit_cost?: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number | null;
          product_id?: string;
          quantity?: number;
          return_id?: string;
          unit_cost?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "inventory_valuation_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "sales_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_sales_report";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "sales_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_stock";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "sales_return_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_return_items_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "sales_returns";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_returns: {
        Row: {
          account_id: string | null;
          cogs: number;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          id: string;
          note: string | null;
          refund_amount: number;
          refund_method: Database["public"]["Enums"]["payment_method"] | null;
          restock: boolean;
          return_date: string;
          sale_id: string;
          status: Database["public"]["Enums"]["txn_status"];
          total: number;
        };
        Insert: {
          account_id?: string | null;
          cogs?: number;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          id?: string;
          note?: string | null;
          refund_amount?: number;
          refund_method?: Database["public"]["Enums"]["payment_method"] | null;
          restock?: boolean;
          return_date?: string;
          sale_id: string;
          status?: Database["public"]["Enums"]["txn_status"];
          total?: number;
        };
        Update: {
          account_id?: string | null;
          cogs?: number;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          id?: string;
          note?: string | null;
          refund_amount?: number;
          refund_method?: Database["public"]["Enums"]["payment_method"] | null;
          restock?: boolean;
          return_date?: string;
          sale_id?: string;
          status?: Database["public"]["Enums"]["txn_status"];
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_returns_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "sales_returns_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "sales_returns_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_balances";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_sales_report";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_payments: {
        Row: {
          account_id: string | null;
          amount: number;
          created_at: string;
          created_by: string | null;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          payment_date: string;
          purchase_id: string | null;
          reference: string | null;
          status: Database["public"]["Enums"]["txn_status"];
          supplier_id: string;
        };
        Insert: {
          account_id?: string | null;
          amount: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          payment_date?: string;
          purchase_id?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
          supplier_id: string;
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          payment_date?: string;
          purchase_id?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["txn_status"];
          supplier_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "supplier_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "supplier_payments_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "supplier_balances";
            referencedColumns: ["supplier_id"];
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          active: boolean;
          address: string | null;
          contact_person: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          opening_balance: number;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          opening_balance?: number;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          opening_balance?: number;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      account_balances: {
        Row: {
          account_id: string | null;
          active: boolean | null;
          balance: number | null;
          kind: string | null;
          name: string | null;
          opening_balance: number | null;
          scope: Database["public"]["Enums"]["financial_scope"] | null;
        };
        Relationships: [];
      };
      account_balances_report: {
        Row: {
          account_id: string | null;
          active: boolean | null;
          balance: number | null;
          kind: string | null;
          name: string | null;
          scope: Database["public"]["Enums"]["financial_scope"] | null;
        };
        Relationships: [];
      };
      app_users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          full_name: string | null;
          roles: Database["public"]["Enums"]["app_role"][] | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      audit_log_view: {
        Row: {
          action: string | null;
          actor: string | null;
          actor_name: string | null;
          affected_date: string | null;
          created_at: string | null;
          entity_id: string | null;
          entity_table: string | null;
          id: string | null;
          new_value: Json | null;
          old_value: Json | null;
          reason: string | null;
        };
        Relationships: [];
      };
      customer_balances: {
        Row: {
          active: boolean | null;
          balance: number | null;
          credit_available: number | null;
          credit_limit: number | null;
          customer_id: string | null;
          email: string | null;
          last_payment_date: string | null;
          last_sale_date: string | null;
          name: string | null;
          paid_total: number | null;
          phone: string | null;
          returned_total: number | null;
          sales_total: number | null;
        };
        Relationships: [];
      };
      customer_sales_report: {
        Row: {
          active: boolean | null;
          customer_id: string | null;
          last_sale_on: string | null;
          name: string | null;
          outstanding: number | null;
          paid_total: number | null;
          phone: string | null;
          sales_count: number | null;
          sales_total: number | null;
        };
        Relationships: [];
      };
      deliveries_overview: {
        Row: {
          address: string | null;
          cargo_company_id: string | null;
          cargo_company_name: string | null;
          cod_amount: number | null;
          created_at: string | null;
          customer_id: string | null;
          customer_name: string | null;
          delivered_at: string | null;
          delivery_no: string | null;
          dispatch_date: string | null;
          driver_id: string | null;
          driver_name: string | null;
          driver_phone: string | null;
          fee: number | null;
          id: string | null;
          note: string | null;
          order_id: string | null;
          order_no: string | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          sale_id: string | null;
          sale_no: string | null;
          status: Database["public"]["Enums"]["delivery_status"] | null;
          zone_id: string | null;
          zone_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_cargo_company_id_fkey";
            columns: ["cargo_company_id"];
            isOneToOne: false;
            referencedRelation: "cargo_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_balances: {
        Row: {
          active: boolean | null;
          cod_collected: number | null;
          cod_total: number | null;
          driver_id: string | null;
          handed_over: number | null;
          name: string | null;
          outstanding: number | null;
          phone: string | null;
          vehicle_type: string | null;
        };
        Relationships: [];
      };
      driver_performance: {
        Row: {
          active: boolean | null;
          cod_collected: number | null;
          delivered: number | null;
          deliveries_total: number | null;
          driver_id: string | null;
          fees_total: number | null;
          in_progress: number | null;
          last_delivery_at: string | null;
          name: string | null;
          phone: string | null;
          unassigned: number | null;
          unsuccessful: number | null;
          vehicle_type: string | null;
        };
        Relationships: [];
      };
      expense_report: {
        Row: {
          amount: number | null;
          category: string | null;
          day: string | null;
          entries: number | null;
          scope: Database["public"]["Enums"]["financial_scope"] | null;
        };
        Relationships: [];
      };
      income_report: {
        Row: {
          amount: number | null;
          category: string | null;
          day: string | null;
          entries: number | null;
          scope: Database["public"]["Enums"]["financial_scope"] | null;
        };
        Relationships: [];
      };
      inventory_valuation_report: {
        Row: {
          cost_price: number | null;
          low_stock: boolean | null;
          name: string | null;
          product_id: string | null;
          reorder_level: number | null;
          retail_value: number | null;
          sell_price: number | null;
          sku: string | null;
          stock_on_hand: number | null;
          stock_value: number | null;
          unit: string | null;
        };
        Relationships: [];
      };
      orders_overview: {
        Row: {
          cargo_company_id: string | null;
          cargo_company_name: string | null;
          created_at: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          delivery_address: string | null;
          delivery_fee: number | null;
          delivery_id: string | null;
          delivery_no: string | null;
          delivery_status: Database["public"]["Enums"]["delivery_status"] | null;
          discount: number | null;
          driver_id: string | null;
          driver_name: string | null;
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null;
          id: string | null;
          item_count: number | null;
          note: string | null;
          order_date: string | null;
          order_no: string | null;
          quantity_total: number | null;
          sale_id: string | null;
          sale_no: string | null;
          status: Database["public"]["Enums"]["order_status"] | null;
          subtotal: number | null;
          total: number | null;
          zone_id: string | null;
          zone_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_cargo_company_id_fkey";
            columns: ["cargo_company_id"];
            isOneToOne: false;
            referencedRelation: "cargo_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_balances";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_sales_report";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales_overview";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      product_sales_report: {
        Row: {
          cost: number | null;
          last_sold_on: string | null;
          name: string | null;
          product_id: string | null;
          profit: number | null;
          quantity_sold: number | null;
          revenue: number | null;
          sku: string | null;
          unit: string | null;
        };
        Relationships: [];
      };
      product_stock: {
        Row: {
          active: boolean | null;
          barcode: string | null;
          brand_id: string | null;
          category_id: string | null;
          cost_price: number | null;
          is_low_stock: boolean | null;
          name: string | null;
          product_id: string | null;
          reorder_level: number | null;
          sell_price: number | null;
          sku: string | null;
          stock_on_hand: number | null;
          stock_value: number | null;
          unit: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "product_brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profit_loss_report: {
        Row: {
          achievement: number | null;
          business_expenses: number | null;
          cash_balance: number | null;
          cogs: number | null;
          day: string | null;
          gross_profit: number | null;
          guaranteed_income: number | null;
          minus_amount: number | null;
          net_profit: number | null;
          other_income: number | null;
          personal_expenses: number | null;
          plus_amount: number | null;
          receivables: number | null;
          sales_net: number | null;
          target: number | null;
        };
        Insert: {
          achievement?: number | null;
          business_expenses?: number | null;
          cash_balance?: number | null;
          cogs?: number | null;
          day?: string | null;
          gross_profit?: number | null;
          guaranteed_income?: number | null;
          minus_amount?: number | null;
          net_profit?: number | null;
          other_income?: number | null;
          personal_expenses?: number | null;
          plus_amount?: number | null;
          receivables?: number | null;
          sales_net?: number | null;
          target?: number | null;
        };
        Update: {
          achievement?: number | null;
          business_expenses?: number | null;
          cash_balance?: number | null;
          cogs?: number | null;
          day?: string | null;
          gross_profit?: number | null;
          guaranteed_income?: number | null;
          minus_amount?: number | null;
          net_profit?: number | null;
          other_income?: number | null;
          personal_expenses?: number | null;
          plus_amount?: number | null;
          receivables?: number | null;
          sales_net?: number | null;
          target?: number | null;
        };
        Relationships: [];
      };
      purchases_overview: {
        Row: {
          account_id: string | null;
          account_name: string | null;
          balance: number | null;
          created_at: string | null;
          discount: number | null;
          extra_cost: number | null;
          id: string | null;
          invoice_no: string | null;
          item_count: number | null;
          note: string | null;
          paid_amount: number | null;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          payment_status: Database["public"]["Enums"]["purchase_payment_status"] | null;
          purchase_date: string | null;
          purchase_no: string | null;
          quantity_total: number | null;
          returned_total: number | null;
          status: Database["public"]["Enums"]["txn_status"] | null;
          subtotal: number | null;
          supplier_id: string | null;
          supplier_name: string | null;
          supplier_phone: string | null;
          total: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "purchases_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "purchases_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "supplier_balances";
            referencedColumns: ["supplier_id"];
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_daily_report: {
        Row: {
          cogs_total: number | null;
          day: string | null;
          debt_total: number | null;
          discount_total: number | null;
          gross_profit: number | null;
          paid_total: number | null;
          sales_count: number | null;
          sales_total: number | null;
        };
        Relationships: [];
      };
      sales_overview: {
        Row: {
          account_id: string | null;
          account_name: string | null;
          address: string | null;
          advance_amount: number | null;
          balance: number | null;
          bank_name: string | null;
          cargo_company_id: string | null;
          cargo_company_name: string | null;
          cargo_fee: number | null;
          cogs_total: number | null;
          created_at: string | null;
          customer_address: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          delivered_at: string | null;
          delivery_company_id: string | null;
          delivery_company_name: string | null;
          delivery_fee: number | null;
          delivery_id: string | null;
          delivery_no: string | null;
          delivery_status: Database["public"]["Enums"]["delivery_status"] | null;
          discount: number | null;
          driver_id: string | null;
          driver_name: string | null;
          driver_phone: string | null;
          fee_balance: number | null;
          fee_paid: number | null;
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null;
          gross_profit: number | null;
          id: string | null;
          item_count: number | null;
          location_id: string | null;
          location_name: string | null;
          note: string | null;
          paid_amount: number | null;
          payment_channel_id: string | null;
          payment_channel_name: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          payment_status: Database["public"]["Enums"]["sale_payment_status"] | null;
          quantity_total: number | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          region_id: string | null;
          region_name: string | null;
          returned_total: number | null;
          sale_date: string | null;
          sale_no: string | null;
          sale_time: string | null;
          status: Database["public"]["Enums"]["txn_status"] | null;
          subtotal: number | null;
          total: number | null;
          vat_amount: number | null;
          vat_rate: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "sales_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "account_balances_report";
            referencedColumns: ["account_id"];
          },
          {
            foreignKeyName: "sales_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "payment_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_cargo_company_id_fkey";
            columns: ["cargo_company_id"];
            isOneToOne: false;
            referencedRelation: "cargo_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_balances";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_sales_report";
            referencedColumns: ["customer_id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_delivery_company_id_fkey";
            columns: ["delivery_company_id"];
            isOneToOne: false;
            referencedRelation: "delivery_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_balances";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "sales_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "driver_performance";
            referencedColumns: ["driver_id"];
          },
          {
            foreignKeyName: "sales_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_payment_channel_id_fkey";
            columns: ["payment_channel_id"];
            isOneToOne: false;
            referencedRelation: "payment_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_balances: {
        Row: {
          active: boolean | null;
          balance: number | null;
          name: string | null;
          opening_balance: number | null;
          paid: number | null;
          phone: string | null;
          purchased: number | null;
          returned: number | null;
          supplier_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_set_user_role: {
        Args: {
          _enabled: boolean;
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: undefined;
      };
      apply_sale: {
        Args: {
          _account_id: string;
          _address: string;
          _advance_amount: number;
          _cargo_company_id: string;
          _cargo_fee: number;
          _customer_id: string;
          _delivery_company_id: string;
          _delivery_fee: number;
          _discount: number;
          _driver_id: string;
          _fulfillment: Database["public"]["Enums"]["fulfillment_type"];
          _items: Json;
          _location_id: string;
          _note: string;
          _paid_amount: number;
          _payment_method: Database["public"]["Enums"]["payment_method"];
          _recipient_name: string;
          _recipient_phone: string;
          _region_id: string;
          _sale_date: string;
          _sale_id: string;
          _sale_time: string;
          _vat_rate: number;
        };
        Returns: undefined;
      };
      business_overview: {
        Args: { _from?: string; _to?: string };
        Returns: Json;
      };
      can_sell: { Args: { _user_id: string }; Returns: boolean };
      cancel_order: { Args: { _order_id: string }; Returns: undefined };
      convert_order_to_sale: {
        Args: {
          _account_id?: string;
          _order_id: string;
          _paid_amount?: number;
          _payment_method?: Database["public"]["Enums"]["payment_method"];
          _sale_date?: string;
        };
        Returns: string;
      };
      create_account_transfer: {
        Args: {
          _amount: number;
          _from_account_id: string;
          _note?: string;
          _to_account_id: string;
          _transfer_date?: string;
        };
        Returns: string;
      };
      create_delivery: {
        Args: {
          _address?: string;
          _cargo_company_id?: string;
          _cod_amount?: number;
          _driver_id?: string;
          _fee?: number;
          _note?: string;
          _order_id?: string;
          _recipient_name?: string;
          _recipient_phone?: string;
          _sale_id?: string;
          _zone_id?: string;
        };
        Returns: string;
      };
      create_order: {
        Args: {
          _address?: string;
          _cargo_company_id?: string;
          _customer_id: string;
          _delivery_fee?: number;
          _discount?: number;
          _fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          _items: Json;
          _note?: string;
          _order_date: string;
          _zone_id?: string;
        };
        Returns: string;
      };
      create_purchase: {
        Args: {
          _account_id?: string;
          _discount?: number;
          _extra_cost?: number;
          _invoice_no?: string;
          _items: Json;
          _note?: string;
          _paid_amount?: number;
          _payment_method?: Database["public"]["Enums"]["payment_method"];
          _purchase_date: string;
          _supplier_id: string;
          _update_cost?: boolean;
        };
        Returns: string;
      };
      create_purchase_return: {
        Args: {
          _account_id?: string;
          _items: Json;
          _note?: string;
          _purchase_id: string;
          _refund_amount?: number;
          _refund_method?: Database["public"]["Enums"]["payment_method"];
          _return_date?: string;
        };
        Returns: string;
      };
      create_sale: {
        Args: {
          _account_id?: string;
          _address?: string;
          _advance_amount?: number;
          _cargo_company_id?: string;
          _cargo_fee?: number;
          _customer_id: string;
          _delivery_company_id?: string;
          _delivery_fee?: number;
          _discount?: number;
          _driver_id?: string;
          _fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          _items: Json;
          _location_id?: string;
          _note?: string;
          _paid_amount?: number;
          _payment_method?: Database["public"]["Enums"]["payment_method"];
          _recipient_name?: string;
          _recipient_phone?: string;
          _region_id?: string;
          _sale_date: string;
          _sale_time?: string;
          _vat_rate?: number;
        };
        Returns: string;
      };
      create_sale_return: {
        Args: {
          _account_id?: string;
          _items: Json;
          _note?: string;
          _refund_amount?: number;
          _refund_method?: Database["public"]["Enums"]["payment_method"];
          _restock?: boolean;
          _return_date?: string;
          _sale_id: string;
        };
        Returns: string;
      };
      customer_statement: {
        Args: { _customer_id: string };
        Returns: {
          credit: number;
          debit: number;
          description: string;
          entry_date: string;
          kind: string;
          reference: string;
          running_balance: number;
        }[];
      };
      ensure_financial_periods: {
        Args: { _from: string; _to: string };
        Returns: undefined;
      };
      factory_reset: {
        Args: { _confirm: string; _include_masters?: boolean };
        Returns: Json;
      };
      financial_snapshot: { Args: { _date?: string }; Returns: Json };
      financial_start_date: { Args: never; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      lookup_cargo_rate: {
        Args: { _company_id: string; _location_id: string; _on?: string };
        Returns: number;
      };
      lookup_delivery_rate: {
        Args: {
          _company_id?: string;
          _driver_id?: string;
          _location_id: string;
          _on?: string;
        };
        Returns: number;
      };
      next_delivery_number: { Args: never; Returns: string };
      next_order_number: { Args: never; Returns: string };
      next_purchase_number: { Args: never; Returns: string };
      next_sale_number: { Args: never; Returns: string };
      rebuild_financial_chain: { Args: { _from?: string }; Returns: undefined };
      record_collection: {
        Args: {
          _account_id?: string;
          _amount: number;
          _customer_id: string;
          _method?: Database["public"]["Enums"]["payment_method"];
          _note?: string;
          _payment_date?: string;
          _reference?: string;
          _sale_id?: string;
        };
        Returns: string;
      };
      record_driver_handover: {
        Args: {
          _account_id: string;
          _amount: number;
          _driver_id: string;
          _handover_date?: string;
          _method?: Database["public"]["Enums"]["payment_method"];
          _note?: string;
          _reference?: string;
        };
        Returns: string;
      };
      record_expense: {
        Args: {
          _account_id?: string;
          _amount: number;
          _category: string;
          _description?: string;
          _scope?: Database["public"]["Enums"]["financial_scope"];
          _settles_rule_id?: string;
          _txn_date?: string;
        };
        Returns: string;
      };
      record_fulfillment_event: {
        Args: {
          _account_id?: string;
          _amount_collected?: number;
          _driver_id?: string;
          _method?: Database["public"]["Enums"]["payment_method"];
          _note?: string;
          _occurred_at?: string;
          _sale_id: string;
          _status: string;
        };
        Returns: string;
      };
      record_income: {
        Args: {
          _account_id?: string;
          _amount: number;
          _category: string;
          _description?: string;
          _scope?: Database["public"]["Enums"]["financial_scope"];
          _txn_date?: string;
        };
        Returns: string;
      };
      record_supplier_payment: {
        Args: {
          _account_id: string;
          _amount: number;
          _method?: Database["public"]["Enums"]["payment_method"];
          _note?: string;
          _payment_date?: string;
          _purchase_id?: string;
          _reference?: string;
          _supplier_id: string;
        };
        Returns: string;
      };
      reverse_sale: {
        Args: { _reason?: string; _sale_id: string };
        Returns: undefined;
      };
      sale_statement: { Args: { _sale_id: string }; Returns: Json };
      sales_smart_defaults: { Args: never; Returns: Json };
      set_sale_extras: {
        Args: {
          _bank_name?: string;
          _payment_channel_id?: string;
          _sale_id: string;
          _sale_no?: string;
        };
        Returns: undefined;
      };
      update_delivery_status: {
        Args: {
          _delivery_id: string;
          _note?: string;
          _status: Database["public"]["Enums"]["delivery_status"];
        };
        Returns: undefined;
      };
      update_sale: {
        Args: {
          _account_id?: string;
          _address?: string;
          _advance_amount?: number;
          _cargo_company_id?: string;
          _cargo_fee?: number;
          _customer_id: string;
          _delivery_company_id?: string;
          _delivery_fee?: number;
          _discount?: number;
          _driver_id?: string;
          _fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          _items: Json;
          _location_id?: string;
          _note?: string;
          _paid_amount?: number;
          _payment_method?: Database["public"]["Enums"]["payment_method"];
          _recipient_name?: string;
          _recipient_phone?: string;
          _region_id?: string;
          _sale_date: string;
          _sale_id: string;
          _sale_time?: string;
          _vat_rate?: number;
        };
        Returns: string;
      };
      void_financial_transaction: {
        Args: { _reason?: string; _txn_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "owner" | "admin" | "manager" | "cashier" | "driver" | "viewer";
      delivery_status:
        "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed" | "returned";
      financial_scope: "business" | "personal";
      fulfillment_type: "pickup" | "delivery" | "cargo";
      location_level: "district" | "region";
      order_status:
        | "pending"
        | "confirmed"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "converted";
      payment_method: "cash" | "evc_plus" | "edahab" | "merchant" | "bank";
      period_status: "open" | "closed";
      purchase_payment_status: "full_paid" | "partial" | "full_debt";
      rule_frequency: "daily" | "friday" | "weekly" | "monthly" | "yearly";
      rule_kind: "obligation" | "guaranteed_income";
      sale_payment_status: "full_paid" | "partial" | "full_debt";
      stock_movement_type:
        | "opening"
        | "purchase"
        | "sale"
        | "return_in"
        | "return_out"
        | "adjustment"
        | "damage"
        | "loss"
        | "transfer";
      txn_status: "active" | "void";
      txn_type:
        | "sale"
        | "expense"
        | "income"
        | "collection"
        | "capital"
        | "transfer"
        | "adjustment"
        | "sale_return";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "cashier", "driver", "viewer"],
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
        "returned",
      ],
      financial_scope: ["business", "personal"],
      fulfillment_type: ["pickup", "delivery", "cargo"],
      location_level: ["district", "region"],
      order_status: [
        "pending",
        "confirmed",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "converted",
      ],
      payment_method: ["cash", "evc_plus", "edahab", "merchant", "bank"],
      period_status: ["open", "closed"],
      purchase_payment_status: ["full_paid", "partial", "full_debt"],
      rule_frequency: ["daily", "friday", "weekly", "monthly", "yearly"],
      rule_kind: ["obligation", "guaranteed_income"],
      sale_payment_status: ["full_paid", "partial", "full_debt"],
      stock_movement_type: [
        "opening",
        "purchase",
        "sale",
        "return_in",
        "return_out",
        "adjustment",
        "damage",
        "loss",
        "transfer",
      ],
      txn_status: ["active", "void"],
      txn_type: [
        "sale",
        "expense",
        "income",
        "collection",
        "capital",
        "transfer",
        "adjustment",
        "sale_return",
      ],
    },
  },
} as const;
