export const apiFetch = async (url, options = {}) => {
  const companyId = localStorage.getItem('companyId');
  const headers = {
    'Content-Type': 'application/json',
    'X-Company-ID': companyId,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  return response.json();
}; 