import axios from 'axios'

export const createSession = (data) => axios.post('/api/sessions', data).then(r => r.data)
export const getSession = (id) => axios.get(`/api/sessions/${id}`).then(r => r.data)
