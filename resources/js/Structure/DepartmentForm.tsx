import { Department } from "@/types";
import { useState, useEffect, useRef } from "react";
import { XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";

type Props = {
    open: boolean;
    onClose: () => void;
    onSave: (dept: FormData) => Promise<void>;
    editing?: Department | null;
};

export default function DepartmentForm({ open, onClose, onSave, editing }: Props) {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLogoPreview(editing?.logo ?? null);
    }, [editing]);

    // Trap focus & close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    const applyFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
        // sync to hidden input
        if (fileRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileRef.current.files = dt.files;
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) applyFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) applyFile(file);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProcessing(true);
        const formData = new FormData(e.currentTarget);
        if (editing?.id) formData.append("_method", "PUT");
        try {
            await onSave(formData);
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    if (!open) return null;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            aria-modal="true"
            role="dialog"
        >
            {/* Blur overlay */}
            <div
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="
                relative z-10 w-full max-w-md
                bg-white dark:bg-gray-900
                rounded-2xl shadow-2xl
                border border-gray-200 dark:border-gray-700
                overflow-hidden
                animate-[fadeScaleIn_0.2s_ease-out]
            ">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {editing ? "Edit Department" : "New Department"}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {editing ? "Update department details below" : "Fill in the details to create a department"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                            hover:bg-gray-100 dark:hover:bg-gray-800
                            transition-colors
                        "
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">

                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                            Department Logo
                        </label>

                        <div className="flex items-start gap-5">
                            {/* Avatar preview */}
                            <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => fileRef.current?.click()}>
                                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex items-center justify-center transition-colors group-hover:border-indigo-500">
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Logo preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <PhotoIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                    )}
                                </div>
                                {logoPreview && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setLogoPreview(null); }}
                                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current?.click()}
                                className={`
                                    flex-1 flex flex-col items-center justify-center gap-1
                                    rounded-xl border-2 border-dashed cursor-pointer
                                    p-4 text-center transition-colors
                                    ${dragOver
                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                        : "border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                    }
                                `}
                            >
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {dragOver ? "Drop to upload" : "Click or drag & drop"}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    PNG, JPG, WEBP up to 2MB
                                </p>
                            </div>

                            {/* Hidden input */}
                            <input
                                ref={fileRef}
                                type="file"
                                name="logo"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label
                            htmlFor="dept-name"
                            className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5"
                        >
                            Department Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="dept-name"
                            type="text"
                            name="name"
                            required
                            defaultValue={editing?.name ?? ""}
                            placeholder="e.g. Human Resources"
                            className="
                                w-full px-4 py-2.5 text-sm rounded-xl
                                border border-gray-300 dark:border-gray-600
                                bg-white dark:bg-gray-800
                                text-gray-900 dark:text-gray-100
                                placeholder-gray-400 dark:placeholder-gray-500
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                                transition-shadow
                            "
                        />
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="
                                flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl
                                border border-gray-300 dark:border-gray-600
                                text-gray-700 dark:text-gray-200
                                hover:bg-gray-50 dark:hover:bg-gray-800
                                transition-colors disabled:opacity-50
                            "
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="
                                flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl
                                bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                                dark:bg-indigo-500 dark:hover:bg-indigo-600
                                text-white shadow-lg shadow-indigo-500/25
                                flex items-center justify-center gap-2
                                transition-all disabled:opacity-60
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                            "
                        >
                            {processing && (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                            )}
                            {processing ? "Saving…" : editing ? "Save Changes" : "Create Department"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Keyframe for modal entry */}
            <style>{`
                @keyframes fadeScaleIn {
                    from { opacity: 0; transform: scale(0.96) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
            `}</style>
        </div>
    );
}
