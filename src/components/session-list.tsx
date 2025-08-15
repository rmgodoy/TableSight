
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { GameState } from './gm-view';

type SessionInfo = {
  id: string;
  lastModified: number;
};

export function SessionList() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchSessions = () => {
      const foundSessions: SessionInfo[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tabletop-alchemist-session-')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const gameState: GameState = JSON.parse(item);
              foundSessions.push({
                id: key.replace('tabletop-alchemist-session-', ''),
                lastModified: gameState.lastModified || new Date(0).getTime(),
              });
            }
          } catch (e) {
            console.error(`Failed to parse session data for key ${key}`, e);
          }
        }
      }
      
      foundSessions.sort((a, b) => b.lastModified - a.lastModified);
      setSessions(foundSessions);
    };

    fetchSessions();
    // Also listen for storage changes to update list if a session is deleted in another tab
    window.addEventListener('storage', fetchSessions);
    return () => window.removeEventListener('storage', fetchSessions);
  }, []);

  const deleteSession = (sessionId: string) => {
    if (window.confirm(`Are you sure you want to delete session "${sessionId}"? This cannot be undone.`)) {
      localStorage.removeItem(`tabletop-alchemist-session-${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
    }
  };
  
  const resumeSession = (sessionId: string) => {
    router.push(`/gm#${sessionId}`);
  }

  if (sessions.length === 0) {
    return null; // Don't render anything if there are no sessions
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Saved Sessions</CardTitle>
        <CardDescription>Continue one of your previous adventures.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {sessions.map(session => (
            <li key={session.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div>
                <p className="font-semibold text-primary">{session.id}</p>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(session.lastModified).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                 <Button onClick={() => resumeSession(session.id)}>
                    Continue Session
                </Button>
                <Button variant="destructive" size="icon" onClick={() => deleteSession(session.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
