export type PageProps<T extends Record<string, unknown> = {}> = T & {
    auth: {
        user: User | null;
        role: string | null;
    };
};

export interface SharedProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        } | null;
    };
    flash?: {
        message?: string;
    };
}

export interface User {
    id: number;
    username: string;
    email: string;
    email_verified_at?: string;
    profile: Profile | null;
    role?: string;
}

export interface Department {
    id: number;
    logo?: string;
    name: string;
}

export interface Profile {
    id: number;
    user_id: number;
    department_id: number;
    avatar?: string;
    fname: string;
    mname?: string;
    lname: string;
    suffix: string;
    gender: 'male' | 'female' | 'other';
    contact_number: string;
    address: string;
    birthdate: string;
    department: Department;
}

export interface FileItem {
    id: number;
    name: string;
    type: 'file' | 'folder';
    parent_id: number | null;
    path?: string;
    children?: FileItem[];
    details?: FileDetails;
}

export interface FileDetails {
    id: number;
    file_id: number;
    fileName: string;
    size: number;
    description?: string;
    authors?: string;
    publication_date?: string;
    location?: string;
    views: number;
    downloads: number;
    status: 'inactive' | 'active' | 'archived';
    file: FileItem;
}
