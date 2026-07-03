"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Mic2, Search, LogIn, LogOut } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { SettingsDialog } from "@/components/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "AI Playlist", icon: Sparkles },
  { href: "/setlist", label: "Setlist", icon: Mic2 },
  { href: "/search", label: "Search", icon: Search },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-1">
        <Link href="/" className="flex items-center gap-2 mr-5 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path d="M14 4v7.27A2.5 2.5 0 1 1 11.5 9V5.5L6 7v6.27A2.5 2.5 0 1 1 3.5 11V6.5L14 4z" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:block" style={{ color: "var(--fg)" }}>
            PlaylistAI
          </span>
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
                    ? "text-white"
                    : "hover:opacity-100 opacity-60"
                )}
                style={active ? {
                  background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  color: "white",
                } : { color: "var(--fg)" }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SettingsDialog />
          {session ? (
            <div className="flex items-center gap-1.5">
              {session.user?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => signOut()}
                title={`Signed in as ${session.user?.email}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => signIn("google")}
              title="Sign in to save playlists to YouTube"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
