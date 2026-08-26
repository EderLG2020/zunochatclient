import { useState, useRef, type KeyboardEvent } from 'react'
import { useTypingIndicator } from '@/hooks/useWebSocket'
import { messageService, uploadService } from '@/services'
import { useChatStore } from '@/store/chatstore'

interface Props { conversationId: number; onSend: (text: string) => Promise<void>; disabled?: boolean }

const MAX_FILES = 3

export function MessageInput({ conversationId, onSend, disabled = false }: Props) {
  const [text, setText]       = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const { sendTyping } = useTypingIndicator(conversationId)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    try {
      setIsSending(true)
      await onSend(trimmed)
      setText('')
      if (taRef.current) taRef.current.style.height = 'auto'
    } finally {
      setIsSending(false)
      taRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    sendTyping()
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // permite volver a elegir el mismo archivo después
    if (files.length === 0) return
    if (files.length > MAX_FILES) {
      setAttachError(`Máximo ${MAX_FILES} archivos por mensaje.`)
      return
    }

    try {
      setIsAttaching(true)
      setAttachError(null)
      const urls = await uploadService.upload(files)
      const allImages = files.every((f) => f.type.startsWith('image/'))
      const msg = await messageService.send({
        conversationId,
        type: allImages ? 'IMAGE' : 'FILE',
        fileUrls: urls,
      })
      appendMessage(msg)
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } }
      setAttachError(e2.response?.data?.message ?? 'No se pudo adjuntar el archivo.')
    } finally {
      setIsAttaching(false)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      {attachError && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
          {attachError}
        </p>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleAttach}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isAttaching}
          title="Adjuntar archivo"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {isAttaching
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>}
        </button>

        <textarea ref={taRef} rows={1} value={text} onChange={handleChange} onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje... (Enter para enviar)"
          disabled={disabled || isSending}
          className="flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-800 dark:focus:ring-blue-900"
          style={{ maxHeight: '120px' }} />

        <button onClick={handleSend} disabled={!text.trim() || isSending || disabled}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          aria-label="Enviar">
          {isSending
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 rotate-90">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>}
        </button>
      </div>
    </div>
  )
}
