import axios from 'axios'

export const getChatHistory = (patientId) =>
  axios.get(`/api/chat/${patientId}`).then(r => r.data)
export const sendMessage = (patientId, content) =>
  axios.post(`/api/chat/${patientId}`, { content }).then(r => r.data)
