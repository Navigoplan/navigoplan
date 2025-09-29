import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Navigoplan — Luxury Yacht Charter Itinerary Software',
  description: 'Plan, price and present luxury yacht charter itineraries.',
  icons: {
    icon: '/favicon.ico',   // favicon από τον φάκελο public
  },
  openGraph: {
    title: 'Navigoplan — Luxury Yacht Charter Itinerary Software',
    description: 'Plan, price and present luxury yacht charter itineraries.',
    url: 'https://navigoplan.com', // προσωρινά
    siteName: 'Navigoplan',
    images: [
      {
        url: '/og-image.jpg', // placeholder
        width: 1200,
        height: 630,
        alt: 'Navigoplan Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@navigoplan',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-white text-slate-900">
        {/* Navbar */}
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-brand-navy/70 backdrop-blur-lg">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            {/* Logo */}
            <a href="/" className="text-lg font-semibold tracking-tight text-brand-gold">
              Navigoplan
            </a>

            {/* Menu */}
            <ul className="hidden items-center gap-6 md:flex">
              <li>
                <a href="/features" className="text-sm text-white hover:text-brand-gold transition">
                  Features
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-sm text-white hover:text-brand-gold transition">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/ai" className="text-sm text-white hover:text-brand-gold transition">
                  AI Planner
                </a>
              </li>
              <li>
                <a
                  href="/#trial"
                  className="rounded-xl bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy transition hover:opacity-90"
                >
                  Start Free Trial
                </a>
              </li>
            </ul>
          </nav>
        </header>

        {/* Page content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} Navigoplan
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a href="/features" className="hover:underline">
                Features
              </a>
              <a href="/pricing" className="hover:underline">
                Pricing
              </a>
              <a href="/ai" className="hover:underline">
                AI Planner
              </a>
              <a href="mailto:hello@navigoplan.com" className="hover:underline">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
