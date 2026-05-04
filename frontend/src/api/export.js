export const exportPdf = (sessionId) => {
  window.open(`/api/export/pdf/${sessionId}`, '_blank')
}
export const exportCsv = (patientId) => {
  window.open(`/api/export/csv/${patientId}`, '_blank')
}
