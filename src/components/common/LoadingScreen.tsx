export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex flex-col items-center justify-between relative overflow-hidden">
      <div className="flex-1 flex items-center justify-center">
        <img
          src="/logo-kuki.png"
          alt="Kuki Logo"
          className="w-48 h-48 object-contain animate-pulse"
        />
      </div>

      <div className="relative w-full pb-8">
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-32" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path
              fill="#3B82F6"
              fillOpacity="0.3"
              d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,106.7C1248,96,1344,96,1392,96L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-transparent h-24"></div>
        </div>
        <div className="absolute bottom-8 left-0 right-0 text-center z-10">
          <p className="text-gray-700 text-sm font-medium">© 2025 Kuki Company Ltd</p>
        </div>
      </div>
    </div>
  );
}
