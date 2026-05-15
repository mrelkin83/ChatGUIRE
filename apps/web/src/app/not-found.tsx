import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Página no encontrada</h2>
        <p className="mb-6 text-gray-600">La ruta que buscas no existe.</p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Volver al Panel
        </Link>
      </div>
    </div>
  );
}
