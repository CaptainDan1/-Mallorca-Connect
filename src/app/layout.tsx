import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mallorca-Connect",
  description:
    "Gemeinsamer digitaler Treffpunkt fuer die Mallorca-Reise vom 13.06. bis 17.06.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-stone-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
