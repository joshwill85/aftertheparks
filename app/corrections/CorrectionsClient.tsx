"use client";

import { useState } from "react";
import { Hero } from "@/components/atlas/Hero";
import { BrandAsset } from "@/components/brand/BrandAsset";

export function CorrectionsClient() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });
      if (res.ok) setSubmitted(true);
      else setError("Could not submit. Please try again.");
    } catch {
      setError("Could not submit. Please try again.");
    }
  };

  return (
    <>
      <Hero
        title="Contact us"
        subtitle="Spotted outdated info or want to send a note? We read every message."
      />
      {submitted ? (
        <div className="max-w-lg rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 text-center text-[var(--color-muted)]">
          <BrandAsset asset="guide-companion" className="brand-asset--empty" />
          <p className="mt-4">Thank you - we&apos;ll review your correction.</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-lg space-y-4 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              placeholder="Tell us what you found, what page you were on, or anything else we should know."
              className="mt-1 w-full rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-lantern)]">{error}</p>}
          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm text-white"
          >
            Send message
          </button>
        </form>
      )}
    </>
  );
}
