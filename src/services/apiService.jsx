import axios from 'axios';
import { getDcid } from '../state/dcidStore';

export const BASE_URL = import.meta.env.VITE_BASE_URL;

const apiService = axios.create({
  baseURL: `${BASE_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isPlainObjectData(data) {
  return data && typeof data === "object" && !Array.isArray(data) && !(data instanceof FormData);
}

function addToGetParams(config, key, value) {
  config.params = { ...(config.params || {}), [key]: value };
}

function addToBody(config, key, value) {
  if (isPlainObjectData(config.data)) {
    config.data = { ...config.data, [key]: value };
  } else if (config.data instanceof FormData) {
    config.data.append(key, value);
  } else if (!config.data) {
    config.data = { [key]: value };
  }
}

function injectValue(config, metaKey, paramKey, getterFn) {
  const include = Boolean(config.meta?.[metaKey]);
  const isLoginRoute = config.url?.includes("/auth/login");

  if (!include || isLoginRoute) return;

  const value = getterFn();
  if (value == null) return;

  const method = (config.method || "get").toLowerCase();

  if (method === "get") {
    addToGetParams(config, paramKey, value);
  } else {
    addToBody(config, paramKey, value);
  }
}


apiService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const companyId = localStorage.getItem("companyId");

    const isLoginRoute = config.url?.includes("/auth/login");

    if (!isLoginRoute && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!isLoginRoute) {
      config.headers["X-Company-ID"] = companyId || 'default-company-id';
    }

    // 🟦 Inject dcid if requested
    injectValue(config, "includeDcid", "dcId", () => getDcid());

    return config;
  },
  (error) => Promise.reject(error)
);


export default apiService;

// Global response interceptor to handle auth failures
apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      try {
        localStorage.clear()
      } finally {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

