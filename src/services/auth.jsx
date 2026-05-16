import apiService from './apiService';

export const login = async (credentials) => {
  try {
    const response = await apiService.post('/auth/login', credentials);
    const data = response.data;

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('companyId', data.companyId);
      localStorage.setItem('branchId', data.branchId);

      localStorage.setItem('currentUser', JSON.stringify({
        name: data.name,
        role: data.role
      }));
    }

    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = () => {
  try {
    localStorage.clear();
  } finally {
    // Ensure redirect even if storage operations fail
    window.location.href = '/login';
  }
};

