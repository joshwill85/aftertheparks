interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  size?: "normal" | "compact" | "invisible";
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  execution?: "render" | "execute";
  appearance?: "always" | "execute" | "interaction-only";
}

interface TurnstileInstance {
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

interface Window {
  turnstile?: TurnstileInstance;
}
