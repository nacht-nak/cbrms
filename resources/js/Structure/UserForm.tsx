import { User } from "@/types";
import { useState, useEffect } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    onSave: (data: FormData) => Promise<void>;
    editing?: User | null;
    departments?: { id: number; name: string }[];
};

export default function UserForm({ open, onClose, onSave, editing, departments }: Props) {
    const [processing, setProcessing] = useState(false);
    const [gender, setGender] = useState(editing?.profile?.gender || "");
    const [otherGender, setOtherGender] = useState(
        editing?.profile?.gender && !["male", "female"].includes(editing.profile.gender)
            ? editing.profile.gender
            : ""
    );

    // Sync gender when editing changes
    useEffect(() => {
        setGender(editing?.profile?.gender || "");
        setOtherGender(
            editing?.profile?.gender && !["male", "female"].includes(editing.profile.gender)
                ? editing.profile.gender
                : ""
        );
    }, [editing, open]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProcessing(true);
        const formData = new FormData(e.currentTarget);
        if (editing?.id) formData.append("_method", "PUT");
        if (gender === "other") formData.set("gender", otherGender);
        try {
            await onSave(formData);
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    if (!open) return null;

    const inputClass = `
        w-full px-3.5 py-2.5 text-sm rounded-xl
        bg-gray-50 dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        text-gray-900 dark:text-gray-100
        placeholder-gray-400 dark:placeholder-gray-500
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        transition-all duration-200
    `;

    const labelClass = "block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl
                ring-1 ring-gray-200 dark:ring-gray-700
                overflow-hidden animate-fade-in max-h-[95vh] flex flex-col">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {editing ? "Edit User" : "Create User"}
                        </h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {editing ? "Update the user's account information." : "Fill in the details to create a new user account."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                            hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1">
                    <form id="user-form" onSubmit={handleSubmit} className="p-6 space-y-5">

                        {/* Department */}
                        {departments && (
                            <div>
                                <label className={labelClass}>
                                    Department <span className="text-red-500 normal-case">*</span>
                                </label>
                                <select
                                    name="department_id"
                                    defaultValue={editing?.profile?.department_id || ""}
                                    required
                                    className={inputClass}
                                >
                                    <option value="" disabled>Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Section Label */}
                        <div className="flex items-center gap-3 pt-1">
                            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Personal Information</span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                        </div>

                        {/* Name + Suffix */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "First Name", name: "fname", required: true },
                                { label: "Middle Name", name: "mname", required: false },
                                { label: "Last Name", name: "lname", required: true },
                            ].map(({ label, name, required }) => (
                                <div key={name}>
                                    <label className={labelClass}>
                                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        name={name}
                                        defaultValue={(editing?.profile as any)?.[name] || ""}
                                        placeholder={`Enter ${label.toLowerCase()}`}
                                        required={required}
                                        className={inputClass}
                                    />
                                </div>
                            ))}

                            {/* Suffix */}
                            <div>
                                <label className={labelClass}>Suffix</label>
                                <select
                                    name="suffix"
                                    defaultValue={editing?.profile?.suffix || ""}
                                    className={inputClass}
                                >
                                    <option value="">None</option>
                                    {["Jr.", "Sr.", "III", "IV", "V"].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Birthdate + Gender */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    Birthdate <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="birthdate"
                                    defaultValue={editing?.profile?.birthdate || ""}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Gender <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap items-center gap-3">
                                    {["male", "female", "other"].map((g) => (
                                        <label
                                            key={g}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all duration-150 select-none
                                                ${gender === g
                                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="gender"
                                                value={g}
                                                checked={gender === g}
                                                onChange={() => setGender(g)}
                                                required
                                                className="sr-only"
                                            />
                                            {g.charAt(0).toUpperCase() + g.slice(1)}
                                        </label>
                                    ))}
                                    {gender === "other" && (
                                        <input
                                            type="text"
                                            name="other_gender"
                                            placeholder="Specify..."
                                            value={otherGender}
                                            onChange={(e) => setOtherGender(e.target.value)}
                                            className={`${inputClass} mt-2 sm:mt-0 flex-1 min-w-[120px]`}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact + Address */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Contact Number</label>
                                <input
                                    type="tel"
                                    name="contact_number"
                                    defaultValue={editing?.profile?.contact_number || ""}
                                    maxLength={11}
                                    placeholder="09XXXXXXXXX"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Address</label>
                                <textarea
                                    name="address"
                                    defaultValue={editing?.profile?.address || ""}
                                    placeholder="Enter full address"
                                    rows={3}
                                    className={`${inputClass} resize-none`}
                                />
                            </div>
                        </div>

                        {/* Account Section */}
                        <div className="flex items-center gap-3 pt-1">
                            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Account</span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                        </div>

                        {/* Username + Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    defaultValue={editing?.username || ""}
                                    placeholder="Enter username"
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={editing?.email || ""}
                                    placeholder="you@example.com"
                                    required
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {editing && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>New Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Leave blank to keep current"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        placeholder="Repeat new password"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Info banner for create mode */}
                        {!editing && (
                            <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3">
                                <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                                </svg>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                    A secure random password will be generated and sent to the user's email address for them to retrieve after verifying their account.
                                </p>
                            </div>
                        )}
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold rounded-xl
                            border border-gray-200 dark:border-gray-700
                            text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-800
                            transition-all duration-150 active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="user-form"
                        disabled={processing}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-xl
                            bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400
                            text-white shadow-md shadow-indigo-500/25
                            transition-all duration-150 active:scale-95
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                            ${processing ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                        {processing
                            ? <span className="flex items-center gap-2">
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving…
                            </span>
                            : editing ? "Save Changes" : "Create User"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
