"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COMMON_STAPLES = [
  "eggs", "whole milk", "bread", "bananas", "chicken breast",
  "ground beef", "butter", "coffee", "cheese", "rice",
];

export default function StapleForm({
  initialZip = "",
  initialStaples = [],
}: {
  initialZip?: string;
  initialStaples?: string[];
}) {
  const router = useRouter();
  const [zipCode, setZipCode] = useState(initialZip);
  const [selected, setSelected] = useState<string[]>(initialStaples);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
          className="mt-1 w-full rounded-lg border border-ink/20 bg-white px-3 py-2 focus:border-mint focus:outline-none"
          required
        />
      </label>

      <fieldset>
        <legend className="font-medium text-ink">Pick the staples you buy regularly</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {COMMON_STAPLES.map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-ink"
            >
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked ? [...prev, item] : prev.filter((s) => s !== item)
                  )
                }
              />
              {item}
            </label>
          ))}
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
