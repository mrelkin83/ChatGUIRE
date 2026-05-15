import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-primary",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChatGÜIRE SaaS",
  description: "Plataforma Omnicanal con IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${jetbrains.variable} font-[family-name:var(--font-primary)] antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
            },
          }}
        />
      </body>
    </html>
  );
}
