// app/onboarding/StapleForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type SelectedStaple = { searchTerm: string; productId: string; description: string };
type SearchResult = { productId: string; description: string; price: number };

export default function StapleForm({
  initialZip = "",
  initialStaples = [],
}: {
  initialZip?: string;
  initialStaples?: SelectedStaple[];
}) {
  const router = useRouter();
  const [zipCode, setZipCode] = useState(initialZip);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [zipError, setZipError] = useState("");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SelectedStaple[]>(initialStaples);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function resolveZip() {
    setZipError("");
    setLocationId(null);
    if (!/^\d{5}$/.test(zipCode)) return;

    try {
      const res = await fetch("/api/kroger/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipCode }),
      });
      const body = await res.json();
      if (!res.ok) {
        setZipError(body.error || "Could not find a store near that zip");
        return;
      }
      setLocationId(body.locationId);
    } catch (err) {
      setZipError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    if (!locationId || term.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/kroger/search?term=${encodeURIComponent(term)}&locationId=${locationId}`
        );
        const body = await res.json();
        setResults(res.ok ? body.products : []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [term, locationId]);

  function addStaple(product: SearchResult) {
    setSelected((prev) =>
      prev.some((s) => s.productId === product.productId)
        ? prev
        : [...prev, { searchTerm: term, productId: product.productId, description: product.description }]
    );
  }

  function removeStaple(productId: string) {
    setSelected((prev) => prev.filter((s) => s.productId !== productId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipCode, staples: selected }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || `Request failed (${res.status})`);
        setStatus("error");
        return;
      }

      // Land on the dashboard. It will show "waiting for first check" until the
      // next cron run writes snapshots for the new staple list.
      router.push("/");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      <label className="block font-medium text-ink">
        Zip code
        <input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          onBlur={resolveZip}
          className="mt-1 w-full rounded-lg border border-ink/20 bg-white px-3 py-2 focus:border-mint focus:outline-none"
          required
        />
      </label>
      {zipError && <p className="text-sm text-red-700">{zipError}</p>}

      <div>
        <label className="block font-medium text-ink">
          Search for a staple
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            disabled={!locationId}
            placeholder={locationId ? "e.g. eggs, whole milk" : "Enter a valid zip code first"}
            className="mt-1 w-full rounded-lg border border-ink/20 bg-white px-3 py-2 focus:border-mint focus:outline-none disabled:opacity-40"
          />
        </label>

        {searching && <p className="mt-2 text-sm text-ink/50">Searching…</p>}

        {results.length > 0 && (
          <ul className="mt-2 space-y-1">
            {results.map((product) => (
              <li key={product.productId}>
                <button
                  type="button"
                  onClick={() => addStaple(product)}
                  className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-ink hover:bg-cream"
                >
                  <span>{product.description}</span>
                  <span className="font-medium">${product.price.toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <fieldset>
        <legend className="font-medium text-ink">Tracking</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={s.productId}
              className="flex items-center gap-2 rounded-full bg-mint/30 px-3 py-1 text-sm text-ink"
            >
              {s.description}
              <button
                type="button"
                onClick={() => removeStaple(s.productId)}
                aria-label={`Remove ${s.description}`}
                className="font-bold"
              >
                ×
              </button>
            </span>
          ))}
          {selected.length === 0 && (
            <p className="text-sm text-ink/50">No staples selected yet.</p>
          )}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={status === "submitting" || selected.length === 0}
        className="w-full rounded-lg bg-mint px-4 py-3 font-semibold text-ink disabled:opacity-40"
      >
        {status === "submitting" ? "Sniffing…" : "Start tracking"}
      </button>

      {status === "error" && (
        <p className="text-sm text-red-700">Something went wrong: {errorMessage}</p>
      )}
    </form>
  );
}
