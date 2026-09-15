import { useState, useRef } from "react";
import Modal from "@/Components/Modal";
import { FileItem } from "@/types";

type Props = {
    uploadModalOpen: boolean;
    setUploadModalOpen: (open: boolean) => void;
    fileUpload: File | null;
    setFileUpload: (file: File | null) => void;
    fileMeta: any;
    setFileMeta: (meta: any) => void;
    handleUploadFile: () => Promise<void>;
    editingFile: FileItem | null;
};

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";

const FILE_ICONS: Record<string, string> = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "📽️",
    pptx: "📽️",
    txt: "🗒️",
};

function getFileIcon(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return FILE_ICONS[ext] ?? "📁";
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ✅ Defined OUTSIDE the parent component so React never treats it as a new
//    component type on re-render — this prevents inputs from losing focus.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="group">
            <label className="block text-[11px] font-semibold tracking-widest uppercase text-slate-400 mb-1.5 transition-colors group-focus-within:text-indigo-400">
                {label}
            </label>
            {children}
        </div>
    );
}

const inputClass =
    "w-full rounded-lg border border-slate-700/60 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-600";

export default function FileModal({
    uploadModalOpen,
    setUploadModalOpen,
    fileUpload,
    setFileUpload,
    fileMeta,
    setFileMeta,
    handleUploadFile,
    editingFile,
}: Props) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = async () => {
        if (!fileUpload && !editingFile) return alert("Please select a file to upload.");
        setIsProcessing(true);
        try {
            await handleUploadFile();
            setUploadModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("Upload failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const onSelectFile = (file: File) => {
        setFileUpload(file);
        if (!fileMeta.fileName?.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            setFileMeta({ ...fileMeta, fileName: cleanName });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onSelectFile(file);
    };

    return (
        <Modal
            show={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
        >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 text-lg">
                        {editingFile ? "✏️" : "⬆️"}
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-100">
                            {editingFile ? "Edit File" : "Upload File"}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {editingFile
                                ? "Update metadata for this file"
                                : "Add a document to the repository"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-5 space-y-5 bg-slate-900">
                {/* Drop Zone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 p-5 text-center
                        ${isDragging
                            ? "border-indigo-500 bg-indigo-500/10"
                            : fileUpload
                                ? "border-emerald-500/50 bg-emerald-500/5"
                                : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES}
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onSelectFile(e.target.files[0])}
                    />
                    {fileUpload ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{getFileIcon(fileUpload.name)}</span>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-slate-200 truncate max-w-[220px]">
                                        {fileUpload.name}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {formatBytes(fileUpload.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFileUpload(null); }}
                                className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
                                title="Remove file"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-2xl mb-2">☁️</p>
                            <p className="text-sm font-medium text-slate-300">
                                Drop a file here or{" "}
                                <span className="text-indigo-400 underline underline-offset-2">browse</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                PDF, Word, Excel, PowerPoint, TXT
                            </p>
                        </div>
                    )}
                </div>

                {/* File Name + Publication Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="File Name">
                        <input
                            type="text"
                            value={fileMeta.fileName}
                            onChange={(e) => setFileMeta({ ...fileMeta, fileName: e.target.value })}
                            placeholder="Document title"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Publication Date">
                        <input
                            type="date"
                            value={fileMeta.publication_date}
                            onChange={(e) => setFileMeta({ ...fileMeta, publication_date: e.target.value })}
                            className={inputClass}
                        />
                    </Field>
                </div>

                {/* Location + Authors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Location">
                        <input
                            type="text"
                            value={fileMeta.location}
                            onChange={(e) => setFileMeta({ ...fileMeta, location: e.target.value })}
                            placeholder="e.g. Manila, PH"
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Authors">
                        <input
                            type="text"
                            value={fileMeta.authors}
                            onChange={(e) => setFileMeta({ ...fileMeta, authors: e.target.value })}
                            placeholder="Comma separated"
                            className={inputClass}
                        />
                    </Field>
                </div>

                {/* Description */}
                <Field label="Description">
                    <textarea
                        rows={3}
                        value={fileMeta.description}
                        onChange={(e) => setFileMeta({ ...fileMeta, description: e.target.value })}
                        placeholder="Brief description of the document..."
                        className={`${inputClass} resize-none`}
                    />
                </Field>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    <button
                        onClick={() => setUploadModalOpen(false)}
                        disabled={isProcessing}
                        className="flex-1 rounded-lg border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:border-slate-500 hover:text-slate-200 disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUploadClick}
                        disabled={isProcessing}
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Uploading…
                            </>
                        ) : editingFile ? (
                            "Save Changes"
                        ) : (
                            "Upload File"
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
