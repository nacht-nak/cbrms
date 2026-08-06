import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle() {
    const [dark, setDark] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        const stored = localStorage.getItem("theme");
        if (stored) return stored === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (dark) {
            root.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [dark]);

    return (
        <button
            type="button"
            onClick={() => setDark((v) => !v)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="
                relative w-9 h-9 flex items-center justify-center rounded-xl
                border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800
                text-gray-500 dark:text-gray-400
                hover:bg-gray-50 dark:hover:bg-gray-700
                hover:text-gray-700 dark:hover:text-gray-200
                shadow-sm
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                overflow-hidden
            "
        >
            {/* Sun — visible in light mode */}
            <SunIcon
                className={`
                    absolute w-4 h-4 transition-all duration-300
                    ${dark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}
                `}
            />
            {/* Moon — visible in dark mode */}
            <MoonIcon
                className={`
                    absolute w-4 h-4 transition-all duration-300
                    ${dark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}
                `}
            />
        </button>
    );
}
