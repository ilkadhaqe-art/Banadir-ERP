/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unified RPC client bridge for Banadir Online FOS.
 * Provides clean HTTP client execution to `/api/rpc/:name`.
 */

export function createRpcFn<TInput = any, TOutput = any>(rpcName: string) {
  return async (args?: { data?: TInput } | TInput): Promise<TOutput> => {
    let payload: any = {};
    if (args !== undefined && args !== null) {
      if (typeof args === "object" && "data" in args) {
        payload = (args as { data?: TInput }).data;
      } else {
        payload = args;
      }
    }

    const baseUrl = typeof window !== "undefined" ? "" : "http://127.0.0.1:3000";
    const res = await fetch(`${baseUrl}/api/rpc/${rpcName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errBody.error || `RPC Error (${res.status}): ${res.statusText}`);
    }

    const body = await res.json();
    return body.data;
  };
}
