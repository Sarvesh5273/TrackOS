"use client";

import Auth2 from "@/components/reactbits/Auth2";

export default function LoginPage() {
  return <Auth2 onSuccessRedirect="/dashboard" />;
}