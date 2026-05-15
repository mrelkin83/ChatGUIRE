"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminTenantsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/PanelSaas/tenants");
  }, [router]);
  return null;
}
