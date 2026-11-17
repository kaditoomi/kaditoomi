import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arengukava seire",
  description: "Arengukava elluviimise ja mõju seire- ja juhtimisvahend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
