
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
  brushColor?: string;
}

function getSvgPathFromPoints(points: Point[]) {
  if (points.length === 0) return '';
  return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
}

// Helper function to calculate the visibility polygon
function calculateVisibilityPolygon(lightSource: Point, segments: { a: Point, b: Point }[], mapBounds: { width: number, height: number }): Point[] {
    const allPoints: Point[] = [];
    for (const segment of segments) {
        allPoints.push(segment.a, segment.b);
    }
    allPoints.push({ x: 0, y: 0 });
    allPoints.push({ x: mapBounds.width, y: 0 });
    allPoints.push({ x: mapBounds.width, y: mapBounds.height });
    allPoints.push({ x: 0, y: mapBounds.height });

    const uniquePoints = allPoints.reduce((acc, p) => {
        if (!acc.find(ap => ap.x === p.x && ap.y === p.y)) {
            acc.push(p);
        }
        return acc;
    }, [] as Point[]);

    const uniqueAngles: number[] = [];
    for (const point of uniquePoints) {
        const angle = Math.atan2(point.y - lightSource.y, point.x - lightSource.x);
        uniqueAngles.push(angle, angle - 1e-5, angle + 1e-5);
    }
    
    const intersects: Point[] = [];
    for (const angle of uniqueAngles) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        let closestIntersection: Point | null = null;
        let minDistance = Infinity;

        for (const segment of segments) {
            const intersection = getIntersection(lightSource, { x: lightSource.x + dx, y: lightSource.y + dy }, segment.a, segment.b);
            if (intersection) {
                const distance = Math.hypot(intersection.x - lightSource.x, intersection.y - lightSource.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIntersection = intersection;
                }
            }
        }
        if (closestIntersection) {
            intersects.push(closestIntersection);
        }
    }

    intersects.sort((a, b) => {
        const angleA = Math.atan2(a.y - lightSource.y, a.x - lightSource.x);
        const angleB = Math.atan2(b.y - lightSource.y, b.x - lightSource.x);
        return angleA - angleB;
    });

    return intersects;
}


function getIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
    const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
    if (d === 0) return null;
    const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d;
    const u = -((a2.x - a1.x) * (b1.y - a1.y) - (a2.y - a1.y) * (b1.x - a1.x)) / d;
    if (t >= 0 && u >= 0 && u <= 1) {
        return {
            x: a1.x + t * (a2.x - a1.x),
            y: a1.y + t * (a2.y - a1.y),
        };
    }
    return null;
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
  isPlayerView = false,
  brushColor = '#000000',
}: MapGridProps) {
  const cellSize = 40; 
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingToken, setDraggingToken] = useState<Token | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const strokeWidth = 4; // Should match the SVG stroke width

  useEffect(() => {
    if (gridRef.current) {
        setMapDimensions({
            width: gridRef.current.clientWidth,
            height: gridRef.current.clientHeight
        });
    }
    const handleResize = () => {
        if (gridRef.current) {
            setMapDimensions({
                width: gridRef.current.clientWidth,
                height: gridRef.current.clientHeight
            });
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        onNewPath({ points: currentPath, color: brushColor });
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

  const GridLines = ({ bright } : { bright?: boolean }) => (
    <div 
      className={cn(
        "absolute inset-0 pointer-events-none",
        bright ? "opacity-100" : "opacity-30"
      )}
      style={{ 
          backgroundSize: `${cellSize}px ${cellSize}px`,
          backgroundImage: `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`
      }}
    ></div>
  );

  const wallSegments = paths.flatMap(path => {
    const segments: { a: Point, b: Point }[] = [];
    for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i+1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const offsetX = (strokeWidth / 2) * Math.sin(angle);
        const offsetY = (strokeWidth / 2) * -Math.cos(angle);
        
        segments.push({
            a: { x: p1.x - offsetX, y: p1.y - offsetY },
            b: { x: p2.x - offsetX, y: p2.y - offsetY }
        });
        segments.push({
            a: { x: p1.x + offsetX, y: p1.y + offsetY },
            b: { x: p2.x + offsetX, y: p2.y + offsetY }
        });
    }
    return segments;
  });

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

      {/* Base Grid */}
      {showGrid && <GridLines bright={!isPlayerView} />}

      {/* This container holds the elements that will be masked */}
      <div 
        className="absolute inset-0"
        style={{
          mask: isPlayerView ? 'url(#fog-mask)' : 'none',
          WebkitMask: isPlayerView ? 'url(#fog-mask)' : 'none',
        }}
        >
        
        {/* Bright Grid (for revealed areas in player view) */}
        {showGrid && isPlayerView && <GridLines bright />}

        {/* Drawing Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {paths.map((path, i) => (
                <path 
                    key={i} 
                    d={getSvgPathFromPoints(path.points)} 
                    stroke={path.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
            {isDrawing && currentPath.length > 0 && (
                <path 
                    d={getSvgPathFromPoints(currentPath)} 
                    stroke={brushColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </svg>

      </div>
      
      {/* Tokens Layer (always visible, above drawings and grid) */}
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
              opacity: isPlayerView ? (token.visible ? 1 : 0) : 1
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

      {/* SVG mask for player view fog of war */}
      {isPlayerView && (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="fog-mask">
              {/* Start with black, which hides everything */}
              <rect width="100vw" height="100vh" fill="black" />
              
              {/* Add white polygons for each torch to reveal areas */}
              {tokens.filter(t => t.torch.enabled).map(token => {
                const lightSource = { 
                    x: token.x * cellSize + cellSize / 2, 
                    y: token.y * cellSize + cellSize / 2 
                };
                
                const visibilityPolygon = calculateVisibilityPolygon(lightSource, wallSegments, mapDimensions);
                
                if (visibilityPolygon.length === 0) return null;

                return <path key={`${token.id}-torch`} d={`M ${visibilityPolygon.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} fill="white" />;
              })}
            </mask>
          </defs>
        </svg>
      )}
    </div>
  );
}
    

    