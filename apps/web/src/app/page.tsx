import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold">
          <span className="text-blue-500">ChatGÜIRE</span> SaaS
        </h1>
        <p className="mb-8 text-xl text-gray-300">
          Plataforma omnicanal con IA para el mercado colombiano
        </p>
        <ul className="mb-10 space-y-2 text-gray-400">
          <li>WhatsApp | Instagram | Facebook | TikTok</li>
          <li>IA que atiende, vende y agenda en español colombiano</li>
          <li>Pagos integrados vía Wompi</li>
        </ul>
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Ir al Panel de Control
        </Link>
      </div>
    </div>
  );
}
