import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTypingIndicator } from '@/hooks/useWebSocket'
import { newClientMessageId } from '@/lib/id'
import { messageService, uploadService } from '@/services'
import { useChatStore } from '@/store/chatstore'
import { EmojiPicker } from '@/components/chat/EmojiPicker'

interface Props { conversationId: number; onSend: (text: string) => Promise<void>; disabled?: boolean }

const MAX_FILES = 3

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

export function MessageInput({ conversationId, onSend, disabled = false }: Props) {
  const [text, setText]       = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiWrapperRef = useRef<HTMLDivElement>(null)
  // Última posición del cursor en el textarea — se usa para insertar el
  // emoji ahí en vez de siempre al final (el picker le roba el foco al
  // textarea mientras está abierto, así que no se puede leer selectionStart
  // recién al clickear un emoji).
  const cursorPosRef = useRef(0)
  // Posición a la que hay que mover el cursor DESPUÉS de que React actualice
  // el DOM con el nuevo texto (no se puede hacer de forma síncrona en el
  // mismo handler — el textarea todavía tiene el valor viejo en ese instante).
  const pendingCursorRef = useRef<number | null>(null)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const { sendTyping } = useTypingIndicator(conversationId)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (emojiWrapperRef.current && !emojiWrapperRef.current.contains(e.target as Node)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (pendingCursorRef.current === null || !taRef.current) return
    const pos = pendingCursorRef.current
    pendingCursorRef.current = null
    taRef.current.focus()
    taRef.current.setSelectionRange(pos, pos)
    resizeTextarea(taRef.current)
  }, [text])

  const trackCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    cursorPosRef.current = e.currentTarget.selectionStart ?? text.length
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    try {
      setIsSending(true)
      await onSend(trimmed)
      setText('')
      cursorPosRef.current = 0
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
    cursorPosRef.current = e.target.selectionStart ?? e.target.value.length
    sendTyping()
    resizeTextarea(e.target)
  }

  const handleEmojiSelect = (emoji: string) => {
    const pos = cursorPosRef.current
    setText((prev) => prev.slice(0, pos) + emoji + prev.slice(pos))
    pendingCursorRef.current = pos + emoji.length
    sendTyping()
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
        clientMessageId: newClientMessageId(),
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

        <div ref={emojiWrapperRef} className="relative flex-shrink-0">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            disabled={disabled}
            title="Insertar emoji"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.25 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute bottom-full left-0 z-50 mb-2 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <EmojiPicker onSelect={handleEmojiSelect} />
            </div>
          )}
        </div>

        <textarea ref={taRef} rows={1} value={text} onChange={handleChange} onKeyDown={handleKeyDown}
          onSelect={trackCursor} onClick={trackCursor} onKeyUp={trackCursor}
          placeholder="Escribe un mensaje... (Enter para enviar)"
          disabled={disabled}
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
