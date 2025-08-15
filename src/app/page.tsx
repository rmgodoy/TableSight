
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SessionList } from '@/components/session-list';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import type { GameState } from '@/components/gm-view';

export default function Home() {
  const router = useRouter();
  const [sessionName, setSessionName] = useState('');

  const createNewSession = () => {
    const newSessionId = Math.random().toString(36).substring(2, 11);
    
    // Create the initial state in localStorage so the name is available immediately
    const initialState: GameState = {
        sessionName: sessionName.trim() || `Session ${newSessionId.substring(0, 4)}`,
        paths: [],
        tokens: [],
        lastModified: Date.now(),
        backgroundImage: null,
        cellSize: 40,
    };
    localStorage.setItem(`tablesight-session-${newSessionId}`, JSON.stringify(initialState));

    router.push(`/gm#${newSessionId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background text-foreground p-8">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="bg-primary/20 p-4 rounded-full mb-6">
            <div className="bg-primary/30 p-4 rounded-full">
                <Rocket className="h-12 w-12 text-primary" />
            </div>
        </div>
        <h1 className="text-5xl font-bold font-headline text-primary mb-2">TableSight</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Your digital companion for immersive, in-person tabletop RPGs. Create maps, manage tokens, and reveal the world to your players in real-time.
        </p>
      </div>
      
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Game Master</CardTitle>
            <CardDescription>Create a new adventure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              placeholder="Optional: Enter a session name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
            <Button size="lg" className="w-full" onClick={createNewSession}>
              Start a New Game Session
            </Button>
          </CardContent>
        </Card>

        <SessionList />
      </div>
       <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TableSight. All rights reserved.</p>
      </footer>
    </div>
  );
}
