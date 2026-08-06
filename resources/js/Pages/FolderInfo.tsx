import { FileItem } from "@/types";
import { useState } from "react";

type Props = {
    file: FileItem;
    goToFolder: (id: number) => void;
    handleDelete: (file: FileItem) => void;
    handleEdit: (file: FileItem, newName: string) => void;
}

export default function FolderInfo({ file, goToFolder, handleDelete, handleEdit }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(file.name);
    const [isHovered, setIsHovered] = useState(false);

    const submitEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (editName.trim() && editName !== file.name) {
            handleEdit(file, editName.trim());
        }
        setIsEditing(false);
    };

    const cancelEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        setEditName(file.name);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === "Enter") submitEdit(e);
        if (e.key === "Escape") cancelEdit(e);
    };

    return (
        <div
            key={file.id}
            onClick={() => !isEditing && goToFolder(file.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none
                bg-white dark:bg-gray-800/60
                border-gray-100 dark:border-gray-700
                ${!isEditing ? "hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5" : "border-blue-300 dark:border-blue-600 shadow-lg shadow-blue-500/10"}
            `}
        >
            {/* Action buttons — top-right */}
            <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 transition-all duration-150 ${isHovered || isEditing ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"}`}>
                {!isEditing && (
                    <button
                        title="Rename"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 019 16.414V19h2.586a2 2 0 001.414-.586l.172-.172" />
                        </svg>
                    </button>
                )}
                <button
                    title="Delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file);
                    }}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Folder Icon */}
            <div className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 ${isEditing
                ? "bg-blue-100 dark:bg-blue-900/40"
                : "bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50"
                }`}>
                <svg className={`w-7 h-7 transition-colors duration-200 ${isEditing ? "text-blue-600 dark:text-blue-400" : "text-blue-500 dark:text-blue-400"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.707 2.293A1 1 0 0010 2H4a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-1.293-3.707z" />
                </svg>
            </div>

            {/* Name / Edit input */}
            {isEditing ? (
                <div className="w-full flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full text-center text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-blue-400 dark:border-blue-500 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={cancelEdit}
                            className="flex-1 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitEdit}
                            className="flex-1 py-1 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 text-center leading-tight truncate w-full text-center px-1">
                    {file.name}
                </span>
            )}
        </div>
    );
}
