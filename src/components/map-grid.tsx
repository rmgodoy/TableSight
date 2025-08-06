
'use client';

import { CircleUserRound, Shield } from 'lucide-react';
import type { Token, Tool, Path, Point } from './gm-view';
import { cn } from '@/lib/utils';
import React, { useState, useRef, useEffect } from 'react';

interface MapGridProps {
  showGrid: boolean;
  tokens: Token[];
  paths: Path[];
  onMapClick: (x: number, y: number) => void;
  onNewPath: (path: Path) => void;
  onErase: (point: Point) => void;
  selectedTool: Tool;
  onTokenMove?: (tokenId: string, x: number, y: number) => void;
  isPlayerView?: boolean;
}

function getSvgPath(path: Path) {
  if (path.length === 0) return '';
  return `M ${path[0].x} ${path[0].y} ` + path.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
}

export function MapGrid({ 
  showGrid, 
  tokens, 
  paths,
  onMapClick, 
  onNewPath,
  onErase,
  selectedTool,
  onTokenMove,
  isPlayerView = false
}: MapGridProps) {
  const cellSize = 40; 
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingToken, setDraggingToken] = useState<Token | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Path>([]);

  const getPointFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent): Point => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const rect = gridRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView) return;

    if (selectedTool === 'brush') {
      setIsDrawing(true);
      setCurrentPath([getPointFromEvent(e)]);
    } else if (selectedTool === 'erase') {
        onErase(getPointFromEvent(e));
    } else if (selectedTool === 'add-pc' || selectedTool === 'add-enemy') {
        const rect = e.currentTarget.getBoundingClientRect();
        const gridX = Math.floor((e.clientX - rect.left) / cellSize);
        const gridY = Math.floor((e.clientY - rect.top) / cellSize);
        onMapClick(gridX, gridY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView || !isDrawing || selectedTool !== 'brush') return;
    setCurrentPath(prevPath => [...prevPath, getPointFromEvent(e)]);
  };

  const handleMouseUp = () => {
    if (isPlayerView || !isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
        onNewPath(currentPath);
    }
    setCurrentPath([]);
  };

  const handleTokenMouseDown = (e: React.MouseEvent<HTMLDivElement>, token: Token) => {
    if (isPlayerView || selectedTool !== 'select' || !onTokenMove) return;
    e.stopPropagation(); 
    setDraggingToken(token);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggingToken || !gridRef.current || !onTokenMove) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleGlobalMouseUp = (e: MouseEvent) => {
    if (!draggingToken || !gridRef.current || !onTokenMove) return;

    const rect = gridRef.current.getBoundingClientRect();
    // Snap to grid
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    onTokenMove(draggingToken.id, x, y);
    setDraggingToken(null);
    setDragPosition(null);
  };

  useEffect(() => {
    if (draggingToken) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
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
        "w-full h-full bg-card/50 rounded-lg shadow-inner flex items-center justify-center relative overflow-hidden",
        !isPlayerView && {
            'cursor-crosshair': selectedTool === 'add-pc' || selectedTool === 'add-enemy',
            'cursor-grab': draggingToken,
            'cursor-cell': selectedTool === 'brush',
            'cursor-help': selectedTool === 'erase',
        }
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // End drawing if mouse leaves canvas
      >
      {/* This container holds the elements that will be masked */}
      <div 
        className="absolute inset-0"
        style={{
          mask: isPlayerView ? 'url(#fog-mask)' : 'none',
          WebkitMask: isPlayerView ? 'url(#fog-mask)' : 'none',
        }}
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
        
        {/* Drawing Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {paths.map((path, i) => (
                <path 
                    key={i} 
                    d={getSvgPath(path)} 
                    stroke="hsl(var(--foreground))"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
            {isDrawing && currentPath.length > 0 && (
                <path 
                    d={getSvgPath(currentPath)} 
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </svg>

      </div>
      
      {/* Tokens Layer (always visible) */}
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

      {/* We need a separate SVG for the mask definition because some browsers (Safari) have issues with masks and sibling elements */}
      {isPlayerView && (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="fog-mask">
              {/* Start with black, which hides everything */}
              <rect width="100vw" height="100vh" fill="black" />
              {/* Add white circles for each torch to reveal areas */}
              {tokens.filter(t => t.torch.enabled).map(token => {
                const cx = token.x * cellSize + cellSize / 2;
                const cy = token.y * cellSize + cellSize / 2;
                const r = token.torch.radius * cellSize;
                return <circle key={token.id} cx={cx} cy={cy} r={r} fill="white" />;
              })}
            </mask>
          </defs>
        </svg>
      )}
    </div>
  );
}
    
