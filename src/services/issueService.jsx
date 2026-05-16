import api from './apiService.jsx';
import { getDcid } from '../state/dcidStore';
import { dcService } from './dcService.jsx';

const API_BASE_URL = '/issues';

export const issueService = {
  search: async (filter = {}) => {
    // Backend expects assignedToId/assignedToType instead of dcId
    const dcid = getDcid();
    const enriched = {
      ...filter,
      assignedToId: filter.assignedToId ?? (dcid != null ? Number(dcid) : undefined),
      assignedToType: filter.assignedToType ?? 'WAREHOUSE',
    };
    // Do not send dcId in body
    const payload = { ...enriched };
    if (Object.prototype.hasOwnProperty.call(payload, 'dcId')) {
      delete payload.dcId;
    }
    const { data } = await api.post(`${API_BASE_URL}/search`, payload, {
      // Do not auto-inject dcId; we already mapped it
      meta: { includeDcid: false },
    });
    return data;
  },

  create: async (payload) => {
    const dcid = getDcid();
    const enriched = {
      ...payload,
      assignedToId: payload?.assignedToId ?? (dcid != null ? Number(dcid) : undefined),
      assignedToType: payload?.assignedToType ?? 'WAREHOUSE',
    };
    const body = { ...enriched };
    // If assignedToName missing and assignedToType is WAREHOUSE, populate from DC list
    if (!body.assignedToName && body.assignedToType === 'WAREHOUSE' && body.assignedToId != null) {
      try {
        const dcName = await dcService.getNameById(body.assignedToId);
        if (dcName) body.assignedToName = dcName;
      } catch {
        // Non-fatal: continue without assignedToName if lookup fails
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'dcId')) delete body.dcId;
    const { data } = await api.post(`${API_BASE_URL}`, body, {
      // We explicitly mapped dcId into assignedToId/Type
      meta: { includeDcid: false },
    });
    return data;
  },

  delete: async (id) => {
    await api.delete(`${API_BASE_URL}/${id}`, {
      meta: { includeDcid: true },
    });
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/images/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      meta: { includeDcid: true },
    });
    // Backend returns new UploadImageResponse(imageUrl)
    return data?.imageUrl || data?.url || '';
  },

  resolve: async (id, resolutionRequest) => {
    // POST /issues/{id}/resolution
    const { data } = await api.post(`${API_BASE_URL}/${id}/resolution`, resolutionRequest, {
      meta: { includeDcid: true },
    });
    return data;
  },
};

export default issueService;
