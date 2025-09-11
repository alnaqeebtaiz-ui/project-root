// D:\project-root\assets\js\users-service.js

const API_BASE_URL = 'https://alnaqeeb.onrender.com/api';
const USERS_API_URL = `${API_BASE_URL}/users`;

const getAuthToken = () => localStorage.getItem('jwtToken');

const getAuthHeaders = (contentType = 'application/json') => {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        throw new Error('لا يوجد توكن مصادقة. يرجى تسجيل الدخول.');
    }
    const headers = {
        'x-auth-token': token
    };
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
};

export async function getUsers(page = 1, limit = 50) {
    try {
        const headers = getAuthHeaders(null);
        console.log("USERS-SERVICE: Making API call to:", `${USERS_API_URL}?page=${page}&limit=${limit}`);
        const response = await fetch(`${USERS_API_URL}?page=${page}&limit=${limit}`, { headers });
        console.log("USERS-SERVICE: API Response status:", response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("USERS-SERVICE: API Error Response Data:", errorData);
            throw new Error(errorData.msg || 'فشل في جلب المستخدمين.');
        }
        
        const responseData = await response.json();
        console.log("USERS-SERVICE: Raw API Response Data (Success):", responseData);
        return responseData;
    } catch (error) {
        console.error("USERS-SERVICE: Error fetching users:", error);
        throw error;
    }
}

export async function getUserById(id) {
    try {
        const headers = getAuthHeaders(null);
        const response = await fetch(`${USERS_API_URL}/${id}`, { headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في جلب المستخدم.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching user by ID ${id}:`, error);
        throw error;
    }
}

// 💡💡💡 تعديل دالة addUser 💡💡💡
export async function addUser(userData) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(USERS_API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(userData) // userData هنا يجب أن تحتوي على email وليس fullName
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في إضافة المستخدم.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding user:", error);
        throw error;
    }
}

// 💡💡💡 تعديل دالة updateUser - تغيير METHOD إلى 'PUT' 💡💡💡
export async function updateUser(id, userData) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${USERS_API_URL}/${id}`, {
            method: 'PUT', // 👈 تغيير هنا من PATCH إلى PUT
            headers: headers,
            body: JSON.stringify(userData) // userData هنا يجب أن تحتوي على email وليس fullName
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في تحديث المستخدم.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating user ${id}:`, error);
        throw error;
    }
}

// 💡💡💡 تعديل دالة changeUserPassword - تغيير METHOD إلى 'PUT' 💡💡💡
export async function changeUserPassword(id, newPassword) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${USERS_API_URL}/${id}/password`, { // Backend يستخدم /password
            method: 'PUT', // 👈 تغيير هنا من PATCH إلى PUT
            headers: headers,
            body: JSON.stringify({ newPassword })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في تغيير كلمة المرور.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error changing password for user ${id}:`, error);
        throw error;
    }
}

// 💡💡💡 تعديل دالة toggleUserStatus - تغيير METHOD إلى 'PUT' 💡💡💡
export async function toggleUserStatus(id, isActive) { // تحتاج لإرسال isActive
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${USERS_API_URL}/${id}/status`, { // Backend يستخدم /status
            method: 'PUT', // 👈 تغيير هنا من PATCH إلى PUT
            headers: headers,
            body: JSON.stringify({ isActive }) // 👈 يجب أن نرسل isActive صراحةً
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في تغيير حالة المستخدم.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error toggling status for user ${id}:`, error);
        throw error;
    }
}

export async function deleteUser(id) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${USERS_API_URL}/${id}`, {
            method: 'DELETE',
            headers: headers
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'فشل في حذف المستخدم.');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        throw error;
    }
}