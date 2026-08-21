"use client";

import { useState } from "react";

const COMMON_STAPLES = [
  "eggs", "whole milk", "bread", "bananas", "chicken breast",
  "ground beef", "butter", "coffee", "cheese", "rice",
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function StapleForm() {
  const [zipCode, setZipCode] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("error");
        setErrorMessage("Notification permission was denied.");
        return;
      }

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipCode, staples: selected, pushSubscription }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.error || `Request failed (${res.status})`);
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 space-y-4">
      <label className="block">
        Zip code
        <input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          required
        />
      </label>
      <fieldset>
        <legend>Pick the staples you buy regularly</legend>
        {COMMON_STAPLES.map((item) => (
          <label key={item} className="flex items-center gap-2">
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
      </fieldset>
      <button
        type="submit"
        disabled={status === "submitting" || selected.length === 0}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Start tracking
      </button>
      {status === "done" && <p>You&apos;re set — PriceSniff will alert you when a price jumps.</p>}
      {status === "error" && <p>Something went wrong{errorMessage ? `: ${errorMessage}` : "."}</p>}
    </form>
  );
}
