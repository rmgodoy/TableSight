'use client';

import PlayerView from '@/components/player-view';
import { useEffect, useState } from 'react';

export default function PlayerPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Reading the hash from the client-side only
    const hash = window.location.hash.substring(1);
    if (hash) {
      setSessionId(hash);
    } else {
      // Handle case where there's no session ID in the hash
      console.error("No session ID found in URL hash.");
    }
  }, []);

  if (!sessionId) {
    return <div>Loading session...</div>;
  }

  return <PlayerView sessionId={sessionId} />;
}
