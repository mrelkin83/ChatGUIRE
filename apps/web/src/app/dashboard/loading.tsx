export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-gray-900" />
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-lg text-gray-500">Cargando panel de control...</p>
        </div>
      </div>
    </div>
  );
}
