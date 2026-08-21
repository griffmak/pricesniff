import StapleForm from "./StapleForm";

export default function OnboardingPage() {
  return (
    <main>
      <h1 className="text-2xl font-bold text-center mt-8">PriceSniff</h1>
      <p className="text-center text-gray-600 mb-4">
        One-time setup. No receipts, no bank connection — just a push alert
        when your groceries get quietly more expensive.
      </p>
      <StapleForm />
    </main>
  );
}
