'use client';

import GmView from '@/components/gm-view';
import { useEffect, useState } from 'react';

export default function GMPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Reading the hash from the client-side only
    const hash = window.location.hash.substring(1);
    if (hash) {
      setSessionId(hash);
    } else {
      // Handle case where there's no session ID in the hash
      // Maybe redirect to home or show an error
      console.error("No session ID found in URL hash.");
    }
  }, []);

  if (!sessionId) {
    return <div>Loading session...</div>;
  }

  return <GmView sessionId={sessionId} />;
}
