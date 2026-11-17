import Image from "next/image";

// Tartu Kesklinna Kooli logo (public/logo.svg).
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="Tartu Kesklinna Kool"
      width={size}
      height={size}
      unoptimized
      priority
      className="shrink-0 rounded-full"
    />
  );
}
