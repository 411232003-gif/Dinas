import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../../firebase/config';

function endpoint() {
  const configured = import.meta.env.VITE_ANDIN_WS_URL;
  const url = configured ? new URL(configured) : new URL('/api/andin/ws', window.location.href);
  if (!configured) url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (!['ws:', 'wss:'].includes(url.protocol) || (window.location.protocol === 'https:' && url.protocol !== 'wss:')) throw new Error('Alamat server game harus menggunakan WebSocket yang aman (wss).');
  return url.href;
}

export function useGameConnection(devIdentity) {
  const uid = devIdentity?.uid || auth.currentUser?.uid;
  const devName = devIdentity?.name;
  const [status, setStatus] = useState('connecting');
  const [world, setWorld] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [lobby, setLobby] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pendingAction, setPendingAction] = useState(false);
  const socketRef = useRef(null);
  const snapshotRef = useRef(null);
  const requests = useRef(new Map());
  const activeRoom = useRef(null);
  const actionLock = useRef(false);
  const readyRef = useRef(false);
  const inputRef = useRef({ x: 0, z: 0, run: false });

  const request = useCallback((type, fields = {}) => new Promise((resolve, reject) => {
    const socket = socketRef.current;
    if (!readyRef.current || socket?.readyState !== WebSocket.OPEN) { reject(new Error('Belum terhubung ke server game.')); return; }
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => {
      requests.current.delete(requestId);
      reject(new Error('Server belum merespons. Menghubungkan ulang untuk memeriksa progres terakhir.'));
      socket.close();
    }, 12000);
    requests.current.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ type, requestId, ...fields }));
  }), []);

  useEffect(() => {
    if (!uid) return;
    let stopped = false;
    let reconnect;
    let attempts = 0;
    let currentSocket;
    let authTimer;
    const key = `andin-session:${uid}`;
    try { activeRoom.current = JSON.parse(sessionStorage.getItem(key) || 'null'); }
    catch { activeRoom.current = null; }
    const failPending = () => {
      for (const item of requests.current.values()) {
        clearTimeout(item.timer);
        item.reject(new Error('Koneksi terputus. Progres akan diperiksa saat tersambung kembali.'));
      }
      requests.current.clear();
    };
    const connect = async () => {
      if (stopped) return;
      setStatus(attempts ? 'reconnecting' : 'connecting');
      try {
        const token = import.meta.env.DEV && devName ? `dev:${uid}:${devName}` : await auth.currentUser.getIdToken();
        if (stopped) return;
        currentSocket = new WebSocket(endpoint());
        const socket = currentSocket;
        socketRef.current = socket;
        authTimer = setTimeout(() => socket.close(), 12000);
        socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token }));
        socket.onmessage = (event) => {
          if (stopped || socket !== socketRef.current) return;
          let message;
          try { message = JSON.parse(event.data); }
          catch { return; }
          if (message.type === 'ready') {
            clearTimeout(authTimer);
            attempts = 0;
            readyRef.current = true;
            setStatus('connected');
            if (activeRoom.current) {
              request('join', activeRoom.current).catch((error) => {
                activeRoom.current = null;
                sessionStorage.removeItem(key);
                snapshotRef.current = null;
                setWorld(null);
                setNotice({ kind: 'error', text: error.message });
              });
            }
            request('list').catch(() => {});
          }
          if (message.state) {
            const next = message.type === 'frame' ? { ...snapshotRef.current, ...message.state } : message.state;
            snapshotRef.current = next;
            setWorld(next);
          }
          if (message.type === 'joined') {
            const player = message.state.players.find((item) => item.uid === uid);
            activeRoom.current = { roomId: message.state.id, role: player.role };
            sessionStorage.setItem(key, JSON.stringify(activeRoom.current));
            setLobby(null);
          }
          if (message.type === 'rooms') setRooms(message.rooms);
          if (message.type === 'lobby') setLobby(message.room);
          if (message.type === 'left') {
            snapshotRef.current = null;
            activeRoom.current = null;
            sessionStorage.removeItem(key);
            setWorld(null);
            setLobby(null);
            request('list').catch(() => {});
          }
          if (message.type === 'error') setNotice({ kind: 'error', text: message.message });
          if (message.type === 'ack' && message.message) setNotice({ kind: 'success', text: message.message });
          const waiting = requests.current.get(message.requestId);
          if (waiting) {
            clearTimeout(waiting.timer);
            requests.current.delete(message.requestId);
            if (message.type === 'error') waiting.reject(new Error(message.message));
            else waiting.resolve(message);
          }
        };
        socket.onerror = () => { if (!stopped) setNotice({ kind: 'error', text: 'Server game belum terjangkau. Periksa koneksi atau pastikan backend andin-multiplayer sudah berjalan.' }); };
        socket.onclose = () => {
          clearTimeout(authTimer);
          if (stopped || socket !== socketRef.current) return;
          readyRef.current = false;
          failPending();
          setStatus('reconnecting');
          attempts++;
          reconnect = setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(attempts - 1, 4)));
        };
      } catch (error) {
        if (!stopped) {
          setStatus('offline');
          setNotice({ kind: 'error', text: error.message });
          reconnect = setTimeout(connect, 10000);
        }
      }
    };
    connect();
    const movement = setInterval(() => {
      if (readyRef.current && activeRoom.current && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'input', input: inputRef.current }));
      }
    }, 100);
    const stopInput = () => { inputRef.current = { x: 0, z: 0, run: false }; };
    window.addEventListener('blur', stopInput);
    document.addEventListener('visibilitychange', stopInput);
    return () => {
      stopped = true;
      readyRef.current = false;
      clearTimeout(reconnect);
      clearTimeout(authTimer);
      clearInterval(movement);
      window.removeEventListener('blur', stopInput);
      document.removeEventListener('visibilitychange', stopInput);
      failPending();
      if (currentSocket?.readyState === WebSocket.OPEN) currentSocket.close();
      else if (currentSocket) currentSocket.onopen = () => currentSocket.close();
    };
  }, [uid, devName, request]);

  const runRequest = useCallback(async (type, fields) => {
    try { return await request(type, fields); }
    catch (error) { setNotice({ kind: 'error', text: error.message }); return null; }
  }, [request]);
  const act = useCallback(async (action) => {
    if (actionLock.current) return null;
    const player = snapshotRef.current?.players.find((item) => item.uid === uid);
    if (!player) return null;
    actionLock.current = true;
    setPendingAction(true);
    try { return await runRequest('action', { action: { ...action, seq: player.lastSeq + 1 } }); }
    finally { actionLock.current = false; setPendingAction(false); }
  }, [uid, runRequest]);
  const abandonRoom = useCallback(() => {
    activeRoom.current = null;
    snapshotRef.current = null;
    sessionStorage.removeItem(`andin-session:${uid}`);
    setWorld(null);
    setLobby(null);
    socketRef.current?.close();
  }, [uid]);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const clearLobby = useCallback(() => setLobby(null), []);
  return { uid, status, world, rooms, lobby, notice, pendingAction, inputRef, act, runRequest, dismissNotice, clearLobby, abandonRoom };
}
