"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminMonitorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/PanelSaas/monitor");
  }, [router]);
  return null;
}
