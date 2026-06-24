"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SiteGateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="site-gate__form mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
          const res = await fetch("/api/site-gate-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, next }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(
              data.error ?? "That password did not work. Please try again."
            );
            return;
          }
          router.push(data.redirect ?? "/");
          router.refresh();
        } catch {
          setError("Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <div>
        <label className="sr-only" htmlFor="site-gate-password">
          Preview password
        </label>
        <input
          id="site-gate-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Preview password"
          className="site-gate__input w-full rounded-full border border-[var(--border-soft)] bg-white px-5 py-3 text-base shadow-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-full py-3 text-sm font-bold text-white"
      >
        {loading ? "Checking…" : "Enter"}
      </button>
      {error && (
        <p className="text-center text-sm text-[var(--color-coral)]" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
