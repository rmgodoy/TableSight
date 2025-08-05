'use client';

import { MapGrid } from '@/components/map-grid';
import { Eye } from 'lucide-react';

export default function PlayerView({ sessionId }: { sessionId: string }) {
  return (
    <div className="w-screen h-dvh bg-black relative">
      <MapGrid showGrid={true} />
      <div className="absolute top-4 left-4 bg-background/80 text-foreground p-3 rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-sm border border-border">
        <Eye className="text-primary" />
        <div>
          <h1 className="font-bold">Player View</h1>
          <p className="text-xs text-muted-foreground">Session ID: {sessionId}</p>
        </div>
      </div>
    </div>
  );
}
