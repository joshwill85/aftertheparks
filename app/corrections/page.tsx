"use client";

import { useState } from "react";
import { Hero } from "@/components/atlas/Hero";

export default function CorrectionsPage() {
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
          field: form.get("field"),
          suggestedValue: form.get("value"),
          activityCatalogId: form.get("activityId") || null,
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
        title="Corrections"
        subtitle="Spotted outdated info? Help us keep schedules accurate."
      />
      {submitted ? (
        <p className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 text-[var(--color-muted)]">
          Thank you — we&apos;ll review your correction.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-lg space-y-4 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6"
        >
          <div>
            <label htmlFor="field" className="block text-sm font-medium">
              What needs updating?
            </label>
            <input
              id="field"
              name="field"
              required
              placeholder="e.g. schedule, location, movie title"
              className="mt-1 w-full rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="value" className="block text-sm font-medium">
              Suggested correction
            </label>
            <textarea
              id="value"
              name="value"
              required
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="activityId" className="block text-sm font-medium">
              Activity ID (optional)
            </label>
            <input
              id="activityId"
              name="activityId"
              className="mt-1 w-full rounded-lg border border-[var(--color-card-border)] bg-transparent px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-lantern)]">{error}</p>}
          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm text-white"
          >
            Submit correction
          </button>
        </form>
      )}
    </>
  );
}
