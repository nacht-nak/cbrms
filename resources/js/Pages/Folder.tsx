import { useNavigate } from "react-router-dom";
import { FileItem } from "@/types";

interface Props {
    folder: FileItem;
}

export default function Folder({ folder }: Props) {
    const navigate = useNavigate();

    return (
        <div
            className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => navigate(`/files/${folder.id}`)}
        >
            📁 {folder.name}
        </div>
    );
}
