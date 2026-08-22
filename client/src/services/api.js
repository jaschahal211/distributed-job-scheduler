import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add Authorization header interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor for handling errors gracefully
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const errorMsg = error.response?.data?.error?.message || error.message || 'An error occurred';
        return Promise.reject(new Error(errorMsg));
    }
);

export const authApi = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
};

export const projectApi = {
    list: () => api.get('/projects'),
    get: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.patch(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
};

export const queueApi = {
    list: (projectId) => api.get(`/projects/${projectId}/queues`),
    get: (id) => api.get(`/queues/${id}`),
    create: (projectId, data) => api.post(`/projects/${projectId}/queues`, data),
    update: (id, data) => api.patch(`/queues/${id}`, data),
    pause: (id) => api.post(`/queues/${id}/pause`),
    resume: (id) => api.post(`/queues/${id}/resume`),
    delete: (id) => api.delete(`/queues/${id}`),
    getStats: (id) => api.get(`/queues/${id}/stats`),
};

export const jobApi = {
    list: (params) => api.get('/jobs', { params }),
    get: (id) => api.get(`/jobs/${id}`),
    create: (queueId, data) => api.post(`/queues/${queueId}/jobs`, data),
    batchCreate: (data) => api.post('/jobs/batch', data),
    retry: (id) => api.post(`/jobs/${id}/retry`),
    cancel: (id) => api.post(`/jobs/${id}/cancel`),
    delete: (id) => api.delete(`/jobs/${id}`),
    getExecutions: (id) => api.get(`/jobs/${id}/executions`),
    getLogs: (id) => api.get(`/jobs/${id}/logs`),
    getDashboardStats: () => api.get('/jobs/dashboard-stats'),
};

export const workerApi = {
    list: () => api.get('/workers'),
    get: (id) => api.get(`/workers/${id}`),
    getHeartbeats: (id) => api.get(`/workers/${id}/heartbeat`),
};

export const executionApi = {
    get: (id) => api.get(`/executions/${id}`),
};

export const dlqApi = {
    list: (params) => api.get('/dlq', { params }),
    get: (id) => api.get(`/dlq/${id}`),
    retry: (id) => api.post(`/dlq/${id}/retry`),
    delete: (id) => api.delete(`/dlq/${id}`),
};

export const scheduleApi = {
    list: (params) => api.get('/schedules', { params }),
    create: (data) => api.post('/schedules', data),
    update: (id, data) => api.patch(`/schedules/${id}`, data),
    delete: (id) => api.delete(`/schedules/${id}`),
};

export const retryPolicyApi = {
    list: () => api.get('/retry-policies'),
    create: (data) => api.post('/retry-policies', data),
};

export default api;
