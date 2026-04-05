import axios from 'axios'

// In production (Vercel), VITE_API_URL = https://your-app.up.railway.app
// In development, Vite proxies /api → localhost:8000
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Call this once after Clerk loads to attach the Bearer token to every request.
 * Usage in App.jsx:  setupAuthInterceptor(() => getToken())
 */
let _interceptorId = null
export function setupAuthInterceptor(getTokenFn) {
  if (_interceptorId !== null) {
    api.interceptors.request.eject(_interceptorId)
  }
  _interceptorId = api.interceptors.request.use(async (config) => {
    try {
      const token = await getTokenFn()
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {}
    return config
  })
}

// ─── Users ─────────────────────────────────────────────────────────────────
export const getMe = () => api.get('/users/me').then(r => r.data)
export const onboardMe = (data) => api.post('/users/me/onboard', data).then(r => r.data)
export const updateMe = (data) => api.put('/users/me', data).then(r => r.data)
export const getUser = (id) => api.get(`/users/${id}`).then(r => r.data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then(r => r.data)

// ─── Resume ─────────────────────────────────────────────────────────────────
export const uploadResume = (userId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/resume/upload/${userId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const getResumes = (userId) => api.get(`/resume/${userId}`).then(r => r.data)
export const deleteResume = (id) => api.delete(`/resume/${id}`).then(r => r.data)

// ─── Jobs ───────────────────────────────────────────────────────────────────
export const listJobs = (params) => api.get('/jobs/', { params }).then(r => r.data)
export const createJob = (data) => api.post('/jobs/', data).then(r => r.data)
export const searchJobs = (data, userId) =>
  api.post(`/jobs/search${userId ? `?user_id=${userId}` : ''}`, data).then(r => r.data)
export const deleteJob = (id) => api.delete(`/jobs/${id}`).then(r => r.data)

// ─── Applications ────────────────────────────────────────────────────────────
export const createApplication = (data) => api.post('/applications/', data).then(r => r.data)
export const listApplications = (userId, status) =>
  api.get(`/applications/user/${userId}`, { params: { status } }).then(r => r.data)
export const getApplication = (id) => api.get(`/applications/${id}`).then(r => r.data)
export const updateApplication = (id, data) => api.put(`/applications/${id}`, data).then(r => r.data)
export const runAgent = (data) => api.post('/applications/run-agent', data).then(r => r.data)

// ─── Payments ────────────────────────────────────────────────────────────────
export const listPacks = () => api.get('/payments/packs').then(r => r.data)
export const createCheckout = (packId) => api.post(`/payments/checkout/${packId}`).then(r => r.data)

export default api
