'use client';

import { CircleUserRound, Shield } from 'lucide-react';
import type { Token, Tool } from './gm-view';
import { cn } from '@/lib/utils';

interface MapGridProps {
  showGrid: boolean;
  tokens: Token[];
  onMapClick: (x: number, y: number) => void;
  selectedTool: Tool;
}


export function MapGrid({ showGrid, tokens, onMapClick, selectedTool }: MapGridProps) {
  const cellSize = 40; 

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    onMapClick(x, y);
  };

  return (
    <div 
      className={cn(
        "w-full h-full bg-card/50 rounded-lg shadow-inner flex items-center justify-center relative overflow-auto",
        (selectedTool === 'add-pc' || selectedTool === 'add-enemy') && "cursor-crosshair"
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
      
      {/* Map Content (walls, floors etc would be rendered here) */}
      <div className="absolute inset-0 pointer-events-none">
        <div data-ai-hint="dungeon wall" className="absolute bg-foreground/70" style={{ left: 200, top: 200, width: 40, height: 160 }}></div>
      </div>

      {/* Tokens Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {tokens.map(token => (
          <div 
            key={token.id}
            className="absolute flex items-center justify-center transition-transform duration-200 ease-in-out"
            style={{
              left: token.x * cellSize,
              top: token.y * cellSize,
              width: cellSize,
              height: cellSize,
            }}
          >
            {token.type === 'PC' ? (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary-foreground shadow-lg">
                    <CircleUserRound className="text-primary-foreground" />
                </div>
            ) : (
                <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center ring-2 ring-destructive-foreground shadow-lg">
                    <Shield className="text-destructive-foreground" />
                </div>
            )}
          </div>
        ))}
      </div>

       {/* Fog of War Layer - simple overlay for now */}
       <div className="absolute inset-0 bg-black/80 pointer-events-none" style={{
           clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 20% 20%, 80% 20%, 80% 80%, 20% 80%, 20% 20%)'
       }}>
       </div>

    </div>
  );
}
