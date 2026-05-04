import axios from 'axios'

const BASE = '/api/reports'

export const getSessionReports = (sessionId) => axios.get(`${BASE}/${sessionId}`).then(r => r.data)
export const createAssessmentReport = (sessionId) =>
  axios.post(`${BASE}/assessment`, { session_id: sessionId }).then(r => r.data)
export const createProgressReport = (sessionId, previousSessionId) =>
  axios.post(`${BASE}/progress`, { session_id: sessionId, previous_session_id: previousSessionId }).then(r => r.data)
export const createSoapReport = (sessionId) =>
  axios.post(`${BASE}/soap`, { session_id: sessionId }).then(r => r.data)
