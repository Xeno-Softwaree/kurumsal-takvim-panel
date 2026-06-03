import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '../api/http';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead as apiMarkAllRead,
  type NotificationDto,
} from '../api/notifications';

const RECONNECT_DELAY_MS = 5_000;   // wait 5 s before reconnecting after error
const FALLBACK_POLL_MS   = 30_000;  // polling interval when SSE is unavailable

export function useSSENotifications(token: string | null) {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [sseConnected,  setSseConnected]  = useState(false);

  const esRef          = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer      = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef     = useRef(true);

  // ── Load initial data ──────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!token) return;
    try {
      const [list, unread] = await Promise.all([
        getNotifications({ limit: 8 }),
        getUnreadNotificationCount(),
      ]);
      if (!mountedRef.current) return;
      setNotifications(list || []);
      setUnreadCount(unread?.count || 0);
    } catch {
      // silently ignore — SSE will keep data fresh
    }
  }, [token]);

  // ── Append a new notification received via SSE ─────────────────────────────
  const handleNewNotification = useCallback((raw: string) => {
    try {
      const data = JSON.parse(raw) as Partial<NotificationDto>;
      setNotifications((prev) => {
        // Deduplicate by id if it somehow contains one
        if (data.id && prev.some((n) => n.id === data.id)) return prev;
        const next: NotificationDto = {
          id: data.id ?? Date.now(),
          admin_id: data.admin_id ?? 0,
          action: data.action ?? '',
          entity_type: data.entity_type ?? null,
          entity_id: data.entity_id ?? null,
          payload: data.payload
            ? typeof data.payload === 'string'
              ? data.payload
              : JSON.stringify(data.payload)
            : null,
          is_read: false,
          created_at: data.created_at ?? new Date().toISOString(),
        };
        // Keep list trimmed to 8 items (matching the initial load limit)
        return [next, ...prev].slice(0, 8);
      });
      setUnreadCount((c) => c + 1);
    } catch {
      // malformed SSE data — ignore
    }
  }, []);

  // ── Open SSE connection ────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!token || !mountedRef.current) return;

    // Close any existing connection first
    esRef.current?.close();

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', () => {
      if (!mountedRef.current) return;
      setSseConnected(true);
      // Stop fallback polling if SSE is working
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    });

    es.addEventListener('notification', (e: MessageEvent) => {
      if (!mountedRef.current) return;
      handleNewNotification(e.data);
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      setSseConnected(false);
      es.close();
      esRef.current = null;

      // Start fallback polling while SSE is down
      if (!pollTimer.current) {
        pollTimer.current = setInterval(loadInitial, FALLBACK_POLL_MS);
      }

      // Attempt to reconnect after a delay
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, RECONNECT_DELAY_MS);
    };
  }, [token, handleNewNotification, loadInitial]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (!token) return;

    loadInitial();
    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [token]); // only re-run when token changes

  // ── Public actions ─────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    await apiMarkAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  return {
    notifications,
    unreadCount,
    sseConnected,
    markAllRead,
    reload: loadInitial,
  };
}
