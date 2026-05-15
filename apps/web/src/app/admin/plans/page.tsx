"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPlansRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/PanelSaas/plans");
  }, [router]);
  return null;
}
