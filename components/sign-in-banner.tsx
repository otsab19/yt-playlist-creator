"use client";
import { useSession, signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export function SignInBanner() {
  const { data: session, status } = useSession();
  if (status === "loading" || session) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-6"
      style={{ background: "var(--bg-input)", border: "1px solid var(--border-2)" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: "white" }}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium" style={{ color: "var(--fg)" }}>Sign in to use YouTube features</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>Search YouTube and save playlists directly to your account</p>
      </div>
      <button
        onClick={() => signIn("google")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0 cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
      >
        <LogIn className="w-3.5 h-3.5" />
        Sign in
      </button>
    </div>
  );
}
