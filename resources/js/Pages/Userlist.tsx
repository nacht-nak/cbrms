import useDepartment from "@/hooks/useDepartment";
import useUser from "@/hooks/useUser";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import UserForm from "@/Structure/UserForm";
import UserTable from "@/Structure/UserTable";
import Breadcrumbs from "@/types/breadcrumbs";
import { Head } from "@inertiajs/react";
import axios from "axios";
import { toast } from "sonner";

const breadcrumbs: Breadcrumbs = [
    { title: "Home", href: route("admin.dashboard") },
    { title: "User Lists" },
];

export default function Userlist() {
    const {
        user, loading, editing, open, setOpen, setEditing,
        handleSave, handleDelete, page, setPage, lastPage, search, setSearch
    } = useUser();
    const { department } = useDepartment();

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleResendVerification = async (id: number) => {
        try {
            await axios.post(`/admin/users/${id}/resend-verification`);
            toast.success('Verification email resent!');
        } catch (error: any) {
            const msg = error.response?.data?.message ?? 'Failed to resend verification.';
            toast.error(msg);
        }
    };

    return (
        <AuthenticatedLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
                <div className="max-w-7xl mx-auto space-y-5">

                    {/* Page Header */}
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Users
                            </h1>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                                Manage your team members and their account permissions.
                            </p>
                        </div>

                        <button
                            onClick={() => { setEditing(null); setOpen(true); }}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 rounded-xl font-semibold text-sm
                                bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400
                                text-white shadow-md shadow-indigo-500/25 dark:shadow-indigo-500/20
                                transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950
                                min-h-[44px] shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden xs:inline sm:inline">Add User</span>
                            <span className="xs:hidden sm:hidden">Add</span>
                        </button>
                    </div>

                    {/* Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden transition-colors duration-300">

                        {/* Toolbar */}
                        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="relative flex-1">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg
                                        bg-gray-50 dark:bg-gray-800
                                        border border-gray-200 dark:border-gray-700
                                        text-gray-900 dark:text-gray-100
                                        placeholder-gray-400 dark:placeholder-gray-500
                                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                        transition-all duration-200 min-h-[44px]"
                                />
                            </div>
                            <div className="shrink-0">
                                <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800
                                    text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                    {user.length} <span className="hidden sm:inline ml-1">results</span>
                                </span>
                            </div>
                        </div>

                        {/* Table / Cards */}
                        <div className="p-4 sm:p-5">
                            <UserForm
                                open={open}
                                onClose={() => setOpen(false)}
                                onSave={handleSave}
                                editing={editing}
                                departments={department}
                            />

                            <UserTable
                                users={user}
                                loading={loading}
                                onEdit={(user) => { setEditing(user); setOpen(true); }}
                                onDelete={handleDelete}
                                onResendVerification={handleResendVerification}
                            />
                        </div>

                        {/* Pagination */}
                        {lastPage > 1 && (
                            <div className="px-4 sm:px-5 py-4 border-t border-gray-100 dark:border-gray-800
                                flex items-center justify-between gap-3">
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">
                                    Page{" "}
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{page}</span>
                                    {" "}of{" "}
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{lastPage}</span>
                                </p>

                                <div className="flex items-center gap-1">
                                    {/* Prev */}
                                    <button
                                        onClick={() => setPage(page - 1)}
                                        disabled={page === 1 || loading}
                                        className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700
                                            text-gray-600 dark:text-gray-300
                                            hover:bg-gray-100 dark:hover:bg-gray-800
                                            disabled:opacity-40 disabled:cursor-not-allowed
                                            transition-all duration-150 min-h-[40px] min-w-[40px] flex items-center justify-center"
                                        aria-label="Previous page"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    {/* Page numbers — hidden on very small screens */}
                                    <div className="hidden xs:flex sm:flex items-center gap-1">
                                        {Array.from({ length: lastPage || 1 }).map((_, idx) => {
                                            const p = idx + 1;
                                            const isActive = page === p;
                                            const isNearby = Math.abs(p - page) <= 1 || p === 1 || p === lastPage;

                                            if (!isNearby && Math.abs(p - page) === 2) {
                                                return <span key={p} className="px-1 text-gray-400 dark:text-gray-600 text-sm">…</span>;
                                            }
                                            if (!isNearby) return null;

                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => setPage(p)}
                                                    disabled={isActive || loading}
                                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-150
                                                        ${isActive
                                                            ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm shadow-indigo-500/30"
                                                            : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Compact page indicator for tiny screens */}
                                    <div className="flex xs:hidden sm:hidden items-center px-3 py-1.5 rounded-lg
                                        border border-gray-200 dark:border-gray-700
                                        text-sm font-medium text-gray-600 dark:text-gray-300">
                                        {page} / {lastPage}
                                    </div>

                                    {/* Next */}
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={page === lastPage || loading}
                                        className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700
                                            text-gray-600 dark:text-gray-300
                                            hover:bg-gray-100 dark:hover:bg-gray-800
                                            disabled:opacity-40 disabled:cursor-not-allowed
                                            transition-all duration-150 min-h-[40px] min-w-[40px] flex items-center justify-center"
                                        aria-label="Next page"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
