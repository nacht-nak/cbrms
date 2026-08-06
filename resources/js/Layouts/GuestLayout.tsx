import { PropsWithChildren } from 'react';
import ThemeToggle from './ThemeToggle';


export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="
            min-h-screen flex items-center justify-center
            bg-gray-50 dark:bg-gray-950
            px-4 py-12
            transition-colors duration-200
        ">
            {/* Decorative background blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-indigo-100 dark:bg-indigo-950/40 blur-3xl opacity-60" />
                <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-violet-100 dark:bg-violet-950/40 blur-3xl opacity-60" />
            </div>
            {/* Card */}
            <div className="
                relative z-10
                w-full max-w-sm
                bg-white dark:bg-gray-900
                rounded-2xl
                border border-gray-200 dark:border-gray-700
                shadow-xl shadow-black/5 dark:shadow-black/30
                px-8 py-10
                transition-colors duration-200
            ">
                {children}
            </div>
        </div>
    );
}
