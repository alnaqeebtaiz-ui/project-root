// C:\Users\khalid\Downloads\project-root\assets\js\auth-service.js
const API_URL = 'https://alnaqeeb.onrender.com/api'; // <--- THIS MUST BE CORRECT AND YOUR BACKEND RUNNING

/**
 * ... (All the login, logout, getAuthToken, isAuthenticated, getUserRole, setUserInfo, getUserInfo functions) ...
 * This should be the version that combines all the auth helpers.
 */

// Example of what the key functions should look like:

export async function login(username, password) { 
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('jwtToken', data.token);
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            const userInfo = {
                id: payload.user.id,
                name: payload.user.name,
                email: payload.user.email,
                role: payload.user.role,
            };
            setUserInfo(userInfo);
            return { success: true, message: data.msg };
        } else {
            throw new Error(data.msg || 'فشل تسجيل الدخول.');
        }
    } catch (error) {
        console.error('Auth Service Login Error:', error);
        throw error;
    }
}

export function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userInfo');
}

export function getAuthToken() {
    return localStorage.getItem('jwtToken');
}

export function isAuthenticated() {
    const token = getAuthToken();
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            logout();
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error decoding JWT or token malformed:', error);
        logout();
        return false;
    }
}

export function getUserInfo() {
    const userInfoString = localStorage.getItem('userInfo');
    return userInfoString ? JSON.parse(userInfoString) : null;
}

export function setUserInfo(userInfo) {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
}