import Image from "next/image";

export default function NoseLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/nose-mint.png"
      alt="PriceSniff"
      width={64}
      height={64}
      className={className}
      priority
    />
  );
}
