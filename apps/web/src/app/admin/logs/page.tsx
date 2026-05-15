"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/PanelSaas/logs");
  }, [router]);
  return null;
}
