import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Users ─────────────────────────────────────────────────────────────────

export const createUser = (data) => api.post('/users/', data).then(r => r.data)
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

export default api
