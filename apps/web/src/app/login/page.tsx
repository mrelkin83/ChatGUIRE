"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, Eye, EyeOff } from "lucide-react";
import { API_BASE, setAuthSession, getAuthToken } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    if (getAuthToken()) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Email y contraseña son requeridos"); return; }
    if (mode === "register" && !tenantName) { setError("Nombre del negocio es requerido"); return; }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }

    setLoading(true);
    try {
      const url = mode === "login"
        ? `${API_BASE}/api/auth/login`
        : `${API_BASE}/api/auth/register`;

      const body = mode === "login"
        ? { email, password }
        : { email, password, tenantName };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al autenticar");
        return;
      }

      setAuthSession(data);
      router.push("/dashboard");
    } catch {
      setError("Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-root,#07070a)] px-4">
      <div className="glass-card w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] mb-4">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            ChatGÜIRE
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {mode === "login" ? "Inicia sesión en tu negocio" : "Crea tu cuenta"}
          </p>
        </div>

        <div className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Nombre de tu negocio"
              className="input-field"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@negocio.com"
            className="input-field"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (mín. 8 caracteres)"
              className="input-field pr-10"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-[#ef4444] text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="btn-primary w-full justify-center py-3"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>

          <div className="text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              {mode === "login"
                ? "¿Sin cuenta? Regístrate aquí"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
