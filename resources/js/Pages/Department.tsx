import useDepartment from "@/hooks/useDepartment";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DepartmentForm from "@/Structure/DepartmentForm";
import DepartmentTable from "@/Structure/DepartmentTable";
import { Breadcrumb } from "@/types/breadcrumbs";
import { Head } from "@inertiajs/react";
import { PlusIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";

const breadcrumbs: Breadcrumb[] = [
    { title: "Home", href: route("admin.dashboard") },
    { title: "Departments" },
];

export default function Department() {
    const {
        department,
        loading,
        editing,
        open,
        setOpen,
        setEditing,
        handleSave,
        handleDelete,
    } = useDepartment();

    return (
        <AuthenticatedLayout breadcrumbs={breadcrumbs}>
            <Head title="Departments" />

            <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* ── Page Header ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {/* Icon badge */}
                            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <BuildingOffice2Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    Departments
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Manage your organization's departments
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setEditing(null);
                                setOpen(true);
                            }}
                            disabled={loading}
                            className="
                                group inline-flex items-center gap-2 px-5 py-2.5
                                bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                                dark:bg-indigo-500 dark:hover:bg-indigo-600
                                text-white font-semibold text-sm rounded-xl
                                shadow-lg shadow-indigo-500/30
                                transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                            "
                        >
                            <PlusIcon className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
                            New Department
                        </button>
                    </div>

                    {/* ── Stats strip ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            {
                                label: "Total Departments",
                                value: loading ? "—" : department.length,
                                color: "indigo",
                            },
                            {
                                label: "Active",
                                value: loading ? "—" : department.length,
                                color: "emerald",
                            },
                            {
                                label: "Last Updated",
                                value: "Today",
                                color: "amber",
                            },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="
                                    rounded-xl border border-gray-200 dark:border-gray-700
                                    bg-white dark:bg-gray-800
                                    px-5 py-4
                                    shadow-sm
                                "
                            >
                                <p className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    {stat.label}
                                </p>
                                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* ── Main Card ── */}
                    <div className="
                        rounded-2xl border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-800
                        shadow-sm overflow-hidden
                    ">
                        {/* Card header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                All Departments
                            </h2>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {loading ? "Loading…" : `${department.length} record${department.length !== 1 ? "s" : ""}`}
                            </span>
                        </div>

                        <div className="p-6">
                            <DepartmentTable
                                departments={department}
                                loading={loading}
                                onEdit={(dept) => {
                                    setEditing(dept);
                                    setOpen(true);
                                }}
                                onDelete={handleDelete}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Modal ── */}
            <DepartmentForm
                open={open}
                onClose={() => setOpen(false)}
                onSave={handleSave}
                editing={editing}
            />
        </AuthenticatedLayout>
    );
}
