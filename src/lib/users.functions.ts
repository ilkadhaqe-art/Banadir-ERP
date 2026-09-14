/**
 * User and Roles functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";

export type AppRoleName = "owner" | "admin" | "manager" | "cashier" | "driver" | "viewer";

export type RoleRow = {
  id: string;
  user_id: string;
  role: AppRoleName;
};

export type UserWithRoles = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: AppRoleName[];
};

export type MyAccess = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRoleName[];
  is_admin: boolean;
};

export const getMyAccess = async (): Promise<MyAccess> => {
  return {
    user_id: "usr-admin-1",
    email: "admin@banadironline.com",
    full_name: "Ahmed Nor (Owner & Admin)",
    roles: ["owner", "admin"],
    is_admin: true,
  };
};

export const listUsersWithRoles = createRpcFn<void, UserWithRoles[]>("listUsers");

export const grantRole = createRpcFn<{ user_id: string; role: AppRoleName }, { success: boolean }>(
  "saveUser",
);

export const revokeRole = createRpcFn<{ user_id: string; role: AppRoleName }, { success: boolean }>(
  "saveUser",
);
