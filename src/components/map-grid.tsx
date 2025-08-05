'use client';

import { CircleUserRound, Shield } from 'lucide-react';

// Mock data for tokens. In a real app, this would come from props/state management.
const mockTokens = [
  { id: 'pc1', x: 5, y: 5, type: 'PC' },
  { id: 'enemy1', x: 10, y: 8, type: 'Enemy' },
  { id: 'pc2', x: 7, y: 12, type: 'PC' },
];

export function MapGrid({ showGrid }: { showGrid: boolean }) {
  const cellSize = 40; 

  return (
    <div className="w-full h-full bg-card/50 rounded-lg shadow-inner flex items-center justify-center relative overflow-auto cursor-crosshair">
      {/* Grid Lines */}
      {showGrid && (
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundSize: `${cellSize}px ${cellSize}px`,
            backgroundImage: `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`
          }}
        ></div>
      )}
      
      {/* Map Content (walls, floors etc would be rendered here) */}
      <div className="absolute inset-0">
        <div data-ai-hint="dungeon wall" className="absolute bg-foreground/70" style={{ left: 200, top: 200, width: 40, height: 160 }}></div>
      </div>

      {/* Tokens Layer */}
      <div className="absolute inset-0">
        {mockTokens.map(token => (
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
