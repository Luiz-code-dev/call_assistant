"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, Users, Heart, Wrench } from "lucide-react";

const EXCLUDED_PREFIXES = [
  "/", "/pricing", "/guia", "/download", "/login", "/register",
  "/verify-email", "/reset-password", "/terms", "/privacy", "/robots", "/sitemap",
  // Pages with their own fixed bottom UI:
  "/messages", "/live",
];

function isExcluded(pathname: string) {
  if (pathname === "/") return true;
  return EXCLUDED_PREFIXES.slice(1).some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function BottomNav() {
  const pathname = usePathname();
  const [pendingFriends, setPendingFriends] = useState(0);

  useEffect(() => {
    const sfToken = sessionStorage.getItem("sf_token");
    if (!sfToken) return;
    const load = () =>
      fetch("/api/friends/pending", { headers: { Authorization: `Bearer ${sfToken}` } })
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .then((d) => setPendingFriends(d.count ?? 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (isExcluded(pathname)) return null;

  const items = [
    { icon: Home,      label: "Home",    href: "/home",    match: "/home" },
    { icon: Newspaper, label: "Feed",    href: "/feed",    match: "/feed" },
    { icon: Users,     label: "Network", href: "/network", match: "/network" },
    { icon: Heart,     label: "Amigos",  href: "/friends", match: "/friends", badge: pendingFriends },
    { icon: Wrench,    label: "Tools",   href: "/tools",   match: "/tools" },
  ];

  return (
    <>
      {/* Spacer so content isn't hidden under the nav */}
      <div className="h-16 sm:hidden" aria-hidden="true" />
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/50 bg-[#09090b]/90 backdrop-blur-xl sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around py-2">
          {items.map(({ icon: Icon, label, href, match, badge }) => {
            const active = pathname === match || pathname.startsWith(match + "/");
            return (
              <Link
                key={label}
                href={href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${active ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <Icon className="size-5" />
                {(badge ?? 0) > 0 && (
                  <span className="absolute -top-0.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                    {(badge ?? 0) > 9 ? "9+" : badge}
                  </span>
                )}
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
