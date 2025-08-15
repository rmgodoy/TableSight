
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { GameState } from './gm-view';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from './ui/scroll-area';

type SessionInfo = {
  id: string;
  name: string;
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
        if (key && key.startsWith('tablesight-session-')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const gameState: GameState = JSON.parse(item);
              const sessionId = key.replace('tablesight-session-', '');
              foundSessions.push({
                id: sessionId,
                name: gameState.sessionName || `Session ${sessionId.substring(0, 4)}`,
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
    window.addEventListener('storage', fetchSessions);
    return () => window.removeEventListener('storage', fetchSessions);
  }, []);

  const deleteSession = (sessionId: string) => {
    localStorage.removeItem(`tablesight-session-${sessionId}`);
    setSessions(currentSessions => currentSessions.filter(s => s.id !== sessionId));
  };
  
  const clearAllSessions = () => {
    sessions.forEach(session => {
        localStorage.removeItem(`tablesight-session-${session.id}`);
    });
    setSessions([]);
  }

  const resumeSession = (sessionId: string) => {
    router.push(`/gm#${sessionId}`);
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Your Saved Sessions</CardTitle>
            <CardDescription>Continue one of your previous adventures.</CardDescription>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">Clear all</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete all your saved sessions. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllSessions}>
                    Delete All
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            <ul className="space-y-4 pr-6">
            {sessions.map(session => (
                <li key={session.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div>
                    <p className="font-semibold text-primary">{session.name}</p>
                    <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(session.lastModified).toLocaleString()}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => resumeSession(session.id)}>
                        Resume Session
                    </Button>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the session "{session.name}". This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSession(session.id)}>
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
                </li>
            ))}
            </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
