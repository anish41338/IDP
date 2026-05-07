import { useState, useEffect, useRef, useCallback } from 'react'

// Generate a session id once per hook instance. Survives StrictMode
// double-mount, useEffect cleanup churn, and WS reconnects so the
// backend can distinguish "same session, reconnecting" from "new session,
// reset calibration". Falls back to a random string if crypto.randomUUID
// is unavailable (older browsers / non-secure contexts).
function makeSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export default function useVideoStream(heightCm, patientId) {
  const [frameDataUrl, setFrameDataUrl] = useState(null)
  const [measurements, setMeasurements] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  const wsRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef(null)
  const heightCmRef = useRef(heightCm || 170)
  const patientIdRef = useRef(patientId ?? null)
  const sessionIdRef = useRef(null)
  if (sessionIdRef.current === null) {
    sessionIdRef.current = makeSessionId()
  }
  const streamRef = useRef(null)   // keep stream reference so we can attach it after video mounts

  useEffect(() => {
    heightCmRef.current = heightCm || 170
    patientIdRef.current = patientId ?? null
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        session_id: sessionIdRef.current,
        height_cm: heightCmRef.current,
        patient_id: patientIdRef.current,
      }))
    }
  }, [heightCm, patientId])

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startCapture = useCallback(() => {
    stopCapture()
    intervalRef.current = setInterval(() => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ws = wsRef.current

      // Attach stream to video element if the stream arrived before video mounted
      if (video && streamRef.current && !video.srcObject) {
        video.srcObject = streamRef.current
        video.play().catch(() => {})
      }

      if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return
      if (!video.videoWidth || !video.videoHeight) return  // not ready yet

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(blob => {
        if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        blob.arrayBuffer().then(buf => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(buf)
          }
        })
      }, 'image/jpeg', 0.75)
    }, 100) // 10 fps
  }, [stopCapture])

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const ws = new WebSocket('ws://localhost:8000/ws/video')
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
      retryCountRef.current = 0
      ws.send(JSON.stringify({
        type: 'config',
        session_id: sessionIdRef.current,
        height_cm: heightCmRef.current || 170,
        patient_id: patientIdRef.current,
      }))
      startCapture()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.frame) {
          setFrameDataUrl(`data:image/jpeg;base64,${data.frame}`)
        }
        if (data.measurements) setMeasurements(data.measurements)
        if (data.posture_alerts) setAlerts(data.posture_alerts)
        if (data.error) console.warn('Backend error:', data.error)
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      setConnected(false)
      stopCapture()
      const retries = retryCountRef.current
      if (retries < 5) {
        const delay = Math.min(1000 * Math.pow(2, retries), 8000)
        retryTimeoutRef.current = setTimeout(() => {
          retryCountRef.current += 1
          connect()
        }, delay)
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection error')
    }
  }, [startCapture, stopCapture])

  useEffect(() => {
    // Only activate when heightCm is provided — step 1 passes null to stay idle
    if (heightCm == null) return

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then(stream => {
        streamRef.current = stream
        // Attach immediately if video element is already mounted
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        connect()
      })
      .catch(err => {
        console.error('Camera error:', err)
        setError('Camera access denied — please allow camera permissions')
      })

    return () => {
      stopCapture()
      clearTimeout(retryTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [heightCm != null]) // eslint-disable-line react-hooks/exhaustive-deps

  return { frameDataUrl, measurements, alerts, connected, error, videoRef, canvasRef }
}
