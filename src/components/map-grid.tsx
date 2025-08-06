
'use client';

import { CircleUserRound, Shield } from 'lucide-react';
import type { Token, Tool, Path, Point } from './gm-view';
import { cn } from '@/lib/utils';
import React, { useState, useRef, useEffect, useMemo } from 'react';

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
  playerZoom?: number;
  playerPan?: { x: number, y: number };
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
  playerZoom,
  playerPan,
}: MapGridProps) {
  const cellSize = 40; 
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingToken, setDraggingToken] = useState<Token | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  
  const activeZoom = isPlayerView ? (playerZoom ?? 1) : zoom;
  const activePan = isPlayerView ? (playerPan ?? { x: 0, y: 0 }) : pan;

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
      x: (e.clientX - rect.left - activePan.x) / activeZoom,
      y: (e.clientY - rect.top - activePan.y) / activeZoom,
    };
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - activePan.x, y: e.clientY - activePan.y };
        e.preventDefault();
        return;
    }
    
    if (isPlayerView) return;

    if (e.button === 1 || (e.button === 0 && (e.altKey || e.metaKey || e.ctrlKey))) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - activePan.x, y: e.clientY - activePan.y };
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
     if (isPanning && onPanChange) {
      onPanChange({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }
    if (isPlayerView) return;

    if (!isDrawing) return;
    setCurrentPath(prevPath => [...prevPath, getTransformedPoint(e)]);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if(isPanning) {
        setIsPanning(false);
        return;
    }
    
    if (isPlayerView) return;

    if (isDrawing && currentPath.length > 0) {
      onNewPath({ 
          points: currentPath, 
          color: brushColor,
          width: brushSize,
          blocksLight: selectedTool === 'wall'
      });
    }
    setIsDrawing(false);
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
            panStartRef.current = { x: -activePan.x, y: -activePan.y };
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
  }, [isPanning, activePan]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (onZoomChange) {
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          const rect = containerRef.current!.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
          
          if(onPanChange) {
            const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
            const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
            onPanChange({x: newPanX, y: newPanY});
          }
          
          onZoomChange(newZoom);
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
  
  const wallSegments = useMemo(() => paths
    .filter(p => p.blocksLight)
    .flatMap(path => {
        const segments: { a: Point, b: Point, width: number }[] = [];
        for (let i = 0; i < path.points.length - 1; i++) {
            segments.push({ a: path.points[i], b: path.points[i+1], width: path.width });
        }
        return segments;
  }), [paths]);

  const lightPolygons = useMemo(() => {
      if (!isPlayerView) return [];
      
      const visibilityBoundary = {
          width: mapDimensions.width / activeZoom,
          height: mapDimensions.height / activeZoom
      };
      
      const boundarySegments = [
          ...wallSegments,
      ];

      return tokens.filter(t => t.torch.enabled && t.visible).map(token => {
          const lightSource = { 
              x: token.x * cellSize + cellSize / 2, 
              y: token.y * cellSize + cellSize / 2 
          };
          const torchRadiusInPixels = token.torch.radius * cellSize;
          return calculateVisibilityPolygon(lightSource, boundarySegments, visibilityBoundary, torchRadiusInPixels);
      });
  }, [isPlayerView, tokens, wallSegments, mapDimensions, activeZoom, cellSize]);

  const MapContent = ({ forPlayer, revealed }: { forPlayer: boolean, revealed: boolean }) => {
    let renderPaths = paths;
    if (forPlayer && !revealed) {
      // In the fog, don't show any paths
      renderPaths = [];
    } else if (forPlayer && revealed) {
      // In the light, show all paths
      renderPaths = paths;
    }
    
    let renderTokens = tokens;
    if (forPlayer && !revealed) {
      // In the fog, only show PCs
      renderTokens = tokens.filter(t => t.type === 'PC');
    } else if (forPlayer && revealed) {
      // In the light, show all visible tokens
      renderTokens = tokens.filter(t => t.visible);
    }
    
    return (
        <>
            {showGrid && <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundPosition: `0 0`,
                    backgroundSize: `${cellSize}px ${cellSize}px`,
                    backgroundImage: `linear-gradient(to right, hsl(var(--border) / ${revealed ? 1 : 0.3}) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / ${revealed ? 1 : 0.3}) 1px, transparent 1px)`
                }}
            ></div>}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {renderPaths.map((path, i) => (
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
                {!forPlayer && isDrawing && currentPath.length > 0 && (
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
                {renderTokens.map(token => (
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
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full h-full relative",
        isPlayerView ? 'bg-black' : 'bg-background',
        isPanning ? "cursor-grabbing" : "cursor-grab",
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
          if (!isPlayerView && isDrawing) handleMouseUp(e);
          if (isPanning) setIsPanning(false);
      }}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      >
      
      {isPlayerView ? (
        <>
            {/* Base layer (dimmed, always visible) */}
            <div 
                className='absolute inset-0 origin-top-left'
                style={{ 
                    transform: `scale(${activeZoom}) translate(${activePan.x / activeZoom}px, ${activePan.y / activeZoom}px)`,
                }}
            >
                <MapContent forPlayer={true} revealed={false} />
            </div>
            
            {/* Revealed layer (bright, masked) */}
            <div 
                className="absolute inset-0 origin-top-left"
                style={{
                  transform: `scale(${activeZoom}) translate(${activePan.x / activeZoom}px, ${activePan.y / activeZoom}px)`,
                  mask: `url(#fog-mask)`,
                  WebkitMask: 'url(#fog-mask)',
                }}
            >
              <div className="absolute inset-0 bg-background">
                 <MapContent forPlayer={true} revealed={true} />
              </div>
            </div>
            
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <mask id="fog-mask">
                  <rect x={-activePan.x/activeZoom} y={-activePan.y/activeZoom} width={`${100/activeZoom}%`} height={`${100/activeZoom}%`} fill="black" />
                   <g>
                      {lightPolygons.map((poly, i) => (
                          poly.length > 0 && <path key={i} d={`M ${poly.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} fill="white" />
                      ))}
                   </g>
                </mask>
              </defs>
            </svg>
        </>
      ) : (
          <div
            className="absolute inset-0 origin-top-left"
            style={{
                transform: `scale(${activeZoom}) translate(${activePan.x / activeZoom}px, ${activePan.y / activeZoom}px)`,
            }}
          >
              <MapContent forPlayer={false} revealed={true} />
          </div>
      )}
    </div>
  );
}

    
