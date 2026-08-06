import { Department } from "@/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";

/**
 * Sanctum SPA (cookie-based) implementation
 * - Uses session cookies
 * - CSRF only for mutating requests
 * - No Bearer tokens
 */

export default function useDepartment() {
    const [department, setDepartment] = useState<Department[]>([]);
    const [editing, setEditing] = useState<Department | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    /**
     * Helper: ensure CSRF cookie exists
     */
    const csrf = async () => {
        await fetch("/sanctum/csrf-cookie", {
            credentials: "include",
        });
    };

    /**
     * GET departments (no CSRF required)
     */
    const fetchDepartment = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/departments", {
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            });

            if (response.status === 401) {
                toast.error("Unauthorized — please login");
                setDepartment([]);
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to fetch departments");
            }

            const data = await response.json();
            setDepartment(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error("Failed to fetch departments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartment();
    }, []);

    /**
     * CREATE / UPDATE department
     */
    const handleSave = async (formData: FormData) => {
        setLoading(true);
        try {
            await csrf();

            const isEditing = Boolean(editing);
            const url = isEditing
                ? `/api/departments/${editing!.id}`
                : "/api/departments";

            const response = await fetch(url, {
                method: "POST", // always POST when using _method
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "X-XSRF-TOKEN": getCsrfHeader(),
                    // ❌ DO NOT SET Content-Type
                },
                body: formData, // ✅ FormData directly
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.message || "Save failed");
            }

            toast.success(
                `Department ${isEditing ? "updated" : "created"} successfully`
            );

            setOpen(false);
            setEditing(null);
            fetchDepartment();
        } catch (error: any) {
            toast.error(error.message || "Failed to save department");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            // ⚠️ Fetch CSRF cookie before deleting
            await csrf();

            const response = await fetch(`/api/departments/${id}`, {
                method: "DELETE",
                credentials: "include", // must include cookies
                headers: {
                    Accept: "application/json",
                    "X-XSRF-TOKEN": getCsrfHeader(), // include token
                },
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.message || "Delete failed");
            }

            toast.success("Department deleted successfully");
            fetchDepartment();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete department");
        } finally {
            setLoading(false);
        }
    };


    return {
        department,
        setDepartment,
        editing,
        setEditing,
        loading,
        open,
        setOpen,
        handleSave,
        handleDelete,
    };
}
function getCsrfHeader(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}


