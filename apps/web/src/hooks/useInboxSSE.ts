'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { API_BASE, getAuthToken } from '@/lib/api';

interface SSEMessage {
  id: string;
  conversationId: string;
  senderType: 'client' | 'agent' | 'system';
  content: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface SSEStatus {
  conversationId: string;
  status: 'open' | 'closed' | 'transferred';
  assignedTo?: string;
}

export interface UseInboxSSEOptions {
  conversationId?: string;
  onMessage?: (msg: SSEMessage) => void;
  onStatus?: (status: SSEStatus) => void;
  onTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

/**
 * useInboxSSE — Conexión SSE al inbox en tiempo real.
 *
 * Pasa el JWT como query param (?token=) porque EventSource
 * no soporta custom headers en el navegador.
 *
 * Reconexión automática con backoff exponencial (max 30s).
 * Heartbeat: si no recibe ping en 60s, fuerza reconexión.
 */
export function useInboxSSE(options: UseInboxSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastPingRef = useRef(Date.now());

  const connect = useCallback(() => {
    if (esRef.current?.readyState === EventSource.OPEN) return;

    const token = getAuthToken();
    if (!token) {
      console.warn('[SSE] No auth token — skipping connection');
      return;
    }

    const url = new URL(`${API_BASE}/api/inbox/stream`);
    url.searchParams.set('token', token);
    if (options.conversationId) {
      url.searchParams.set('conversationId', options.conversationId);
    }

    const es = new EventSource(url.toString());
    esRef.current = es;

    es.addEventListener('connection', (e) => {
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      options.onConnect?.();
    });

    es.addEventListener('message', (e) => {
      const msg: SSEMessage = JSON.parse(e.data);
      setLastEvent('message');
      options.onMessage?.(msg);
    });

    es.addEventListener('status', (e) => {
      const status: SSEStatus = JSON.parse(e.data);
      setLastEvent('status');
      options.onStatus?.(status);
    });

    es.addEventListener('typing', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent('typing');
      options.onTyping?.(data);
    });

    es.addEventListener('ping', () => {
      lastPingRef.current = Date.now();
    });

    es.addEventListener('error', (e) => {
      setIsConnected(false);
      options.onError?.(e);
      es.close();

      // Backoff exponencial: 1s, 2s, 4s… max 30s
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30_000);
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    });
  }, [options.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heartbeat: si no hay ping en 60s → reconectar
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected && Date.now() - lastPingRef.current > 60_000) {
        console.warn('[SSE] No ping in 60s, reconnecting');
        esRef.current?.close();
        connect();
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [isConnected, connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      esRef.current?.close();
    };
  }, [connect]);

  return { isConnected, lastEvent };
}
