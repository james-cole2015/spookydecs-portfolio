import { useCallback, useRef, useState } from 'react';
import { AssistantUnavailableError, postAssistant } from '../../api/deploymentsApi';
import { defaultIncluded, type Proposal } from '../../lib/proposal';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Conversation + current proposal state for one zone (#639). The Lambda is stateless, so the whole
 * transcript is sent each turn. A zone switch discards the transcript and proposal: a proposal is
 * only meaningful against the zone it was made for.
 */
export function useAssistant(deploymentId: string, zone: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [clarify, setClarify] = useState<Proposal['clarify'] | null>(null);
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);
  const zoneRef = useRef(zone);

  if (zoneRef.current !== zone) {
    zoneRef.current = zone;
    setMessages([]);
    setProposal(null);
    setClarify(null);
    setIncluded(new Set());
  }

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      const next: ChatMessage[] = [...messages, { role: 'user', text: trimmed }];
      setMessages(next);
      setClarify(null);
      setBusy(true);
      try {
        const res = await postAssistant(
          deploymentId,
          zone,
          next.map((m) => ({ role: m.role, content: m.text })),
        );
        if (zoneRef.current !== zone) return; // zone changed mid-flight
        const data: Proposal | undefined = res?.data;
        if (!data) return;
        setMessages((m) => [...m, { role: 'assistant', text: data.message || '…' }]);
        const hasRows = data.type === 'proposal' && data.rows.length > 0;
        setProposal(hasRows ? data : null);
        setClarify(data.type === 'clarify' ? data.clarify ?? null : null);
        setIncluded(hasRows ? defaultIncluded(data.rows) : new Set());
      } catch (err: any) {
        if (err instanceof AssistantUnavailableError) setAvailable(false);
        else setMessages((m) => [...m, { role: 'assistant', text: err?.message || 'Something went wrong. Try again.' }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, deploymentId, messages, zone],
  );

  const toggle = useCallback((rowId: string) => {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const clearProposal = useCallback(() => {
    setProposal(null);
    setIncluded(new Set());
  }, []);

  return { messages, proposal, clarify, included, busy, available, send, toggle, clearProposal };
}
