import { useEffect } from "react";

const SW_URL = "/sw.js";

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => {
        const worker = registration.active ?? registration.waiting ?? registration.installing;
        return worker ? new URL(worker.scriptURL).pathname === SW_URL : false;
      })
      .map((registration) => registration.unregister()),
  );
}

/**
 * Single guarded registration wrapper for the generated service worker.
 * Never registers in dev, inside an iframe, in Lovable preview, or with ?sw=off.
 */
export function PwaManager() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const blocked =
      !import.meta.env.PROD ||
      window.self !== window.top ||
      isPreviewHost(window.location.hostname) ||
      new URLSearchParams(window.location.search).get("sw") === "off";

    if (blocked) {
      void unregisterAppWorkers();
      return;
    }

    let cancelled = false;
    void import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        registerSW({ immediate: true });
      })
      .catch(() => {
        // Registration failures must never break the app shell.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
