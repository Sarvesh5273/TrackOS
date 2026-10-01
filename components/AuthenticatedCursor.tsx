"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import UserCursor from "@/components/reactbits/UserCursor";

export default function AuthenticatedCursor() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    name: string;
    role?: string;
    avatarUrl?: string;
  } | null>(null);

  // Do NOT show on public unauthenticated landing page, login, or public verification screens
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname?.startsWith("/verify/") ||
    pathname?.startsWith("/invite/");

  useEffect(() => {
    if (isPublicRoute) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    async function loadUser() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data?.profile && isMounted) {
            setProfile({
              name: data.profile.name || data.profile.username || "Developer",
              role: data.profile.declaredRoles?.[0] || "Contributor",
              avatarUrl: data.profile.avatarUrl || undefined,
            });
          }
        }
      } catch (err) {
        // Silently ignore if not logged in
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [pathname, isPublicRoute]);

  if (isPublicRoute || !profile) {
    return null;
  }

  return (
    <UserCursor
      name={profile.name}
      role={profile.role}
      avatarUrl={profile.avatarUrl}
      color="#8b5cf6"
      tiltEffect={true}
      springDamping={0.22}
    />
  );
}
