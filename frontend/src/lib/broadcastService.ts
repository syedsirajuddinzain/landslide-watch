import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface LiveEmergencyAlert {
  id: string;
  title: string;
  locationName: string;
  district: string;
  state: string;
  radiusKm: number;
  message: string;
  level: 'CRITICAL' | 'HIGH';
  timestamp: string;
  sender: string;
  coordinates: { lat: number; lon: number };
}

type AlertCallback = (alert: LiveEmergencyAlert) => void;

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('emergency_cell_broadcast_live');
  }
} catch {}

// Play loud acoustic siren on mobile / desktop
export function playEmergencySirenSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.6);
    osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.9);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 1.2);
    osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 2.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 2.0);

    // Vibrate device if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 800]);
    }
  } catch {}
}

// Authority transmits alert to EVERYONE globally
export async function transmitGlobalEmergencyAlert(alert: LiveEmergencyAlert): Promise<void> {
  // 1. Send to BroadcastChannel (instant same-network / tabs)
  try {
    broadcastChannel?.postMessage(alert);
  } catch {}

  // 2. Send to LocalStorage event
  try {
    localStorage.setItem('emergency_live_alert', JSON.stringify({ ...alert, _t: Date.now() }));
  } catch {}

  // 3. Send to Cloud Firestore (cross-device real-time sync for juries on any phone/network)
  try {
    await setDoc(doc(db, 'emergency_live', 'latest'), {
      ...alert,
      serverTime: new Date().toISOString(),
    });
  } catch {}
}

// Request native browser push notification permission
export async function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  }
}

// Every phone / device listens for incoming emergency alerts
export function subscribeToEmergencyBroadcasts(onAlertReceived: AlertCallback): () => void {
  const lastAlertId = { current: '' };

  const handleIncoming = (alert: LiveEmergencyAlert) => {
    if (!alert || !alert.id || alert.id === lastAlertId.current) return;
    lastAlertId.current = alert.id;

    // Trigger local siren
    playEmergencySirenSound();

    // Trigger native browser notification if allowed
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🚨 ${alert.title}`, {
          body: alert.message,
          icon: '/shield.png',
          tag: alert.id,
        });
      } catch {}
    }

    onAlertReceived(alert);
  };

  // 1. Listen to BroadcastChannel
  const handleBcMessage = (e: MessageEvent) => {
    if (e.data && e.data.id) {
      handleIncoming(e.data);
    }
  };
  broadcastChannel?.addEventListener('message', handleBcMessage);

  // 2. Listen to LocalStorage events
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'emergency_live_alert' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        handleIncoming(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 3. Listen to Firestore real-time updates (cross-device cloud WebSocket)
  let unsubscribeFirestore = () => {};
  try {
    let initialLoad = true;
    unsubscribeFirestore = onSnapshot(doc(db, 'emergency_live', 'latest'), (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return; // Don't trigger old alerts on page open
      }
      if (snapshot.exists()) {
        const data = snapshot.data() as LiveEmergencyAlert;
        handleIncoming(data);
      }
    });
  } catch {}

  return () => {
    broadcastChannel?.removeEventListener('message', handleBcMessage);
    window.removeEventListener('storage', handleStorageEvent);
    unsubscribeFirestore();
  };
}
