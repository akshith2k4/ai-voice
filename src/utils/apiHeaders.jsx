export const getApiHeaders = () => {
    const token = localStorage.getItem('token');
    const companyId = localStorage.getItem('companyId') || 'default-company-id'; // Use a default if needed

    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'X-Company-ID': companyId
    };
}; 