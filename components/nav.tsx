"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Mic2, Search, Music2 } from "lucide-react";
import { SettingsDialog } from "@/components/settings-dialog";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "AI Playlist", icon: Sparkles },
  { href: "/setlist", label: "Setlist", icon: Mic2 },
  { href: "/search", label: "Manual Search", icon: Search },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-1">
        <Link href="/" className="flex items-center gap-2 mr-4">
          <Music2 className="w-5 h-5 text-red-500" />
          <span className="font-bold text-sm tracking-tight hidden sm:block">PlaylistAI</span>
        </Link>

        <nav className="flex items-center gap-0.5 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-neutral-200 hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <SettingsDialog />
      </div>
    </header>
  );
}
