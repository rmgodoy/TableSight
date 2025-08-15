
'use client';

import { CircleUserRound, Shield, Lightbulb, DoorClosed, DoorOpen, EyeOff } from 'lucide-react';
import type { Token, Tool, Path, EraseMode, DrawMode } from './gm-view';
import type { Point } from '@/lib/raycasting';
import { calculateVisibilityPolygon } from '@/lib/raycasting';
import { cn } from '@/lib/utils';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Badge } from './ui/badge';

type HpStatus = 'Unscathed' | 'Hurt' | 'Bloodied' | 'Near Death';

interface MapGridProps {
  showGrid: boolean;
  snapToGrid: boolean;
  tokens: Token[];
  paths: Path[];
  backgroundImage: string | null;
  cellSize: number;
  onMapClick: (x: number, y: number, isPixelCoords?: boolean) => void;
  onNewPath: (path: Omit<Path, 'id' | 'isPortal' | 'isHiddenWall'>) => void;
  onEraseLine: (point: Point) => void;
  onEraseBrush: (updatedPaths: Path[]) => void;
  onTokenTorchToggle: (tokenId: string) => void;
  onPortalToggle: (tokenId: string) => void;
  selectedTool: Tool;
  eraseMode: EraseMode;
  drawMode: DrawMode;
  onTokenMove?: (tokenId: string, x: number, y: number) => void;
  isPlayerView?: boolean;
  brushColor?: string;
  brushSize?: number;
  eraseBrushSize?: number;
  zoom?: number;
  pan?: { x: number; y: number };
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
  showFogOfWar?: boolean;
  hoveredTokenId?: string | null;
}

function getSvgPathFromPoints(rings: Point[][], scale: number = 1) {
    if (!rings || rings.length === 0) return '';
    
    return rings.map(ring => {
        if (ring.length === 0) return '';
        return `M ${ring[0].x * scale} ${ring[0].y * scale} ` + ring.slice(1).map(p => `L ${p.x * scale} ${p.y * scale}`).join(' ') + ' Z';
    }).join(' ');
}


export function MapGrid({ 
  showGrid, 
  snapToGrid,
  tokens, 
  paths,
  backgroundImage,
  cellSize,
  onMapClick, 
  onNewPath,
  onEraseLine,
  onEraseBrush,
  onTokenTorchToggle,
  onPortalToggle,
  selectedTool,
  eraseMode,
  drawMode,
  onTokenMove,
  isPlayerView = false,
  brushColor = '#000000',
  brushSize = 10,
  eraseBrushSize = 20,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onZoomChange,
  onPanChange,
  showFogOfWar = false,
  hoveredTokenId = null,
}: MapGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingToken, setDraggingToken] = useState<Token | null>(null);
  const [ghostPosition, setGhostPosition] = useState<Point | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [dropTargetCell, setDropTargetCell] = useState<Point | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingPortal, setIsDrawingPortal] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const isErasingRef = useRef(false);

  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  
  const [activeZoom, setActiveZoom] = useState(zoom);
  const [activePan, setActivePan] = useState(pan);

  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
  
  const drawingStartPoint = useRef<Point | null>(null);

  useEffect(() => {
    // For GM view, always sync with props
    if (!isPlayerView) {
      setActiveZoom(zoom);
      setActivePan(pan);
    }
  }, [isPlayerView, zoom, pan]);

  useEffect(() => {
    // For Player view, we only want to accept prop changes, not local ones
    if (isPlayerView) {
       setActiveZoom(zoom);
       setActivePan(pan);
    }
  }, [isPlayerView, zoom, pan]);
  
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
  
  const getSnappedPoint = useCallback((point: Point): Point => {
    if (!snapToGrid) return point;
    return {
      x: Math.round(point.x / cellSize) * cellSize,
      y: Math.round(point.y / cellSize) * cellSize,
    };
  }, [snapToGrid, cellSize]);


  const getTransformedPoint = (
    e: React.MouseEvent<HTMLDivElement> | MouseEvent, 
    applySnapping: boolean = true
  ): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left - activePan.x) / activeZoom,
      y: (e.clientY - rect.top - activePan.y) / activeZoom,
    };
    return (snapToGrid && applySnapping) ? getSnappedPoint(point) : point;
  }

  const getScreenPoint = (e: React.MouseEvent<HTMLDivElement> | MouseEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    };
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlayerView) return;

    if (e.button === 2 || (e.button === 0 && (e.altKey || e.metaKey || e.ctrlKey))) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - activePan.x, y: e.clientY - activePan.y };
        e.preventDefault();
        return;
    }
    
    const worldPoint = getTransformedPoint(e, false); // Get world coordinates without snapping
    const point = snapToGrid ? getSnappedPoint(worldPoint) : worldPoint;

    if (selectedTool === 'portal' || selectedTool === 'hidden-wall' || selectedTool === 'draw' || selectedTool === 'rectangle' || selectedTool === 'circle') {
        const drawingToolActive = selectedTool === 'portal' || selectedTool === 'hidden-wall' || selectedTool === 'draw' || selectedTool === 'rectangle' || selectedTool === 'circle';
        if (drawingToolActive) {
            setIsDrawing(true);
            drawingStartPoint.current = point;
            setCurrentPath([point]);
        }
    } else if (selectedTool === 'erase') {
        if (eraseMode === 'line') {
            onEraseLine(point);
        } else {
            isErasingRef.current = true;
            eraseWithBrush(point);
        }
    } else if (selectedTool === 'add-pc' || selectedTool === 'add-enemy') {
        const gridX = Math.floor(worldPoint.x / cellSize);
        const gridY = Math.floor(worldPoint.y / cellSize);
        onMapClick(gridX, gridY);
    } else if (selectedTool === 'add-light') {
        onMapClick(point.x, point.y, true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlayerView) {
        setCursorPosition(getScreenPoint(e));
    }
    
    if (isPlayerView) return;

    if (isPanning && onPanChange) {
      const newPan = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      };
      onPanChange(newPan);
      return;
    }

    const point = getTransformedPoint(e);

    if (isDrawing && drawingStartPoint.current) {
        if(selectedTool === 'draw') {
             setCurrentPath(prevPath => [...prevPath, point]);
        } else if (selectedTool === 'portal' || selectedTool === 'hidden-wall') {
            setCurrentPath([drawingStartPoint.current, point]);
        } else if(selectedTool === 'rectangle') {
            const start = drawingStartPoint.current;
            setCurrentPath([
                start,
                { x: point.x, y: start.y },
                point,
                { x: start.x, y: point.y },
                start
            ]);
        } else if(selectedTool === 'circle') {
            const start = drawingStartPoint.current;
            const radius = Math.hypot(point.x - start.x, point.y - start.y);
            const circlePoints: Point[] = [];
            const segments = 60; // More segments for a smoother circle
            for(let i=0; i <= segments; i++) {
                const angle = (i / segments) * 2 * Math.PI;
                circlePoints.push({
                    x: start.x + radius * Math.cos(angle),
                    y: start.y + radius * Math.sin(angle),
                });
            }
            setCurrentPath(circlePoints);
        }
    } else if (isErasingRef.current && eraseMode === 'brush') {
        eraseWithBrush(point);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if(isPanning) {
        setIsPanning(false);
        return;
    }
    
    if (isPlayerView) return;
    
    if (isDrawing && currentPath.length > 1) {
      onNewPath({ 
          points: [currentPath], // Wrap points in another array for the new data structure
          color: selectedTool === 'portal' ? '#ff00ff' : (selectedTool === 'hidden-wall' ? '#000000' : brushColor),
          width: brushSize,
          blocksLight: drawMode === 'wall'
      });
    }
    setIsDrawing(false);
    setCurrentPath([]);
    drawingStartPoint.current = null;
    isErasingRef.current = false;
  };

  const eraseWithBrush = useCallback((erasePoint: Point) => {
    const distanceSq = (p1: Point, p2: Point) => (p1.x - p2.x)**2 + (p1.y - p2.y)**2;

    const newPaths: Path[] = [];
    let changed = false;

    paths.forEach(path => {
        // This simplified logic doesn't handle splitting paths with holes well.
        // For now, we erase the whole path if any point is touched. A more complex solution is needed for partial erase.
        let pathErased = false;
        for (const ring of path.points) {
            for (const point of ring) {
                if (distanceSq(point, erasePoint) <= (eraseBrushSize / activeZoom)**2) {
                    pathErased = true;
                    break;
                }
            }
            if(pathErased) break;
        }

        if (pathErased) {
            changed = true;
        } else {
            newPaths.push(path);
        }
    });

    if(changed) {
        onEraseBrush(newPaths);
    }
  }, [paths, eraseBrushSize, onEraseBrush, activeZoom]);


  const handleTokenMouseDown = (e: React.MouseEvent<HTMLDivElement>, token: Token) => {
    if (isPlayerView || !onTokenMove) return;
    e.stopPropagation(); 
    
    if (token.type === 'Light' && selectedTool === 'select') {
        onTokenTorchToggle(token.id);
        return;
    }
    if (token.type === 'Portal' && selectedTool === 'select') {
        onPortalToggle(token.id);
        return;
    }
    if (selectedTool !== 'select' || token.type === 'Light' || token.type === 'Portal') return;
    
    setDraggingToken(token);
    // Use non-snapped points for smooth drag offset calculation
    const point = getTransformedPoint(e, false);
    setDragOffset({
        x: point.x - (token.x * cellSize),
        y: point.y - (token.y * cellSize),
    });
    setGhostPosition({ x: token.x * cellSize, y: token.y * cellSize });
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggingToken || !onTokenMove || !dragOffset) return;
    // Use non-snapped points for smooth ghost positioning
    const point = getTransformedPoint(e, false);
    const ghostX = point.x - dragOffset.x;
    const ghostY = point.y - dragOffset.y;
    setGhostPosition({ x: ghostX, y: ghostY });
    
    // Calculate the snapped drop position for the visual indicator
    const dropX = Math.round((ghostX) / cellSize);
    const dropY = Math.round((ghostY) / cellSize);
    setDropTargetCell({ x: dropX, y: dropY });
  };
  
  const handleGlobalMouseUp = (e: MouseEvent) => {
    if (!draggingToken || !onTokenMove || !dragOffset) return;
    
    // Use non-snapped points for final calculation
    const point = getTransformedPoint(e, false);
    const ghostX = point.x - dragOffset.x;
    const ghostY = point.y - dragOffset.y;
    
    // Snap the final position to the grid
    const x = Math.round(ghostX / cellSize);
    const y = Math.round(ghostY / cellSize);

    onTokenMove(draggingToken.id, x, y);
    setDraggingToken(null);
    setGhostPosition(null);
    setDragOffset(null);
    setDropTargetCell(null);
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
  }, [draggingToken, pan, zoom, dragOffset]);

  useEffect(() => {
    const handleSpacebarPan = (e: KeyboardEvent) => {
        if(isPlayerView) return;
        if(e.key === ' ' && !isPanning) {
            e.preventDefault();
            setIsPanning(true);
        }
    };
    const handleSpacebarUp = (e: KeyboardEvent) => {
        if(isPlayerView) return;
        if(e.key === ' ' && isPanning) {
            setIsPanning(false);
        }
    };
    window.addEventListener('keydown', handleSpacebarPan);
    window.addEventListener('keyup', handleSpacebarUp);
    return () => {
        window.removeEventListener('keydown', handleSpacebarPan);
        window.removeEventListener('keyup', handleSpacebarUp);
    }
  }, [isPanning, isPlayerView]);


  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (isPlayerView || !onZoomChange || !onPanChange) return;
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const rect = containerRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newZoom = Math.max(0.1, Math.min(5, activeZoom + delta));
      
      const newPanX = mouseX - (mouseX - activePan.x) * (newZoom / activeZoom);
      const newPanY = mouseY - (mouseY - activePan.y) * (newZoom / activeZoom);
      const newPan = {x: newPanX, y: newPanY};
      
      onPanChange(newPan);
      onZoomChange(newZoom);
  }

  const getHpStatus = (token: Token): HpStatus | null => {
    if (!token.hp || token.type !== 'Enemy') return null;

    const percent = (token.hp.current / token.hp.max) * 100;
    if (percent >= 100) return 'Unscathed';
    if (percent > 75) return 'Hurt';
    if (percent > 25) return 'Bloodied';
    return 'Near Death';
  }

  const renderToken = (token: Token) => {
    const portalWall = paths.find(p => p.id === token.controls);
    const isHovered = !isPlayerView && hoveredTokenId === token.id;
    const hpStatus = getHpStatus(token);
    
    const iconContent = () => {
        if (token.type === 'Light') {
          return <Lightbulb className={cn("text-white/80 transition-colors w-full h-full", token.torch.enabled && "text-yellow-300")}/>
        }
        if (token.type === 'Portal') {
          return portalWall?.blocksLight ? <DoorClosed className="text-red-300 w-full h-full" /> : <DoorOpen className="text-green-300 w-full h-full"/>;
        }
        if (token.iconUrl) return null;
        if (token.type === 'PC') {
            return <CircleUserRound className="text-white/80 w-full h-full" />;
        }
        if (token.type === 'Enemy') {
            return <Shield className="text-white/80 w-full h-full" />;
        }
        return null;
    }

    const isHiddenEnemy = !isPlayerView && token.type === 'Enemy' && !token.visible;
    const hpRingColor = useMemo(() => {
        if (!isPlayerView || hpStatus === 'Unscathed' || !hpStatus) return 'ring-white/50';
        switch (hpStatus) {
            case 'Hurt': return 'ring-yellow-500';
            case 'Bloodied': return 'ring-orange-500';
            case 'Near Death': return 'ring-red-600';
            default: return 'ring-white/50';
        }
    }, [isPlayerView, hpStatus]);


    return (
      <div className="relative w-full h-full">
        <div
            className={cn(
            "relative rounded-full flex items-center justify-center ring-2 shadow-lg bg-cover bg-center w-full h-full",
            hpRingColor,
            (token.type === 'Light' || token.type === 'Portal') && 'cursor-pointer'
            )}
            style={{ 
            backgroundColor: (token.type === 'Light' || token.type === 'Portal') ? 'transparent' : token.color, 
            backgroundImage: token.iconUrl ? `url(${token.iconUrl})` : 'none',
            }}
        >
            {isHovered && (token.type === 'PC' || token.type === 'Enemy') && (
                <div className="absolute inset-0 bg-primary/30 rounded-full" />
            )}
            {iconContent()}
            {isHiddenEnemy && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <EyeOff className="w-1/2 h-1/2 text-white/70"/>
            </div>
            )}
            {isHovered && (
            <div 
                className="absolute -inset-1 rounded-full border-4 border-primary animate-pulse"
                style={{ animationDuration: '1.2s' }}
            />
            )}
        </div>
       </div>
    );
  };
  
  const wallSegments = useMemo(() => {
    const segments: { a: Point, b: Point, width: number }[] = [];
     paths
        .filter(p => p.blocksLight)
        .forEach(path => {
            path.points.forEach(ring => {
                for (let i = 0; i < ring.length; i++) {
                    segments.push({ 
                        a: ring[i], 
                        b: ring[(i + 1) % ring.length], // Connect last point to first
                        width: path.width 
                    });
                }
            });
        });
    return segments;
  }, [paths]);

  const screenSpaceLightPolygons = useMemo(() => {
      if (!isPlayerView && !showFogOfWar) return [];
      
      const lightTokens = tokens.filter(t => isPlayerView ? t.visible || t.type === 'Light' : true);

      return lightTokens.filter(t => t.torch.enabled).map(token => {
          let lightSource: Point;
          
          if (token.type === 'PC' || token.type === 'Enemy') {
               const tokenPixelSize = token.size * cellSize;
              lightSource = { 
                  x: (token.x * cellSize + tokenPixelSize / 2), 
                  y: (token.y * cellSize + tokenPixelSize / 2)
              };
          } else {
             // For Light and Portal tokens, position is already in pixels
             lightSource = {
                 x: token.x,
                 y: token.y
             }
          }

          const torchRadiusInPixels = token.torch.radius * cellSize;
          
          const screenSpaceSegments = wallSegments.map(seg => ({
              a: { x: seg.a.x * activeZoom + activePan.x, y: seg.a.y * activeZoom + activePan.y },
              b: { x: seg.b.x * activeZoom + activePan.x, y: seg.b.y * activeZoom + activePan.y },
              width: seg.width * activeZoom
          }));
          
          const transformedLightSource = {
              x: lightSource.x * activeZoom + activePan.x,
              y: lightSource.y * activeZoom + activePan.y
          }

          const screenBounds = { 
              width: containerRef.current?.clientWidth || 0, 
              height: containerRef.current?.clientHeight || 0 
          };

          return calculateVisibilityPolygon(transformedLightSource, screenSpaceSegments, screenBounds, torchRadiusInPixels * activeZoom);
      });
  }, [isPlayerView, showFogOfWar, tokens, wallSegments, activePan, activeZoom, cellSize]);

  const isBrushToolActive = !isPlayerView && (selectedTool === 'draw' || selectedTool === 'portal' || selectedTool === 'hidden-wall' || (selectedTool === 'erase' && eraseMode === 'brush'));
  const currentBrushSize = selectedTool === 'erase' ? eraseBrushSize : brushSize;

  const MapContent = () => {
    let renderTokens = tokens;
    if (isPlayerView) {
      renderTokens = tokens.filter(t => t.visible && t.type !== 'Light' && t.type !== 'Portal');
    }
    
    let renderPaths = paths;
    if (isPlayerView) {
        renderPaths = paths.filter(p => {
            // Don't render portals
            if (p.isPortal) return false;
            // Don't render open hidden walls
            if (p.isHiddenWall && !p.blocksLight) return false;
            return true;
        });
    }
    
    return (
        <div 
          className='absolute inset-0 origin-top-left'
          style={{ 
              transform: `translate(${activePan.x}px, ${activePan.y}px) scale(${activeZoom})`,
              transformOrigin: '0 0'
          }}
        >
            {backgroundImage && (
                <img src={backgroundImage} className="absolute top-0 left-0 pointer-events-none w-auto h-auto max-w-none max-h-none" alt="Game Map Background" onDragStart={(e) => e.preventDefault()}/>
            )}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {renderPaths.map((path) => {
                    const isShape = selectedTool === 'rectangle' || selectedTool === 'circle';
                    const pathD = getSvgPathFromPoints(path.points, 1);
                    return (
                        <path
                            key={path.id}
                            d={pathD}
                            stroke={path.color}
                            strokeWidth={path.width}
                            fill={isShape ? 'rgba(0,0,0,0.5)' : 'none'}
                            fillRule="evenodd"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={(path.isPortal || path.isHiddenWall) ? '10,10' : undefined}
                            className={cn((path.isPortal || path.isHiddenWall) && !path.blocksLight && "opacity-50")}
                        />
                    )
                })}
                {!isPlayerView && isDrawing && currentPath.length > 0 && (
                    <path
                        d={getSvgPathFromPoints([currentPath])}
                        stroke={selectedTool === 'portal' ? '#ff00ff' : (selectedTool === 'hidden-wall' ? '#000000' : brushColor)}
                        strokeWidth={brushSize}
                        fill={selectedTool === 'rectangle' || selectedTool === 'circle' ? 'rgba(0,0,0,0.5)' : 'none'}
                        fillRule="evenodd"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={(selectedTool === 'portal' || selectedTool === 'hidden-wall') ? '10,10' : undefined}
                    />
                )}
            </svg>
            <div className="absolute inset-0">
                {dropTargetCell && !isPlayerView && draggingToken && (
                  <div
                    className="absolute bg-primary/20 border-2 border-dashed border-primary"
                    style={{
                      left: dropTargetCell.x * cellSize,
                      top: dropTargetCell.y * cellSize,
                      width: draggingToken.size * cellSize,
                      height: draggingToken.size * cellSize,
                    }}
                  />
                )}
                {renderTokens.map(token => {
                    const visualSizeFactor = 0.9;
                    let tokenSize, tokenPos;

                    if (token.type === 'PC' || token.type === 'Enemy') {
                        const baseSize = token.size * cellSize;
                        tokenSize = baseSize * visualSizeFactor;
                        const offset = (baseSize - tokenSize) / 2;
                        tokenPos = {
                            x: token.x * cellSize + offset,
                            y: token.y * cellSize + offset,
                        };
                    } else { // Light or Portal
                        tokenSize = cellSize * visualSizeFactor;
                        tokenPos = {
                            x: token.x - (tokenSize / 2),
                            y: token.y - (tokenSize / 2),
                        };
                    }

                    return (
                        <div
                            key={token.id}
                            onMouseDown={(e) => handleTokenMouseDown(e, token)}
                            className={cn(
                                "absolute flex items-center justify-center",
                                isPlayerView ? "transition-[left,top] duration-300 ease-in-out" : "transition-opacity duration-100 ease-in-out",
                                draggingToken?.id === token.id && "opacity-50"
                            )}
                            style={{
                                left: tokenPos.x,
                                top: tokenPos.y,
                                width: tokenSize,
                                height: tokenSize,
                            }}
                        >
                            {renderToken(token)}
                        </div>
                    )
                })}
                {!isPlayerView && draggingToken && ghostPosition && (
                    <div
                        className="absolute flex items-center justify-center opacity-50 pointer-events-none"
                        style={{
                            left: ghostPosition.x,
                            top: ghostPosition.y,
                            width: draggingToken.size * cellSize,
                            height: draggingToken.size * cellSize,
                        }}
                    >
                        {renderToken(draggingToken)}
                    </div>
                )}
            </div>
        </div>
    );
  };
  
  const GridLayer = ({ bright }: { bright: boolean }) => (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundPosition: `${activePan.x}px ${activePan.y}px`,
        backgroundSize: `${cellSize * activeZoom}px ${cellSize * activeZoom}px`,
        backgroundImage: bright
          ? `linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)`
          : `linear-gradient(to right, hsl(var(--border) / 0.2) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.2) 1px, transparent 1px)`,
      }}
    />
  );


  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full h-full relative overflow-hidden",
        isPlayerView ? "bg-transparent" : "bg-background",
         !isPlayerView && isPanning && "cursor-grabbing",
         !isPlayerView && !isPanning && {
            'cursor-crosshair': selectedTool === 'add-pc' || selectedTool === 'add-enemy' || selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'add-light',
            'cursor-default': selectedTool === 'select',
            'cursor-none': isBrushToolActive || selectedTool === 'draw' || selectedTool === 'portal' || selectedTool === 'hidden-wall',
            'cursor-not-allowed': selectedTool === 'erase' && eraseMode === 'line',
        }
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={(e) => {
          if (!isPlayerView) {
              setCursorPosition(null);
              if (isDrawing || isDrawingPortal) handleMouseUp(e);
              if (isErasingRef.current) isErasingRef.current = false;
          }
          if (isPanning) setIsPanning(false);
      }}
       onMouseEnter={e => {
            if (!isPlayerView) {
                setCursorPosition(getScreenPoint(e));
            }
       }}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      >
      
      {isPlayerView ? (
          <>
            <div className="absolute inset-0 bg-black/95">
              <GridLayer bright={false}/>
            </div>

            <div 
                className="absolute inset-0"
                style={{
                  mask: `url(#fog-mask)`,
                  WebkitMask: 'url(#fog-mask)',
                }}
            >
              <div className="absolute inset-0 bg-background">
                 <GridLayer bright={true} />
                 <MapContent />
              </div>
            </div>
            
             <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <mask id="fog-mask" maskContentUnits="userSpaceOnUse">
                        <rect x="0" y="0" width="100%" height="100%" fill="black" />
                         {screenSpaceLightPolygons.map((poly, i) => (
                            poly.length > 0 && <path key={i} d={`M ${poly.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} fill="white" />
                        ))}
                    </mask>
                </defs>
            </svg>
          </>
      ) : (
          <>
            {showGrid && <GridLayer bright={true} />}
            <MapContent />
            {isBrushToolActive && cursorPosition && (
                <div
                    className="absolute rounded-full bg-primary/20 border-2 border-primary pointer-events-none"
                    style={{
                        width: currentBrushSize * activeZoom,
                        height: currentBrushSize * activeZoom,
                        left: cursorPosition.x - (currentBrushSize * activeZoom / 2),
                        top: cursorPosition.y - (currentBrushSize * activeZoom / 2),
                        transformOrigin: 'center center',
                    }}
                />
            )}
            {showFogOfWar && (
              <div className='absolute inset-0 pointer-events-none'>
                <svg width="100%" height="100%">
                  <defs>
                    <mask id="gm-fog-mask">
                      <rect x="0" y="0" width="100%" height="100%" fill="white" />
                      {screenSpaceLightPolygons.map((poly, i) => (
                          poly.length > 0 && <path key={i} d={`M ${poly.map(p => `${p.x} ${p.y}`).join(' L ')} Z`} fill="black" />
                      ))}
                    </mask>
                  </defs>
                  <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#gm-fog-mask)" />
                </svg>
              </div>
            )}
          </>
      )}
    </div>
  );
}
