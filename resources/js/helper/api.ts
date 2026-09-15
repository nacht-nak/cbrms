import axios from 'axios';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { FileItem } from '@/types';

// Get files
export const getFiles = async (parentId: number | null = null): Promise<FileItem[]> => {
    try {
        const url = parentId !== null ? `/api/files?parent_id=${parentId}` : `/api/files`;
        const { data } = await axios.get(url);
        return data.data; // array of files
    } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to fetch files');
        return [];
    }
};

// Create folder
export const createFolder = async (name: string, parentId: number | null) => {
    try {
        const { data } = await axios.post('/api/files', {
            name,
            type: 'folder',
            parent_id: parentId,
        });
        toast.success('Folder created successfully!');
        return data;
    } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to create folder');
        return null;
    }
};

// Upload file
export const uploadFile = async (
    file: File | null,
    parentId: number | null,
    meta: {
        fileName: string;
        description: string;
        authors: string;
        publication_date: string;
        location: string;
    },
    fileId?: number // <- optional: existing file ID for editing
) => {
    try {
        const formData = new FormData();

        if (file) {
            formData.append('file', file);
        }

        const resolvedFileName = meta.fileName?.trim() || file?.name || '';
        formData.append('name', file?.name || resolvedFileName);
        formData.append('type', 'file');
        formData.append('fileName', resolvedFileName);

        if (parentId) formData.append('parent_id', parentId.toString());

        if (meta.description?.trim()) formData.append('description', meta.description.trim());
        if (meta.authors?.trim()) formData.append('authors', meta.authors.trim());
        if (meta.publication_date?.trim()) formData.append('publication_date', meta.publication_date.trim());
        if (meta.location?.trim()) formData.append('location', meta.location.trim());

        let response;

        if (fileId) {
            // Update existing file
            formData.append('_method', 'PATCH');
            response = await axios.post(`/api/files/${fileId}`, formData);
            toast.success('File updated successfully!');
        } else {
            // Create new file
            response = await axios.post('/api/files', formData);
            toast.success('File uploaded successfully!');
        }

        return response.data;
    } catch (error: any) {
        const errors = error.response?.data?.errors;
        let errorMessage = error.response?.data?.message;
        if (errors) {
            const firstKey = Object.keys(errors)[0];
            if (firstKey && errors[firstKey]?.[0]) {
                errorMessage = errors[firstKey][0];
            }
        }
        toast.error(errorMessage || 'Failed to upload file');
        return null;
    }
};

export const deleteFile = async (id: number, message = 'This action cannot be undone!') => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
        try {
            await axios.delete(`/api/files/${id}`);
            toast.success('Deleted successfully!');
            return true;
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete');
            return false;
        }
    }

    return false;
};

// Get folder path (breadcrumbs)
export const getFolderPath = async (folderId: number) => {
    try {
        const { data } = await axios.get(`/api/files/path/${folderId}`);
        return data; // array [{id, name}, ...]
    } catch (error: any) {
        toast.error('Failed to fetch folder path');
        return [];
    }
};

export const renameFolder = async (id: number, name: string) => {
    try {
        const { data } = await axios.patch(`/api/files/${id}`, { name });
        toast.success('Folder renamed successfully!');
        return data;
    } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to rename folder');
        return null;
    }
};
