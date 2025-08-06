
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
  zoom?: number;
  pan?: { x: number; y: number };
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
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
        let intersectionWidth = 0;

        for (const segment of segments) {
            const intersection = getIntersection(lightSource, rayEnd, segment.a, segment.b);
            if (intersection) {
                const distance = Math.hypot(intersection.x - lightSource.x, intersection.y - lightSource.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIntersection = intersection;
                    intersectionWidth = segment.width;
                }
            }
        }
        
        let intersectPoint: Point;

        if (closestIntersection) {
            const pushAwayDist = intersectionWidth / 2;
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
  zoom = 1,
  pan = { x: 0, y: 0 },
  onZoomChange,
  onPanChange,
}: MapGridProps) {
  const cellSize = 40; 
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingToken, setDraggingToken] = useState<Token | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateMapDimensions = () => {
        if (containerRef.current) {
            setMapDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    };
    
    updateMapDimensions();
    window.addEventListener('resize', updateMapDimensions);
    return () => window.removeEventListener('resize', updateMapDimensions);
  }, []);

  const getTransformedPoint = (e: React.MouseEvent<HTMLDivElement> | MouseEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView) return;
    
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle-click or Alt+Left-click for panning
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.preventDefault();
        return;
    }
    
    const point = getTransformedPoint(e);

    if (selectedTool === 'wall' || selectedTool === 'detail') {
      setIsDrawing(true);
      setCurrentPath([point]);
    } else if (selectedTool === 'erase') {
        onErase(point);
    } else if (selectedTool === 'add-pc' || selectedTool === 'add-enemy') {
        const gridX = Math.floor(point.x / cellSize);
        const gridY = Math.floor(point.y / cellSize);
        onMapClick(gridX, gridY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView) return;
     if (isPanning && onPanChange) {
      onPanChange({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (!isDrawing || (selectedTool !== 'wall' && selectedTool !== 'detail')) return;
    setCurrentPath(prevPath => [...prevPath, getTransformedPoint(e)]);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView) {
      setIsPanning(false);
      return;
    };
    
    if(isPanning) {
        setIsPanning(false);
        return;
    }

    if (!isDrawing) return;
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
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggingToken || !onTokenMove) return;
    // We don't update position during drag for performance, only on drop
  };

  const handleGlobalMouseUp = (e: MouseEvent) => {
    if (!draggingToken || !onTokenMove) return;

    const point = getTransformedPoint(e);
    // Snap to grid
    const x = Math.floor(point.x / cellSize);
    const y = Math.floor(point.y / cellSize);

    onTokenMove(draggingToken.id, x, y);
    setDraggingToken(null);
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
  }, [draggingToken, pan, zoom]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if(e.key === ' ' && !isPanning) {
            e.preventDefault();
            setIsPanning(true);
            if(containerRef.current) {
                // This is a bit of a hack to get the initial mouse position
                // We don't have the event here, so we assume (0,0) and adjust on first move
                panStartRef.current = { x: 0 - pan.x, y: 0 - pan.y };
            }
        }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
          if(e.key === ' ') {
              setIsPanning(false);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      }
  }, [isPanning, pan.x, pan.y]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (onZoomChange) {
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          onZoomChange(Math.max(0.1, Math.min(5, zoom + delta)));
      }
  }

  const renderToken = (token: Token) => {
    return (
       <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white/50 shadow-lg bg-cover bg-center"
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

  const GridLines = () => (
    <div 
      className="absolute inset-0 pointer-events-none opacity-30"
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

  const MapContent = () => (
    <>
      {showGrid && <GridLines />}
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
      <div className="absolute inset-0">
        {tokens.map(token => (
            <div 
            key={token.id}
            onMouseDown={(e) => handleTokenMouseDown(e, token)}
            className={cn(
                "absolute flex items-center justify-center transition-opacity duration-100 ease-in-out",
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
    </>
  );

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full h-full relative overflow-hidden bg-background",
        isPanning && "cursor-grabbing",
        !isPlayerView && !isPanning && {
            'cursor-crosshair': selectedTool === 'add-pc' || selectedTool === 'add-enemy',
            'cursor-grab': selectedTool === 'select' && !draggingToken,
            'cursor-grabbing': selectedTool === 'select' && draggingToken,
            'cursor-cell': selectedTool === 'wall' || selectedTool === 'detail',
            'cursor-help': selectedTool === 'erase',
        }
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={(e) => {
          if (isDrawing) handleMouseUp(e);
          if (isPanning) setIsPanning(false);
      }}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on middle-click
      >
      
      {/* SVG mask for player view fog of war */}
      {isPlayerView && (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <mask id="fog-mask">
              <rect x="-1000vw" y="-1000vh" width="2000vw" height="2000vh" fill="black" />
              {tokens.filter(t => t.torch.enabled && t.visible).map(token => {
                const lightSource = { 
                    x: token.x * cellSize + cellSize / 2, 
                    y: token.y * cellSize + cellSize / 2 
                };
                const torchRadiusInPixels = token.torch.radius * cellSize;
                
                const visibilityBoundary = {
                    width: mapDimensions.width / zoom,
                    height: mapDimensions.height / zoom
                };
                
                const boundarySegments = [
                    ...wallSegments.filter(s => s.width > 0),
                    { a: { x: -10000, y: -10000 }, b: { x: 10000, y: -10000 }, width: 0 },
                    { a: { x: 10000, y: -10000 }, b: { x: 10000, y: 10000 }, width: 0 },
                    { a: { x: 10000, y: 10000 }, b: { x: -10000, y: 10000 }, width: 0 },
                    { a: { x: -10000, y: 10000 }, b: { x: -10000, y: -10000 }, width: 0 },
                ];

                const visibilityPolygon = calculateVisibilityPolygon(lightSource, boundarySegments, visibilityBoundary, torchRadiusInPixels);
                
                if (visibilityPolygon.length === 0) return null;

                return (
                    <g key={`${token.id}-torch`}>
                      <path d={`M ${visibilityPolygon.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} fill="white" />
                    </g>
                );
              })}
            </mask>
          </defs>
        </svg>
      )}

      <div 
        className="absolute inset-0 origin-top-left"
        style={{ 
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          mask: isPlayerView ? 'url(#fog-mask)' : 'none',
          WebkitMask: isPlayerView ? 'url(#fog-mask)' : 'none',
        }}
      >
        <MapContent />
      </div>

    </div>
  );
}
