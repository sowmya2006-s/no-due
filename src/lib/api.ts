const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
    get: async (endpoint: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) throw await res.json();
        return res.json();
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
        if (!res.ok) throw await res.json();
        return res.json();
    }
};
