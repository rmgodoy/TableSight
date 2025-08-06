
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapGrid } from '@/components/map-grid';
import { Eye } from 'lucide-react';
import type { GameState, Path, Token } from './gm-view';

export default function PlayerView({ sessionId }: { sessionId: string }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const storageKey = `tabletop-alchemist-session-${sessionId}`;

  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === storageKey && event.newValue) {
      try {
        const newState: GameState = JSON.parse(event.newValue);
        // Backwards compatibility for old states without torch
        const updatedTokens = (newState.tokens || []).map(t => ({
          ...t,
          torch: t.torch || { enabled: false, radius: 5 }
        }));
        setTokens(updatedTokens);
        setPaths(newState.paths || []);
      } catch (error) {
        console.error("Failed to parse game state from localStorage", error);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    // Initial load from localStorage
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const gameState: GameState = JSON.parse(savedState);
         // Backwards compatibility for old states without torch
        const updatedTokens = (gameState.tokens || []).map(t => ({
          ...t,
          torch: t.torch || { enabled: false, radius: 5 }
        }));
        setTokens(updatedTokens);
        setPaths(gameState.paths || []);
      }
    } catch (error) {
        console.error("Failed to load game state from localStorage", error);
    }
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [storageKey, handleStorageChange]);

  const visibleTokens = tokens.filter(token => token.visible);

  return (
    <div className="w-screen h-dvh bg-black relative">
      <MapGrid 
        showGrid={true} 
        tokens={visibleTokens}
        paths={paths}
        onMapClick={() => {}} 
        onNewPath={() => {}}
        onErase={() => {}}
        selectedTool="select" 
        isPlayerView={true}
      />
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
