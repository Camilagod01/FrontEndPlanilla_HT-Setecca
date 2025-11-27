export default function Dashboard() {
  return (
    <div
      className="w-full h-full rounded-xl shadow-sm relative overflow-hidden"
      style={{
        backgroundImage: "url('/src/assets/eolicas.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "calc(100vh - 80px)", // ajusta según tu header
      }}
    >
      {/* --- capa translúcida para estilo más bonito (opcional) --- */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>

      {/* --- contenido encima del fondo --- */}
      <div className="relative p-10">
        <h1 className="text-3xl font-semibold text-gray-800 drop-shadow">
          Bienvenido al panel
        </h1>

        <p className="mt-3 text-lg font-medium">
          <a
            href="/employees"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Ir a Empleados
          </a>
        </p>
      </div>
    </div>
  );
}
