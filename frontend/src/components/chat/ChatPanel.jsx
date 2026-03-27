import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User } from 'lucide-react'
import { getChatHistory, sendMessage } from '../../api/chat'
import { mockApi } from '../../lib/mockData'
import { useAppContext } from '../../context/AppContext'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function ChatPanel({ patientId }) {
  const { demoMode } = useAppContext()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const fetch = demoMode ? mockApi.getChatHistory(patientId) : getChatHistory(patientId)
    fetch
      .then(setMessages)
      .catch(() => setError('Failed to load chat history'))
      .finally(() => setLoading(false))
  }, [patientId, demoMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async (e) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)
    setError(null)
    const tmpId = `tmp-${Date.now()}`
    setMessages(m => [...m, { id: tmpId, role: 'user', content }])
    try {
      const reply = await (demoMode ? mockApi.sendMessage(patientId, content) : sendMessage(patientId, content))
      setMessages(m => [...m, reply])
    } catch {
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingSpinner size="sm" label="Loading chat..." />

  return (
    <div className="flex flex-col" style={{ height: '420px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
          <Bot size={14} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Clinical AI Assistant</p>
          <p className="text-[10px] text-slate-400">Ask questions about this patient's measurements and history</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Bot size={20} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">How can I help?</p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                Ask about symmetry trends, measurement comparisons, or session progress
              </p>
            </div>
            {demoMode && (
              <div className="flex flex-col gap-1.5 w-full max-w-xs">
                {[
                  "How has the symmetry score changed?",
                  "Is this patient ready for discharge?",
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs text-left px-3 py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {msg.role === 'user' ? <User size={11} /> : <Bot size={11} />}
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sending && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <Bot size={11} className="text-slate-500" />
            </div>
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl rounded-tl-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 0.15, 0.3].map(d => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-xs text-red-500 py-1">{error}</p>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about this patient..."
          className="input flex-1 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn-primary px-3 py-2 shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
