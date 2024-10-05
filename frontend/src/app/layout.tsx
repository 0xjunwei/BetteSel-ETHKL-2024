import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Web3 Marketplace",
  description: "A decentralized marketplace for digital assets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="bg-gray-800 text-white">
          <nav className="container mx-auto px-4 py-4">
            <ul className="flex space-x-4">
              <li>
                <Link href="/" className="hover:text-gray-300">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/create-listing" className="hover:text-gray-300">
                  Create Listing
                </Link>
              </li>
              <li>
                <Link href="/listing" className="hover:text-gray-300">
                  Listings
                </Link>
              </li>
              <li>
                <Link href="/faucet" className="hover:text-gray-300">
                  USDC Faucet
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="bg-gray-800 text-white mt-8">
          <div className="container mx-auto px-4 py-4 text-center">
            © 2024 Web3 Marketplace. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}