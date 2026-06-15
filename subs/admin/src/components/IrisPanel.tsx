/**
 * Iris Assistant — the functional multi-turn chat panel (the heaviest admin
 * component). Faithful React port of components/IrisPanel.js: collapsible shell,
 * stateful conversation, multi-turn `POST /iris/chat`, the "thinking" indicator,
 * and 401/error handling — full parity with the vanilla behavior. Frontend-only;
 * the iris_handler Bedrock backend is untouched.
 *
 * On a 401 the API layer (submitIrisQuery) redirects to login and returns null —
 * we leave the transcript as-is while the redirect happens. Any other failure
 * surfaces an assistant-bubble apology, matching the original.
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Input } from '@heroui/react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { submitIrisQuery } from '../api/adminApi';
import type { IrisMessage } from '../config/adminConfig';

const EXAMPLE_QUERIES = [
  'What needs repair?',
  'Show Christmas spending',
  'Where is Zero stored?',
  'What items are deployed?',
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function IrisPanel() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<IrisMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest turn (mirrors the vanilla scrollTop = scrollHeight).
  useEffect(() => {
    if (expanded) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, expanded]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: IrisMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
    // Include the just-added user turn in the payload (parity with the original).
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const payload = history.map((m) => ({ role: m.role, content: m.content }));
      const result = await submitIrisQuery(payload);
      // null === 401 redirect already in flight; leave the transcript untouched.
      if (result) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.response, timestamp: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      console.error('Iris error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card shadow="md" className="bg-content1">
      {/* Header — click to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-3">
          <MessageCircle size={20} className="text-secondary" />
          <span className="flex flex-col">
            <span className="font-semibold text-foreground">Iris Assistant</span>
            <span className="text-tiny text-default-500">
              {expanded ? 'Ask about your inventory' : 'Click to expand'}
            </span>
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`text-default-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded ? (
        <div className="flex h-96 flex-col border-t border-divider">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="rounded-large bg-content2 px-3 py-2 text-small text-default-500">
                Welcome! Ask me anything about your SpookyDecs inventory.
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex flex-col items-start">
                <div className="rounded-large bg-content2 px-3 py-2 text-small italic text-default-500">
                  Iris is thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-divider p-3">
            <Input
              value={input}
              onValueChange={setInput}
              placeholder="Ask Iris anything..."
              autoComplete="off"
              isDisabled={loading}
              size="sm"
            />
            <Button type="submit" color="secondary" isLoading={loading} isDisabled={!input.trim()}>
              Send
            </Button>
          </form>
        </div>
      ) : (
        <div className="border-t border-divider p-4">
          <p className="mb-3 text-small text-default-600">💬 "Ask Iris about your inventory"</p>
          <p className="mb-2 text-tiny uppercase tracking-wide text-default-500">Example queries:</p>
          <ul className="list-inside list-disc space-y-1 text-small text-default-500">
            {EXAMPLE_QUERIES.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function MessageBubble({ message }: { message: IrisMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-large px-3 py-2 text-small ${
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-content2 text-foreground'
        }`}
      >
        {message.content}
      </div>
      <span className="mt-1 text-tiny text-default-400">{formatTime(message.timestamp)}</span>
    </div>
  );
}
