const env = import.meta.env as ImportMetaEnv;
export const BACKEND_URL = env.VITE_BACKEND_URL || 'https://best-backend.onrender.com';

export function apiUrl(path: string) {
    const base = BACKEND_URL.trim().replace(/\/+$/g, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}
