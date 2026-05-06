import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../lib/socket';

export default function ChatPanel() {
  const messages = useTableStore((s) => s.chatMessages);
  const worldId = useTableStore((s) => s.worldId);
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    if (!input.trim() || !worldId || !user) return;
    getSocket().emit('chat:send', {
      worldId,
      userId: user.id,
      speaker: user.name,
      content: input.trim(),
      type: 'text',
    });
    setInput('');
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const typeColor: Record<string, string> = {
    text: 'text-gray-300',
    ooc: 'text-blue-400',
    roll: 'text-amber',
    system: 'text-gray-500 italic',
    whisper: 'text-purple-400',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center gap-2">
        <MessageSquare size={13} /> Chat
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-4">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-xs group">
            <span className="text-gray-500 mr-1.5">[{new Date(msg.createdAt).toLocaleTimeString()}]</span>
            <span className="text-amber font-semibold mr-1">{msg.speaker}:</span>
            <span className={typeColor[msg.type] ?? 'text-gray-300'}>{msg.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-obsidian-600">
        <div className="flex gap-2">
          <input
            className="input-dark flex-1 text-xs py-1.5"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="btn-primary px-3 py-1.5 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
