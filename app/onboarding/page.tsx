import { createClient } from "@supabase/supabase-js";
import StapleForm from "./StapleForm";
import NoseLogo from "../NoseLogo";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function OnboardingPage() {
  const { data: watcher } = await supabase
    .from("watchers")
    .select("zip_code, staples(search_term)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const staples = (watcher?.staples ?? []) as Array<{ search_term: string }>;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="flex items-center justify-center gap-3">
        <NoseLogo className="h-12 w-12" />
        <h1 className="text-4xl font-extrabold text-ink">PriceSniff</h1>
      </div>
      <p className="mx-auto mt-3 max-w-md text-center text-ink/60">
        {watcher
          ? "Update your zip code or staple list. Saving replaces what you had before."
          : "One-time setup. No receipts, no bank connection."}
      </p>
      <StapleForm
        initialZip={watcher?.zip_code ?? ""}
        initialStaples={staples.map((s) => s.search_term)}
      />
    </main>
  );
}
