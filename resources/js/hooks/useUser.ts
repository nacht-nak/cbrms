import { User } from "@/types";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";

export default function useUser() {
    const [user, setUser] = useState<User[]>([]);
    const [editing, setEditing] = useState<User | null>(null);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const csrf = async () => {
        await fetch("/sanctum/csrf-cookie", {
            credentials: "include",
        });
    };

    const fetchUsers = async (page = 1, search = "") => {
        setLoading(true);
        try {
            const response = await fetch(`/api/users?page=${page}&search=${encodeURIComponent(search)}`, {
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            });

            if (response.status === 401) {
                toast.error("Unauthorized — please login");
                setUser([]);
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await response.json();
            setUser(Array.isArray(data.data) ? data.data : []);
            setLastPage(data.last_page || 1);
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(page, search);
    }, [page, search]);

    const handleSave = async (formData: FormData) => {
        setLoading(true);
        try {
            await csrf(); // get CSRF cookie
            const isEditing = Boolean(editing);
            const url = isEditing ? `/api/users/${editing?.id}` : "/api/users";

            const response = await fetch(url, {
                method: "POST", // POST + X-HTTP-Method-Override
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "X-HTTP-Method-Override": isEditing ? "PUT" : "POST",
                    "X-XSRF-TOKEN": getCsrfHeader(), // ✅ Include CSRF token
                },
                body: formData,
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.message || "Save failed");
            }

            toast.success(`User ${isEditing ? "updated" : "created"} successfully`);
            setOpen(false);
            setEditing(null);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || "Failed to save user");
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
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",

        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            await csrf();
            const response = await fetch(`/api/users/${id}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "X-XSRF-TOKEN": getCsrfHeader(),
                },
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.message || "Delete failed");
            }

            toast.success("User deleted successfully");
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete user");
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        setUser,
        editing,
        setEditing,
        page,
        setPage,
        lastPage,
        setLastPage,
        search,
        setSearch,
        open,
        setOpen,
        loading,
        setLoading,
        fetchUsers,
        handleSave,
        handleDelete,
    };
}

function getCsrfHeader(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}
