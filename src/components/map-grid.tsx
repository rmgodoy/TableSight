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
  const [draggingToken, setDraggingToken] = useState<Token | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView || (selectedTool !== 'add-pc' && selectedTool !== 'add-enemy')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    onMapClick(x, y);
  };
  
  const handleTokenMouseDown = (e: React.MouseEvent<HTMLDivElement>, token: Token) => {
    if (isPlayerView || selectedTool !== 'select' || !onTokenMove) return;
    e.stopPropagation(); 
    setDraggingToken(token);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingToken || !gridRef.current || !onTokenMove) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!draggingToken || !gridRef.current || !onTokenMove) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    onTokenMove(draggingToken.id, x, y);
    setDraggingToken(null);
    setDragPosition(null);
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

  const renderToken = (token: Token, isPreview = false) => {
    return (
       <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white/50 shadow-lg bg-cover bg-center",
          isPreview && "scale-110"
        )}
        style={{ 
          backgroundColor: token.color, 
          backgroundImage: token.iconUrl ? `url(${token.iconUrl})` : 'none'
        }}
       >
         {!token.iconUrl && (
             token.type === 'PC' ? (
                 <CircleUserRound className="text-white/80" />
             ) : (
                 <Shield className="text-white/80" />
             )
         )}
       </div>
    );
  };


  return (
    <div 
      ref={gridRef}
      className={cn(
        "w-full h-full bg-card/50 rounded-lg shadow-inner flex items-center justify-center relative overflow-auto",
        (selectedTool === 'add-pc' || selectedTool === 'add-enemy') && "cursor-crosshair",
        draggingToken && "cursor-grabbing"
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
            onMouseDown={(e) => handleTokenMouseDown(e, token)}
            className={cn(
                "absolute flex items-center justify-center transition-opacity duration-100 ease-in-out",
                selectedTool === 'select' && !isPlayerView && "cursor-grab",
                draggingToken?.id === token.id && "opacity-50"
            )}
            style={{
              left: token.x * cellSize,
              top: token.y * cellSize,
              width: cellSize,
              height: cellSize,
            }}
          >
            {renderToken(token)}
          </div>
        ))}
      </div>

       {/* Floating token for drag preview */}
       {!isPlayerView && draggingToken && dragPosition && gridRef.current && (
        <div
          className="absolute flex items-center justify-center pointer-events-none z-20"
          style={{
            left: dragPosition.x - gridRef.current.getBoundingClientRect().left - (cellSize / 2),
            top: dragPosition.y - gridRef.current.getBoundingClientRect().top - (cellSize / 2),
            width: cellSize,
            height: cellSize,
          }}
        >
          {renderToken(draggingToken, true)}
        </div>
      )}

       {/* Fog of War Layer - This will be dynamic in the future */}
       { isPlayerView &&
         <div className="absolute inset-0 bg-black/80 pointer-events-none">
         </div>
       }
    </div>
  );
}
