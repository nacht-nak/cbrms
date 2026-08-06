import { router } from '@inertiajs/react';

interface Props {
    path: { id: number; name: string }[];
    rootHref: string;
}

export default function Breadcrumbs({ path, rootHref }: Props) {
    return (
        <nav className="flex items-center gap-1 text-sm text-slate-400 dark:text-slate-500 flex-wrap">
            {/* Root crumb */}
            <button
                onClick={() => router.visit(rootHref)}
                className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-medium"
            >
                🗂️ Root
            </button>

            {path.map((segment, i) => {
                const isLast = i === path.length - 1;
                return (
                    <span key={segment.id} className="flex items-center gap-1">
                        {/* Separator */}
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>

                        {isLast ? (
                            // Current folder — not clickable
                            <span className="text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[160px]">
                                {segment.name}
                            </span>
                        ) : (
                            // Ancestor folder — clickable, navigates to that folder
                            <button
                                onClick={() => router.visit(`${rootHref}/${segment.id}`)}
                                className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate max-w-[160px]"
                            >
                                {segment.name}
                            </button>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
