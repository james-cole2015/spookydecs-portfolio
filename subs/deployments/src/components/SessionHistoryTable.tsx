import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '@heroui/react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { EmptyState } from '@spookydecs/ui';
import type { Session, Connection } from '../config/deploymentsConfig';

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${minutes}m`;
}

function truncateSessionId(sessionId: string): string {
  const parts = sessionId.split('-');
  return parts[1]?.substring(0, 6) || sessionId;
}

function ConnectionsDetail({ session }: { session: Session }) {
  const connections = (session.connections || []) as Connection[];
  if (connections.length === 0) {
    return <p className="px-4 py-3 text-sm text-default-500">No connections recorded for this session</p>;
  }
  return (
    <div className="flex flex-col gap-2 bg-default-50 px-4 py-3">
      <h4 className="text-sm font-semibold text-foreground">Connections ({connections.length})</h4>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,max-content)_auto_minmax(0,max-content)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm text-foreground">
        {connections.map((conn: any) => (
          <a
            key={conn.connection_id}
            href={`/deployments/builder/${session.deployment_id || ''}/${session.session_id}/${conn.connection_id}`}
            className="col-span-full grid grid-cols-subgrid items-center rounded-medium border border-default-200 bg-content1 p-2 hover:border-secondary"
          >
            <div className="col-start-2 min-w-0 text-right">
              <div className="truncate font-medium">{conn.from_item_id}</div>
              <div className="truncate text-xs text-default-400">{conn.from_port}</div>
            </div>
            <span className="text-default-400">→</span>
            <div className="min-w-0 text-left">
              <div className="truncate font-medium">{conn.to_item_id}</div>
              <div className="truncate text-xs text-default-400">{conn.to_port}</div>
            </div>
            {conn.illuminates?.length > 0 && (
              <div className="col-span-full mt-1 text-xs text-default-500">
                💡 Illuminates: {conn.illuminates.join(', ')}
              </div>
            )}
            {conn.notes && (
              <div className="col-span-full mt-1 text-xs text-default-500">{conn.notes}</div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

export function SessionHistoryTable({
  sessions,
  onSessionClick,
}: {
  sessions: Session[];
  onSessionClick: (session: Session) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="No sessions yet"
        message="Start a new session to begin tracking your work"
      />
    );
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.start_time as string).getTime() - new Date(a.start_time as string).getTime(),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-medium border border-default-200">
      <div className="hidden grid-cols-12 gap-2 bg-default-100 px-4 py-2 text-xs font-semibold text-default-600 sm:grid">
        <div className="col-span-2">Session</div>
        <div className="col-span-2">Started</div>
        <div className="col-span-2">Duration</div>
        <div className="col-span-1">Items</div>
        <div className="col-span-2">Connections</div>
        <div className="col-span-2">Notes</div>
        <div className="col-span-1" />
      </div>
      {sorted.map((session) => {
        const isActive = !session.ended_at && !(session as any).end_time;
        const isExpanded = expanded.has(session.session_id);
        const start = new Date((session as any).start_time || session.started_at || '');
        const dateStr = start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = start.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const itemsCount = (session as any).items_deployed?.length || 0;
        const connectionsCount = (session as any).connections_created?.length || 0;
        const notes = (session as any).notes || '—';
        return (
          <div key={session.session_id} className="border-t border-default-200">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSessionClick(session)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSessionClick(session);
              }}
              className={`grid cursor-pointer grid-cols-2 gap-2 px-4 py-3 hover:bg-default-50 sm:grid-cols-12 ${
                isActive ? 'bg-primary-50/40' : ''
              }`}
            >
              <div className="col-span-2 flex items-center gap-2">
                {isActive && (
                  <Chip color="primary" size="sm" variant="flat">
                    Active
                  </Chip>
                )}
                <span className="text-sm font-medium text-foreground">
                  {truncateSessionId(session.session_id)}
                </span>
              </div>
              <div className="col-span-2 text-sm">
                <div className="text-foreground">{dateStr}</div>
                <div className="text-xs text-default-500">{timeStr}</div>
              </div>
              <div className="col-span-2 text-sm text-foreground">
                {isActive ? (
                  <span className="text-primary">In progress</span>
                ) : (
                  formatDuration((session as any).duration_seconds)
                )}
              </div>
              <div className="col-span-1 text-sm text-foreground">{itemsCount}</div>
              <div className="col-span-2 text-sm text-foreground">{connectionsCount}</div>
              <div className="col-span-2 truncate text-sm text-default-500">{notes}</div>
              <div className="col-span-1 flex justify-end">
                {connectionsCount > 0 && (
                  <button
                    aria-label="Expand connections"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(session.session_id);
                    }}
                    className="text-default-500"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
              </div>
            </div>
            {isExpanded && <ConnectionsDetail session={session} />}
          </div>
        );
      })}
    </div>
  );
}
