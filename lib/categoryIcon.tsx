// lib/categoryIcon.tsx
import {
  Apple,
  Beef,
  Carrot,
  Cookie,
  CupSoda,
  Drumstick,
  Egg,
  Fish,
  Milk,
  Package,
  Snowflake,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Kroger's category strings, lowercased, mapped to the closest lucide glyph. This is
// deliberately a small fixed set reused across every item and alternative — no
// per-product artwork, nothing generated at runtime. Unmatched categories fall back
// to a generic package, which is a fine outcome, not a bug to chase.
const ICONS: Array<[string, LucideIcon]> = [
  ["dairy", Milk],
  ["milk", Milk],
  ["egg", Egg],
  ["beef", Beef],
  ["meat", Beef],
  ["poultry", Drumstick],
  ["chicken", Drumstick],
  ["seafood", Fish],
  ["fish", Fish],
  ["produce", Apple],
  ["fruit", Apple],
  ["vegetable", Carrot],
  ["bakery", Wheat],
  ["bread", Wheat],
  ["pasta", Wheat],
  ["grain", Wheat],
  ["cereal", Wheat],
  ["snack", Cookie],
  ["candy", Cookie],
  ["beverage", CupSoda],
  ["drink", CupSoda],
  ["frozen", Snowflake],
];

/** The icon for a Kroger category string. Always returns something. */
export function categoryIcon(category: string | null): LucideIcon {
  if (!category) return Package;
  const needle = category.toLowerCase();
  const hit = ICONS.find(([key]) => needle.includes(key));
  return hit ? hit[1] : Package;
}

/**
 * The category icon in the app's mint circle treatment — the same visual language
 * as the existing "Cheaper option" tag pill on the collapsed card.
 */
export function CategoryBadge({
  category,
  className = "size-9",
}: {
  category: string | null;
  className?: string;
}) {
  const Icon = categoryIcon(category);
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-mint/30 text-mint-deep ${className}`}
      aria-hidden="true"
    >
      <Icon className="size-1/2" strokeWidth={2.25} />
    </span>
  );
}
