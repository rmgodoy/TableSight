
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapGrid } from '@/components/map-grid';
import { Eye } from 'lucide-react';
import type { GameState, Path, Token, EraseMode } from './gm-view';

export default function PlayerView({ sessionId }: { sessionId: string }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cellSize, setCellSize] = useState(40);
  const storageKey = `tabletop-alchemist-session-${sessionId}`;

  const applyState = useCallback((savedState: string | null) => {
    if (!savedState) return;
    try {
      const gameState: GameState = JSON.parse(savedState);
      // Backwards compatibility
      const updatedTokens = (gameState.tokens || []).map(t => ({
        ...t,
        type: t.type || (t.id.startsWith('pc-') ? 'PC' : 'Enemy'),
        size: t.size || 1,
        torch: t.torch || { enabled: false, radius: 5 }
      }));
       const loadedPaths = (gameState.paths || []).map(p => ({
            ...p,
            id: p.id || `path-${Math.random()}` 
       }));

      setTokens(updatedTokens);
      setPaths(loadedPaths);
      setBackgroundImage(gameState.backgroundImage || null);
      setZoom(gameState.playerZoom || 1);
      setPan(gameState.playerPan || { x: 0, y: 0 });
      setCellSize(gameState.cellSize || 40);
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
          backgroundImage={backgroundImage}
          cellSize={cellSize}
          onMapClick={() => {}} 
          onNewPath={() => {}}
          onEraseLine={() => {}}
          onEraseBrush={() => {}}
          onTokenTorchToggle={() => {}}
          selectedTool="select" 
          eraseMode={'line'}
          isPlayerView={true}
          zoom={zoom}
          pan={pan}
        />
      </div>
    </div>
  );
}
