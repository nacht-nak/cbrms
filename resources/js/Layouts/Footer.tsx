export default function Footer() {
    return (
        <footer className="
            fixed bottom-0 left-0 right-0 z-50
            bg-white/70 dark:bg-gray-950/70
            backdrop-blur-xl
            border-t border-gray-200/60 dark:border-white/[0.06]
            supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60
        ">
            {/* ── Mobile: stacked layout ── */}
            <div className="sm:hidden max-w-7xl mx-auto px-4 py-2 flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-2">
                    <div className="relative w-5 h-5 rounded-md overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-sm shrink-0">
                        <img src="/cpsu.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        CPSU
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        &copy; {new Date().getFullYear()}
                    </p>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                    Develop by{" "}
                    <span className="text-indigo-500 dark:text-indigo-400 font-semibold">
                        Welquim Panogaling.
                    </span>
                </p>
            </div>

            {/* ── Desktop: single row ── */}
            <div className="hidden sm:flex max-w-7xl mx-auto px-6 lg:px-8 h-12 items-center justify-between gap-4">

                {/* Left: Logo + University Name */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="relative w-6 h-6 rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-sm shrink-0">
                        <img src="/cpsu.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-tight leading-tight flex flex-col">
                        <span>Central Philippine State University</span>
                        <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">Hinoba-an Campus</span>
                    </span>
                </div>

                {/* Center: Made By */}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium text-center">
                    Develop by{" "}
                    <span className="text-indigo-500 dark:text-indigo-400 font-semibold">
                        Welquim Panogaling.
                    </span>
                </p>

                {/* Right: Copyright */}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                    &copy; {new Date().getFullYear()} All rights reserved.
                </p>

            </div>
        </footer>
    );
}
