"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Wrench, ArrowRight, ShieldCheck, RefreshCw, Zap } from "lucide-react";

const CATEGORIES = ["all", "power tools", "garden", "kitchen", "camping", "other"];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const publicTools = useQuery(api.tools.listPublicTools, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <Zap className="w-3.5 h-3.5" />
          Powered by Convex + Clerk + n8n Workflows
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          Borrow what you need. <br />
          <span className="text-emerald-600">Lend what you don’t.</span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg">
          LendLoop is your local neighborhood tool-lending board. Share lawnmowers, drills, and camping gear with neighbors securely with automated notifications.
        </p>

        <div className="pt-2 flex justify-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-6 py-3 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition">
                Sign in to lend or borrow
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Community Inventory</h3>
          <p className="text-xs text-slate-500">Access quality tools nearby without buying hardware you only use once a year.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Privacy & RBAC Enforced</h3>
          <p className="text-xs text-slate-500">Data minimization by design: owner identities remain confidential on public listings.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Automated n8n Lifecycle</h3>
          <p className="text-xs text-slate-500">Signed HMAC webhooks dispatch borrower notifications and daily overdue return reminders.</p>
        </div>
      </section>

      {/* Public Catalog (Data-minimized: Name & Category ONLY) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Available Neighborhood Tools</h2>
            <p className="text-xs text-slate-500">Public directory. Sign in to view full specs, condition, and submit loan requests.</p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        {publicTools === undefined ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading neighborhood catalog…</div>
        ) : publicTools.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700">No tools available in this category yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Be the first neighbor to list a tool in this category!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicTools.map((tool) => (
              <div
                key={tool._id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-300 transition shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                      {tool.category}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600">Available</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{tool.name}</h3>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Owner info protected</span>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        Borrow Tool <ArrowRight className="w-3 h-3" />
                      </button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <Link
                      href="/dashboard"
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      Borrow Tool <ArrowRight className="w-3 h-3" />
                    </Link>
                  </SignedIn>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
