import { EventEmitter } from 'events';

const emitter = new EventEmitter();

export const internalEventBus = {
  emit(event: string, payload: unknown): void {
    emitter.emit(event, payload);
  },
  on(event: string, handler: (...args: unknown[]) => void): void {
    emitter.on(event, handler);
  },
};
