import { api } from './client'

// Products
export const productsApi = {
  list: (params) => api.get('/products', params),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
  categories: () => api.get('/products/categories'),
  seed: (count = 100) => api.post(`/products/seed?count=${count}`),
}

// Inventory
export const inventoryApi = {
  adjust: (payload) => api.post('/inventory/adjust', payload),
  reserve: (payload) => api.post('/inventory/reserve', payload),
  release: (payload) => api.post('/inventory/release', payload),
  logs: (params) => api.get('/inventory/logs', params),
}

// Alerts
export const alertsApi = {
  list: (params) => api.get('/alerts', params),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`, { user: 'dashboard' }),
}

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
}

// Agent
export const agentApi = {
  status: () => api.get('/agent/status'),
  check: () => api.post('/agent/check'),
}
