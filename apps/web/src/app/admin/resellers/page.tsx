"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminResellersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/PanelSaas/resellers");
  }, [router]);
  return null;
}
