"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Error</h2>
        <p className="mb-6 text-gray-600">{error.message || 'Algo salió mal'}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
