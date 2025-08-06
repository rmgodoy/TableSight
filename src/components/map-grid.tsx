
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
  brushSize?: number;
}

function getSvgPathFromPoints(points: Point[]) {
  if (points.length === 0) return '';
  return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
}

function getIntersection(ray_p1: Point, ray_p2: Point, seg_p1: Point, seg_p2: Point): Point | null {
    const r_px = ray_p1.x;
    const r_py = ray_p1.y;
    const r_dx = ray_p2.x - ray_p1.x;
    const r_dy = ray_p2.y - ray_p1.y;

    const s_px = seg_p1.x;
    const s_py = seg_p1.y;
    const s_dx = seg_p2.x - seg_p1.x;
    const s_dy = seg_p2.y - seg_p1.y;

    const r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy);
    const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);

    if (r_dx / r_mag === s_dx / s_mag && r_dy / r_mag === s_dy / s_mag) {
        // PARALLEL
        return null;
    }

    const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / (s_dx * r_dy - s_dy * r_dx);
    const T1 = (s_px + s_dx * T2 - r_px) / r_dx;

    // Epsilon to handle floating point issues
    const epsilon = 1e-6;

    if (T1 >= -epsilon && (T2 >= -epsilon && T2 <= 1 + epsilon)) {
        return {
            x: r_px + r_dx * T1,
            y: r_py + r_dy * T1
        };
    }

    return null;
}

function calculateVisibilityPolygon(
  lightSource: Point,
  segments: { a: Point; b: Point, width: number }[],
  mapBounds: { width: number; height: number },
  radius: number
): Point[] {
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
        const rayEnd = { x: lightSource.x + dx, y: lightSource.y + dy };

        let closestIntersection: Point | null = null;
        let minDistance = Infinity;
        let segmentWidth = 0;

        for (const segment of segments) {
            const intersection = getIntersection(lightSource, rayEnd, segment.a, segment.b);
            if (intersection) {
                const distance = Math.hypot(intersection.x - lightSource.x, intersection.y - lightSource.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIntersection = intersection;
                    segmentWidth = segment.width;
                }
            }
        }
        
        let intersectPoint: Point;

        if (closestIntersection) {
            // Heuristic to account for wall thickness: move the intersection point away from the light source
            const pushAwayDist = segmentWidth / 2;
            minDistance += pushAwayDist;
        }

        if (minDistance > radius) {
            intersectPoint = {
                x: lightSource.x + dx * radius,
                y: lightSource.y + dy * radius,
            };
        } else {
             intersectPoint = {
                x: lightSource.x + dx * minDistance,
                y: lightSource.y + dy * minDistance,
            };
        }

        intersects.push(intersectPoint);
    }

    intersects.sort((a, b) => {
        const angleA = Math.atan2(a.y - lightSource.y, a.x - lightSource.x);
        const angleB = Math.atan2(b.y - lightSource.y, b.x - lightSource.x);
        return angleA - angleB;
    });

    return intersects;
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
  brushSize = 10,
}: MapGridProps) {
  const cellSize = 40; 
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingToken, setDraggingToken] = useState<Token | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

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

    if (selectedTool === 'wall' || selectedTool === 'detail') {
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
    if (isPlayerView || !isDrawing || (selectedTool !== 'wall' && selectedTool !== 'detail')) return;
    setCurrentPath(prevPath => [...prevPath, getPointFromEvent(e)]);
  };

  const handleMouseUp = () => {
    if (isPlayerView || !isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
        onNewPath({ 
            points: currentPath, 
            color: brushColor,
            width: brushSize,
            blocksLight: selectedTool === 'wall'
        });
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

  const wallSegments = paths
    .filter(p => p.blocksLight)
    .flatMap(path => {
        const segments: { a: Point, b: Point, width: number }[] = [];
        for (let i = 0; i < path.points.length - 1; i++) {
            segments.push({ a: path.points[i], b: path.points[i+1], width: path.width });
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
            'cursor-cell': selectedTool === 'wall' || selectedTool === 'detail',
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
      
      {/* Container for masked elements */}
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
                    strokeWidth={path.width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
            {isDrawing && currentPath.length > 0 && (
                <path 
                    d={getSvgPathFromPoints(currentPath)} 
                    stroke={brushColor}
                    strokeWidth={brushSize}
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
                const torchRadiusInPixels = token.torch.radius * cellSize;
                
                const boundarySegments = [
                    ...wallSegments,
                    // Add map boundaries as segments
                    { a: { x: 0, y: 0 }, b: { x: mapDimensions.width, y: 0 }, width: 0 },
                    { a: { x: mapDimensions.width, y: 0 }, b: { x: mapDimensions.width, y: mapDimensions.height }, width: 0 },
                    { a: { x: mapDimensions.width, y: mapDimensions.height }, b: { x: 0, y: mapDimensions.height }, width: 0 },
                    { a: { x: 0, y: mapDimensions.height }, b: { x: 0, y: 0 }, width: 0 },
                ];

                const visibilityPolygon = calculateVisibilityPolygon(lightSource, boundarySegments, mapDimensions, torchRadiusInPixels);
                
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
    

    


