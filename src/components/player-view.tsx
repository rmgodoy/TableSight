
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapGrid } from '@/components/map-grid';
import { Eye } from 'lucide-react';
import type { GameState, Path, Token, EraseMode } from './gm-view';

export default function PlayerView({ sessionId }: { sessionId: string }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const storageKey = `tabletop-alchemist-session-${sessionId}`;
  const [eraseMode, setEraseMode] = useState<EraseMode>('line');

  const applyState = useCallback((savedState: string | null) => {
    if (!savedState) return;
    try {
      const gameState: GameState = JSON.parse(savedState);
      // Backwards compatibility
      const updatedTokens = (gameState.tokens || []).map(t => ({
        ...t,
        size: t.size || 1,
        torch: t.torch || { enabled: false, radius: 5 }
      }));
       const loadedPaths = (gameState.paths || []).map(p => ({
            ...p,
            id: p.id || `path-${Math.random()}` 
       }));

      setTokens(updatedTokens);
      setPaths(loadedPaths);
      setZoom(gameState.playerZoom || 1);
      setPan(gameState.playerPan || { x: 0, y: 0 });
    } catch (error) {
      console.error("Failed to parse game state from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    // Initial load from localStorage
    const storageKey = `tabletop-alchemist-session-${sessionId}`;
    applyState(localStorage.getItem(storageKey));
    
    const listener = (event: StorageEvent) => {
        if (event.key === storageKey) {
          applyState(event.newValue);
        }
    };
    window.addEventListener('storage', listener);

    return () => {
      window.removeEventListener('storage', listener);
    };
  }, [sessionId, applyState]);

  const visibleTokens = tokens.filter(token => token.visible);

  return (
    <div className="w-screen h-dvh bg-black relative flex items-center justify-center overflow-hidden">
      <div className="w-full h-full">
        <MapGrid 
          showGrid={true} 
          tokens={visibleTokens}
          paths={paths}
          onMapClick={() => {}} 
          onNewPath={() => {}}
          onEraseLine={() => {}}
          onEraseBrush={() => {}}
          selectedTool="select" 
          eraseMode={eraseMode}
          isPlayerView={true}
          zoom={zoom}
          pan={pan}
        />
      </div>
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

    