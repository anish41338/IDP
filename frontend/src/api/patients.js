import axios from 'axios'

const BASE = '/api/patients'

export const getPatients = () => axios.get(BASE).then(r => r.data)
export const getPatient = (id) => axios.get(`${BASE}/${id}`).then(r => r.data)
export const createPatient = (data) => axios.post(BASE, data).then(r => r.data)
export const updatePatient = (id, data) => axios.put(`${BASE}/${id}`, data).then(r => r.data)
export const deletePatient = (id) => axios.delete(`${BASE}/${id}`)
export const getPatientSessions = (id) => axios.get(`${BASE}/${id}/sessions`).then(r => r.data)
