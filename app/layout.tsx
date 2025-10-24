// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import NavBar from "./NavBar";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Navigoplan — Luxury Yacht Charter Itinerary Software",
  description: "Plan, price and present luxury yacht charter itineraries.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Navigoplan — Luxury Yacht Charter Itinerary Software",
    description: "Plan, price and present luxury yacht charter itineraries.",
    url: "https://navigoplan.com",
    siteName: "Navigoplan",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Navigoplan Preview" }],
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", site: "@navigoplan" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Premium NavBar (navy/gold) */}
        <NavBar />

        {/* Main Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} Navigoplan
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a href="/features" className="hover:underline">Features</a>
              <a href="/pricing" className="hover:underline">Pricing</a>
              <a href="/ai" className="hover:underline">AI Planner</a>
              <a href="mailto:hello@navigoplan.com" className="hover:underline">Contact</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
