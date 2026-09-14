/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sales, Customers, Collections and Cashier functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";
import type {
  CreateSaleInput,
  Customer,
  CustomerBalance,
  CustomerInput,
  PaymentAccount,
  PaymentChannel,
  RecordCollectionInput,
  SaleOverview,
} from "@/lib/sales-types";

export const listSales = createRpcFn<
  { from?: string; to?: string; customer_id?: string; payment_status?: string; limit?: number },
  SaleOverview[]
>("listSales");

export const getSale = createRpcFn<{ id: string }, SaleOverview & { items: any[] }>("getSale");

export const listSaleItems = createRpcFn<{ sale_id: string }, any[]>("getSale");

export const listCustomers = createRpcFn<void, Customer[]>("listCustomers");

export const listCustomerBalances = createRpcFn<void, CustomerBalance[]>("listCustomerBalances");

export const getCustomerStatement = createRpcFn<{ customer_id: string }, any>("customerStatement");

export const listCollections = createRpcFn<{ customer_id?: string }, any[]>("listCustomerPayments");

export const listSalesReturns = createRpcFn<{ sale_id?: string }, any[]>("listSalesReturns");

export const listPaymentAccounts = createRpcFn<void, PaymentAccount[]>("listPaymentAccounts");

export const listPaymentChannels = createRpcFn<void, PaymentChannel[]>("listPaymentChannels");

export const peekNextSaleNo = createRpcFn<void, string>("nextSaleNumber");

export const listAccountBalances = createRpcFn<void, any[]>("listPaymentAccounts");

export const listAccountTransfers = createRpcFn<void, any[]>("listAccountTransfers");

export const createSale = createRpcFn<CreateSaleInput, any>("createSale");

export const updateSale = createRpcFn<any, any>("updateSale");

export const reverseSale = createRpcFn<{ sale_id: string }, any>("reverseSale");

export const recordCollection = createRpcFn<RecordCollectionInput, any>("recordCollection");

export const createSaleReturn = createRpcFn<any, any>("createSaleReturn");

export const createAccountTransfer = createRpcFn<any, any>("createAccountTransfer");

export const createCustomer = createRpcFn<CustomerInput, any>("saveCustomer");

export const updateCustomer = createRpcFn<CustomerInput, any>("saveCustomer");
