// shared/api.js

const API_BASE_URL = '/api';

/**
 * Wrapper standardisé pour les appels fetch avec injection du JWT.
 */
export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        // Gestion token expiré (TODO: Implémenter logique refresh token)
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            window.location.href = '/vitrine/login.html';
            return null;
        }

        if (response.status === 403) {
            throw new Error("Acces refuse : connectez-vous avec un compte autorise.");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Une erreur est survenue');
        }

        // Si pas de contenu (ex: DELETE), renvoyer objet vide
        if (response.status === 204) return {};
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export function checkAuth() {
    return !!localStorage.getItem('token');
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = '/vitrine/login.html';
}
