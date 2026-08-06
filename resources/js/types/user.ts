import { Profile } from ".";

export interface UserRole {
    id: number;
    name: string;
    guard_name: string;
}

export interface User {
    id: number;
    username: string;
    role?: string;
    roles?: UserRole[];
    profile?: Profile;
}

