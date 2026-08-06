import Modal from "@/Components/Modal";
import { useState } from "react";

type Props = {
    createModalOpen: boolean;
    setCreateModalOpen: (open: boolean) => void;
    newFolderName: string;
    setNewFolderName: (name: string) => void;
    handleCreateFolder: () => Promise<void> | void;
}

export default function FolderModal({
    createModalOpen,
    setCreateModalOpen,
    newFolderName,
    setNewFolderName,
    handleCreateFolder
}: Props) {
    const [isFocused, setIsFocused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSubmit();
        if (e.key === "Escape") setCreateModalOpen(false);
    };

    const handleSubmit = async () => {
        if (!newFolderName.trim() || isProcessing) return;
        setIsProcessing(true);
        try {
            await handleCreateFolder();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        if (isProcessing) return; // prevent closing while processing
        setCreateModalOpen(false);
    };

    return (
        <Modal show={createModalOpen} onClose={handleClose}>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                            New Folder
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Give your folder a name to get started
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Input */}
                <div className={`relative flex items-center gap-2.5 rounded-xl border px-4 py-3 transition-all duration-200 bg-white dark:bg-gray-800 ${isProcessing
                    ? "border-gray-200 dark:border-gray-700 opacity-60 pointer-events-none"
                    : isFocused
                        ? "border-blue-500 ring-3 ring-blue-500/15 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}>
                    <svg className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isFocused ? "text-blue-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Project Assets"
                        autoFocus
                        disabled={isProcessing}
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed"
                    />
                    {newFolderName && !isProcessing && (
                        <button
                            onClick={() => setNewFolderName("")}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 pl-1">
                    Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-500 dark:text-gray-400">Enter</kbd> to create
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2.5 mt-6">
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!newFolderName.trim() || isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm shadow-blue-600/20"
                    >
                        {isProcessing ? (
                            <>
                                {/* Spinner */}
                                <svg
                                    className="w-4 h-4 animate-spin"
                                    fill="none" viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12" cy="12" r="10"
                                        stroke="currentColor" strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-2a8 8 0 01-8-8z"
                                    />
                                </svg>
                                Creating…
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Folder
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
