import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FHR Deal Finder",
  description: "Find the cheapest Fine Hotels & Resorts stays",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FHR Deals",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('theme');
            if (t === 'light') {
              document.documentElement.setAttribute('data-theme', 'light');
            }
          })();
        `}} />
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
