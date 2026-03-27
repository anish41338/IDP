import { useState, useEffect, useRef, useCallback } from 'react'

export default function useVideoStream(heightCm) {
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
      if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(blob => {
        if (!blob || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        blob.arrayBuffer().then(buf => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(buf)
          }
        })
      }, 'image/jpeg', 0.7)
    }, 100) // 10 fps
  }, [stopCapture])

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket('ws://localhost:8000/ws/video')
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
      retryCountRef.current = 0
      ws.send(JSON.stringify({ type: 'config', height_cm: heightCm || 170 }))
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
  }, [heightCm, startCapture, stopCapture])

  useEffect(() => {
    // Start webcam
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        connect()
      })
      .catch(() => setError('Camera access denied'))

    return () => {
      stopCapture()
      clearTimeout(retryTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { frameDataUrl, measurements, alerts, connected, error, videoRef, canvasRef }
}
