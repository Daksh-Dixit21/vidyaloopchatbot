const API_BASE = import.meta.env.VITE_API_URL || 'https://vidyaloop-backend.onrender.com';

export type SSECallback = {
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
};

export function generateSessionId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export async function streamChat(
  sessionId: string,
  message: string,
  callbacks: SSECallback,
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        student_name: 'Student',
        class_level: 11,
        learner_type: 'text',
      }),
    });

    if (!res.ok) {
      callbacks.onError(`Server error: ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token' && data.text) {
            callbacks.onToken(data.text);
          } else if (data.type === 'done') {
            callbacks.onDone();
          } else if (data.error) {
            callbacks.onError(data.error);
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    callbacks.onError(msg);
  }
}
