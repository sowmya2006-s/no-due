const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw { ...errorData, status: res.status };
    }
    return res.json();
};

export const api = {
    get: async (endpoint: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return handleResponse(res);
    },

    post: async (endpoint: string, data: any) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    patch: async (endpoint: string, data: any) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    delete: async (endpoint: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return handleResponse(res);
    }
};
