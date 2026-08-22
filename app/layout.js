export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r-4 border-black p-6">
        <h2 className="text-3xl font-black mb-8">Bilbax</h2>
        <nav className="flex flex-col gap-4">
          <a href="/dashboard" className="font-bold text-lg hover:underline">Dashboard</a>
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
