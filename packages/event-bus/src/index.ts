type Handler<T = unknown> = (payload: T) => void | Promise<void>;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on<T = unknown>(event: string, handler: Handler<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: Handler<T>): void {
    this.listeners.get(event)?.delete(handler as Handler);
  }

  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    await Promise.all([...handlers].map((h) => h(payload)));
  }

  once<T = unknown>(event: string, handler: Handler<T>): void {
    const wrapper: Handler<T> = async (payload) => {
      this.off(event, wrapper);
      await handler(payload);
    };
    this.on(event, wrapper);
  }
}

export const eventBus = new EventBus();
export type { Handler };
