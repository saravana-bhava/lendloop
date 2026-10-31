import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "LendLoop — Neighborhood Tool-Lending Board",
  description: "Borrow what you need. Lend what you don’t.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Providers>
          <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg group-hover:bg-emerald-700 transition">
                  L
                </div>
                <div>
                  <span className="font-bold text-lg text-slate-900">LendLoop</span>
                  <span className="hidden sm:inline-block text-xs text-slate-500 ml-2">Neighborhood Lending</span>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-slate-700 hover:text-emerald-600 transition"
                  >
                    Dashboard
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm">
                      Sign in to lend or borrow
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
            <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>© {new Date().getFullYear()} LendLoop · Neighborhood Tool Sharing with n8n Automation</p>
              <p className="text-slate-400">Borrow what you need. Lend what you don’t.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
