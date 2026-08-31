import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 5 * 60

/** Extensión de archivo razonable a partir del mimeType que reporta MediaRecorder. */
function extensionFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  return 'webm'
}

interface UseAudioRecorderResult {
  isRecording: boolean
  seconds: number
  error: string | null
  start: () => Promise<void>
  /** Para la grabación y devuelve el archivo grabado (o null si no había nada grabando). */
  stop: () => Promise<File | null>
  /** Para y descarta lo grabado, sin devolver nada. */
  cancel: () => void
}

/**
 * Graba audio del micrófono con la MediaRecorder API nativa del navegador —
 * sin librerías nuevas. Corta sola a los 5 minutos (a ~24kbps de opus, eso
 * pesa ~1MB, bien por debajo del límite de 5MB de app.storage.max-file-size-mb).
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => cleanupStream, [cleanupStream])

  const start = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start()

      setSeconds(0)
      setIsRecording(true)
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            recorder.stop()
            return s
          }
          return s + 1
        })
      }, 1_000)
    } catch {
      setError('No se pudo acceder al micrófono. Revisá los permisos del navegador.')
    }
  }, [])

  const stop = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        cleanupStream()
        setIsRecording(false)
        resolve(new File([blob], `voice-${Date.now()}.${extensionFor(mimeType)}`, { type: mimeType }))
      }
      recorder.stop()
    })
  }, [cleanupStream])

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    cleanupStream()
    setIsRecording(false)
    setSeconds(0)
  }, [cleanupStream])

  return { isRecording, seconds, error, start, stop, cancel }
}
