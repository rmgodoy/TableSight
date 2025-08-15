
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapGrid } from '@/components/map-grid';
import { Eye } from 'lucide-react';
import type { GameState, Path, Token, EraseMode, DrawMode } from './gm-view';

export default function PlayerView({ sessionId }: { sessionId: string }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cellSize, setCellSize] = useState(40);
  const storageKey = `tablesight-session-${sessionId}`;
  const containerRef = useRef<HTMLDivElement>(null);


  const applyState = useCallback((savedState: string | null) => {
    if (!savedState) return;
    try {
      const gameState: GameState = JSON.parse(savedState);
      
      // If player view is frozen, don't apply any updates
      if (gameState.isPlayerViewFrozen) {
          return;
      }

      // Backwards compatibility
      const updatedTokens = (gameState.tokens || []).map(t => ({
        ...t,
        type: t.type || (t.id.startsWith('pc-') ? 'PC' : 'Enemy'),
        size: t.size || 1,
        torch: t.torch || { enabled: false, radius: 5 },
        hp: t.hp || (t.type === 'Enemy' ? { current: 10, max: 10 } : undefined),
      }));
       const loadedPaths = (gameState.paths || []).map(p => ({
            ...p,
            id: p.id || `path-${Math.random()}`,
            isPortal: p.isPortal || false,
            isHiddenWall: p.isHiddenWall || false,
            points: p.points && p.points.length > 0 && Array.isArray(p.points[0]) ? p.points : [p.points || []],
            isClosed: p.isClosed !== undefined ? p.isClosed : (p.tool !== 'draw') // Backwards compatibility
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
    const storageKey = `tablesight-session-${sessionId}`;
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

  // Effect to save viewport dimensions to localStorage
  useEffect(() => {
        const updateViewportInStorage = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const savedState = localStorage.getItem(storageKey);
                if (savedState) {
                    try {
                        const gameState: GameState = JSON.parse(savedState);
                        gameState.playerViewport = { width: clientWidth, height: clientHeight };
                        localStorage.setItem(storageKey, JSON.stringify(gameState));
                    } catch (error) {
                        console.error("Could not update player viewport in storage", error);
                    }
                }
            }
        };

        const debouncedUpdate = setTimeout(updateViewportInStorage, 500);
        window.addEventListener('resize', updateViewportInStorage);

        return () => {
            clearTimeout(debouncedUpdate);
            window.removeEventListener('resize', updateViewportInStorage);
        };
    }, [storageKey]);

  return (
    <div ref={containerRef} className="w-screen h-dvh bg-black relative flex items-center justify-center overflow-hidden">
      <div className="w-full h-full">
        <MapGrid 
          showGrid={true} 
          snapToGrid={false}
          smartMode={false}
          tokens={tokens}
          paths={paths}
          backgroundImage={backgroundImage}
          cellSize={cellSize}
          onMapClick={() => {}} 
          onNewPath={() => {}}
          onEraseLine={() => {}}
          onEraseBrush={() => {}}
          onTokenTorchToggle={() => {}}
          onPortalToggle={() => {}}
          selectedTool="select"
          drawMode="wall"
          eraseMode={'line' as EraseMode}
          isPlayerView={true}
          zoom={zoom}
          pan={pan}
        />
      </div>
    </div>
  );
}
