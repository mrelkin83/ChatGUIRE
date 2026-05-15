"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await saFetch(`${API_BASE}/api/superadmin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("superadmin_token", data.token);
        localStorage.setItem("superadmin_user", JSON.stringify(data.user));
        router.push("/PanelSaas");
      } else {
        setError(data.error || "Credenciales inválidas");
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07070a]">
      <div className="glass-card w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] mb-4">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#8b5cf6]" style={{ fontFamily: "var(--font-display)" }}>Panel SaaS</h1>
          <p className="text-sm text-[#8b8b9e] mt-1">SuperAdmin</p>
        </div>

        <div className="space-y-4">
          <div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@chatguire.co" className="input-field"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" className="input-field"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && <p className="text-sm text-[#ef4444] text-center">{error}</p>}

          <button onClick={handleLogin} disabled={loading || !email || !password}
            className="btn-primary w-full justify-center py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}
