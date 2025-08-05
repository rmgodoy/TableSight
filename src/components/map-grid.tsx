'use client';

import { CircleUserRound, Shield } from 'lucide-react';
import type { Token, Tool } from './gm-view';
import { cn } from '@/lib/utils';
import React, { useState, useRef, useEffect } from 'react';

interface MapGridProps {
  showGrid: boolean;
  tokens: Token[];
  onMapClick: (x: number, y: number) => void;
  selectedTool: Tool;
  onTokenMove?: (tokenId: string, x: number, y: number) => void;
  isPlayerView?: boolean;
}

export function MapGrid({ 
  showGrid, 
  tokens, 
  onMapClick, 
  selectedTool,
  onTokenMove,
  isPlayerView = false
}: MapGridProps) {
  const cellSize = 40; 
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingToken, setDraggingToken] = useState<string | null>(null);

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView || (selectedTool !== 'add-pc' && selectedTool !== 'add-enemy')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    onMapClick(x, y);
  };
  
  const handleTokenMouseDown = (e: React.MouseEvent<HTMLDivElement>, tokenId: string) => {
    if (isPlayerView || selectedTool !== 'select' || !onTokenMove) return;
    e.stopPropagation(); // Prevent grid click event
    setDraggingToken(tokenId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingToken || !gridRef.current || !onTokenMove) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    // This provides a live-update effect while dragging, but can be performance intensive
    // For now, we only update on mouse up.
    // onTokenMove(draggingToken, x, y);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!draggingToken || !gridRef.current || !onTokenMove) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    onTokenMove(draggingToken, x, y);
    setDraggingToken(null);
  };

  useEffect(() => {
    if (draggingToken) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingToken]);


  return (
    <div 
      ref={gridRef}
      className={cn(
        "w-full h-full bg-card/50 rounded-lg shadow-inner flex items-center justify-center relative overflow-auto",
        (selectedTool === 'add-pc' || selectedTool === 'add-enemy') && "cursor-crosshair",
      )}
      onClick={handleGridClick}
      >
      {/* Grid Lines */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            backgroundSize: `${cellSize}px ${cellSize}px`,
            backgroundImage: `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`
          }}
        ></div>
      )}

      {/* Tokens Layer */}
      <div className="absolute inset-0">
        {tokens.map(token => (
          <div 
            key={token.id}
            onMouseDown={(e) => handleTokenMouseDown(e, token.id)}
            className={cn(
                "absolute flex items-center justify-center transition-transform duration-100 ease-in-out",
                selectedTool === 'select' && !isPlayerView && "cursor-grab",
                draggingToken === token.id && "cursor-grabbing scale-110 shadow-2xl z-10"
            )}
            style={{
              left: token.x * cellSize,
              top: token.y * cellSize,
              width: cellSize,
              height: cellSize,
              transform: `translate(0,0)`, // keep transform for smooth animations
            }}
          >
            {token.type === 'PC' ? (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary-foreground shadow-lg pointer-events-none">
                    <CircleUserRound className="text-primary-foreground" />
                </div>
            ) : (
                <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center ring-2 ring-destructive-foreground shadow-lg pointer-events-none">
                    <Shield className="text-destructive-foreground" />
                </div>
            )}
          </div>
        ))}
      </div>

       {/* Fog of War Layer - This will be dynamic in the future */}
       { isPlayerView &&
         <div className="absolute inset-0 bg-black/80 pointer-events-none">
         </div>
       }
    </div>
  );
}
