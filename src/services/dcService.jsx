import api from './apiService.jsx';

let _dcCache = null;

export const dcService = {
  fetchAll: async (useCache = true) => {
    if (useCache && Array.isArray(_dcCache)) return _dcCache;
    const { data } = await api.get('/dc/fetch-all');
    _dcCache = Array.isArray(data) ? data : [];
    return _dcCache;
  },
  getNameById: async (id) => {
    if (id == null) return undefined;
    const list = await dcService.fetchAll(true);
    const found = list.find((dc) => Number(dc?.id) === Number(id));
    return found?.name;
  },
};

export default dcService;
