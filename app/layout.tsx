import "./globals.css";
import type { Metadata } from "next";
import NavBar from "./NavBar";

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
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-white text-slate-900">
        {/* Premium NavBar (navy/gold) */}
        <NavBar />

        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            <div className="text-sm text-slate-500">© {new Date().getFullYear()} Navigoplan</div>
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
