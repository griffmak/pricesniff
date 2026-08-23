// app/AlternativesList.tsx
import { CategoryBadge } from "@/lib/categoryIcon";

export type Alternative = {
  productId: string;
  description: string;
  price: number;
  brand: string | null;
  size: string | null;
  category: string | null;
};

function krogerSearchUrl(description: string): string {
  return `https://www.kroger.com/search?query=${encodeURIComponent(description)}`;
}

export default function AlternativesList({
  alternatives,
  currentPrice,
}: {
  alternatives: Alternative[];
  currentPrice: number;
}) {
  if (alternatives.length === 0) {
    return (
      <p className="text-xs text-ink/40">
        No cheaper alternative found at your store today.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-ink/60">
        Cheaper alternative{alternatives.length === 1 ? "" : "s"}
      </p>

      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {alternatives.map((alt) => {
          const saving = currentPrice - alt.price;
          return (
            <li key={alt.productId} className="rounded-xl bg-cream p-3">
              <a
                href={krogerSearchUrl(alt.description)}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:underline"
              >
                <CategoryBadge category={alt.category} />
                <p className="mt-2 text-sm font-bold leading-5 text-ink">
                  ${alt.price.toFixed(2)}
                </p>
                {alt.brand && (
                  <p className="mt-0.5 text-[0.7rem] font-medium text-ink/70">
                    {alt.brand}
                  </p>
                )}
                <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-4 text-ink/60">
                  {alt.description}
                </p>
                {alt.size && (
                  <p className="mt-0.5 text-[0.68rem] text-ink/40">{alt.size}</p>
                )}
                <p className="mt-1.5 text-[0.7rem] font-semibold text-mint-deep">
                  Save ${saving.toFixed(2)}
                </p>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
