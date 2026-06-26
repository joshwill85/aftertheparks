import {
  getTurnstileSiteKey,
  isTurnstileClientConfigured,
} from "@/lib/turnstile/config";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile requires a browser"));
  }
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject());
        return;
      }
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Turnstile script failed"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export async function executeTurnstile(action: string): Promise<string | null> {
  if (!isTurnstileClientConfigured()) return null;
  const siteKey = getTurnstileSiteKey();
  if (!siteKey) return null;

  await loadTurnstileScript();
  if (!window.turnstile) return null;

  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.style.cssText =
      "position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none";
    document.body.appendChild(container);

    let widgetId: string | null = null;

    const cleanup = () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          /* widget may already be gone */
        }
      }
      container.remove();
    };

    const turnstile = window.turnstile;
    if (!turnstile) {
      cleanup();
      resolve(null);
      return;
    }

    widgetId = turnstile.render(container, {
      sitekey: siteKey,
      action,
      size: "invisible",
      execution: "execute",
      appearance: "interaction-only",
      callback: (token: string) => {
        cleanup();
        resolve(token);
      },
      "error-callback": () => {
        cleanup();
        resolve(null);
      },
      "expired-callback": () => {
        cleanup();
        resolve(null);
      },
    });

    turnstile.execute(widgetId);
  });
}
