'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');

  const createNewSession = () => {
    const newSessionId = Math.random().toString(36).substring(2, 11);
    router.push(`/gm#${newSessionId}`);
  };

  const joinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionId) {
      router.push(`/player#${sessionId}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background text-foreground p-8">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="bg-primary/20 p-4 rounded-full mb-6">
            <div className="bg-primary/30 p-4 rounded-full">
                <Rocket className="h-12 w-12 text-primary" />
            </div>
        </div>
        <h1 className="text-5xl font-bold font-headline text-primary mb-2">Tabletop Alchemist</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Your digital companion for immersive, in-person tabletop RPGs. Create maps, manage tokens, and reveal the world to your players in real-time.
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Game Master</CardTitle>
            <CardDescription>Create and control the adventure.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full" onClick={createNewSession}>
              Start a New Game Session
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Player</CardTitle>
            <CardDescription>Join an existing game with a session ID.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinSession} className="flex flex-col gap-4">
              <Input 
                placeholder="Enter Session ID" 
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                />
              <Button size="lg" type="submit" variant="secondary" className="w-full">
                Join Player View
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
       <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Tabletop Alchemist. All rights reserved.</p>
      </footer>
    </div>
  );
}
