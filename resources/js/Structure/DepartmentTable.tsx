import { Department } from "@/types";
import { PencilIcon, TrashIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";

type Props = {
    departments: Department[];
    loading: boolean;
    onEdit: (dept: Department) => void;
    onDelete: (id: number) => void;
};

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4">
            <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </td>
        <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/5" />
        </td>
        <td className="px-6 py-4">
            <div className="flex gap-2">
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
        </td>
    </tr>
);

const SkeletonCard = () => (
    <div className="animate-pulse p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
            <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
        </div>
        <div className="flex gap-2">
            <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
    </div>
);

export default function DepartmentTable({ departments, loading, onEdit, onDelete }: Props) {
    if (!loading && departments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <BuildingOffice2Icon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">No departments yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first department to get started.</p>
            </div>
        );
    }

    return (
        <>
            {/* ══ MOBILE: Cards ══ */}
            <div className="grid gap-3 sm:hidden">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    : departments.map((dept) => (
                        <div
                            key={dept.id}
                            className="
                                p-4 bg-white dark:bg-gray-800
                                rounded-2xl border border-gray-100 dark:border-gray-700
                                shadow-sm hover:shadow-md
                                transition-shadow duration-200
                            "
                        >
                            <div className="flex items-center gap-4 mb-4">
                                {dept.logo ? (
                                    <img
                                        src={dept.logo}
                                        alt={dept.name}
                                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                        <BuildingOffice2Icon className="w-7 h-7 text-indigo-400" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-medium">Department</p>
                                    <p className="font-bold text-gray-900 dark:text-white text-base mt-0.5">{dept.name}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onEdit(dept)}
                                    className="
                                        flex-1 flex items-center justify-center gap-1.5
                                        px-3 py-2 text-sm font-semibold rounded-xl
                                        bg-indigo-50 dark:bg-indigo-950/40
                                        text-indigo-700 dark:text-indigo-300
                                        hover:bg-indigo-100 dark:hover:bg-indigo-900/60
                                        transition-colors
                                    "
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => onDelete(dept.id)}
                                    className="
                                        flex-1 flex items-center justify-center gap-1.5
                                        px-3 py-2 text-sm font-semibold rounded-xl
                                        bg-red-50 dark:bg-red-950/40
                                        text-red-600 dark:text-red-400
                                        hover:bg-red-100 dark:hover:bg-red-900/60
                                        transition-colors
                                    "
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
            </div>

            {/* ══ DESKTOP: Table ══ */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                            {["Logo", "Name", "Actions"].map((heading) => (
                                <th
                                    key={heading}
                                    className="
                                        px-6 py-3.5 text-left
                                        text-[11px] font-semibold uppercase tracking-widest
                                        text-gray-400 dark:text-gray-500
                                    "
                                >
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                        {loading
                            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            : departments.map((dept) => (
                                <tr
                                    key={dept.id}
                                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                >
                                    {/* Logo */}
                                    <td className="px-6 py-4 w-20">
                                        {dept.logo ? (
                                            <img
                                                src={dept.logo}
                                                alt={dept.name}
                                                className="w-11 h-11 rounded-xl object-cover border border-gray-100 dark:border-gray-700"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                                <BuildingOffice2Icon className="w-5 h-5 text-indigo-400" />
                                            </div>
                                        )}
                                    </td>

                                    {/* Name */}
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                            {dept.name}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(dept)}
                                                className="
                                                    inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                                                    bg-indigo-50 dark:bg-indigo-950/40
                                                    text-indigo-700 dark:text-indigo-300
                                                    hover:bg-indigo-100 dark:hover:bg-indigo-900/60
                                                    transition-colors
                                                "
                                            >
                                                <PencilIcon className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => onDelete(dept.id)}
                                                className="
                                                    inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                                                    bg-red-50 dark:bg-red-950/40
                                                    text-red-600 dark:text-red-400
                                                    hover:bg-red-100 dark:hover:bg-red-900/60
                                                    transition-colors
                                                "
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
