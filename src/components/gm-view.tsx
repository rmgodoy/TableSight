
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Grid, EyeOff, Brush, PenLine } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { GmSidebar } from '@/components/gm-sidebar';
import { TokenPanel } from '@/components/token-panel';
import { MapGrid } from '@/components/map-grid';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export type Tool = 'select' | 'wall' | 'detail' | 'erase' | 'add-pc' | 'add-enemy';

export type Point = { x: number; y: number };
export type Path = {
    points: Point[];
    color: string;
    width: number;
    blocksLight: boolean;
};

export type Token = {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'PC' | 'Enemy';
  visible: boolean;
  color: string;
  iconUrl?: string;
  size: number;
  torch: {
    enabled: boolean;
    radius: number;
  };
};

export type GameState = {
    tokens: Token[];
    paths: Path[];
    zoom?: number;
    pan?: { x: number, y: number };
    playerZoom?: number;
    playerPan?: { x: number, y: number };
};

const colorPalette = [
    '#000000', '#ef4444', '#f97316', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];


export default function GmView({ sessionId }: { sessionId: string }) {
    const [history, setHistory] = useState<(Path | Token)[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [showGrid, setShowGrid] = useState(true);
    const [selectedTool, setSelectedTool] = useState<Tool>('select');
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(10);
    const [tokens, setTokens] = useState<Token[]>([]);
    const [paths, setPaths] = useState<Path[]>([]);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [playerZoom, setPlayerZoom] = useState(1);
    const [playerPan, setPlayerPan] = useState({ x: 0, y: 0 });
    const [showFogOfWar, setShowFogOfWar] = useState(true);
    const { toast } = useToast();
    const storageKey = `tabletop-alchemist-session-${sessionId}`;


    const updateGameState = useCallback((newState: Partial<GameState> = {}) => {
        const fullState: GameState = { 
            tokens, 
            paths, 
            zoom, 
            pan,
            playerZoom,
            playerPan,
            ...newState 
        };
        try {
            localStorage.setItem(storageKey, JSON.stringify(fullState));
        } catch (error) {
            console.error("Failed to save game state to localStorage", error);
            toast({
                title: "Error",
                description: "Could not save game state. Your browser might be in private mode or storage is full.",
                variant: "destructive"
            });
        }
    }, [storageKey, toast, tokens, paths, zoom, pan, playerPan, playerZoom]);

    const addToHistory = (item: Path | Token | (Path | Token)[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const itemsToAdd = Array.isArray(item) ? item : [item];
        const finalHistory = [...newHistory, ...itemsToAdd];
        
        // A single action can result in multiple items, but should be one history step.
        // Let's wrap multi-item updates in a single history entry for simplicity of undo/redo
        if (Array.isArray(item)) {
             const updatedHistory = history.slice(0, historyIndex + 1);
             updatedHistory.push(...item);
             setHistory(updatedHistory);
             setHistoryIndex(updatedHistory.length -1);
        } else {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(item);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    }
    
    const setHistoryState = (items: (Path | Token)[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const nonPathItems = newHistory.filter(item => (item as any).id);
        const finalHistory = [...nonPathItems, ...items];
        setHistory(finalHistory);
        setHistoryIndex(finalHistory.length - 1);
    }

    const undo = useCallback(() => {
        if (historyIndex < 0) return;
        setHistoryIndex(prev => prev - 1);
    }, [historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex > history.length - 2) return;
        setHistoryIndex(prev => prev + 1);
    }, [history, historyIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    undo();
                } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [undo, redo]);

    useEffect(() => {
        const currentState = history.slice(0, historyIndex + 1);
        const newPaths: Path[] = [];
        const newTokens: Token[] = [];
        const tokenIds = new Set();
        
        // Iterate backwards to get the latest state of each token
        for(let i = currentState.length - 1; i >= 0; i--) {
            const item = currentState[i] as any;
            if(item.points) { // It's a path
                 if (!newPaths.some(p => JSON.stringify(p) === JSON.stringify(item))) {
                    newPaths.unshift(item);
                }
            } else if (item.id && !tokenIds.has(item.id)) { // It's a token
                newTokens.unshift(item as Token);
                tokenIds.add(item.id);
            }
        }

        setPaths(newPaths);
        setTokens(newTokens);
    }, [history, historyIndex]);
    
    // This effect synchronizes the local state to localStorage.
    // It's debounced to avoid excessive writes.
    useEffect(() => {
        const handler = setTimeout(() => {
            updateGameState();
        }, 500); // Debounce time in ms
        return () => clearTimeout(handler);
    }, [tokens, paths, zoom, pan, playerPan, playerZoom, updateGameState]);


    useEffect(() => {
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                const gameState: GameState = JSON.parse(savedState);
                const updatedTokens = (gameState.tokens || []).map(t => ({
                  ...t,
                  size: t.size || 1,
                  torch: t.torch || { enabled: false, radius: 5 }
                }));
                const updatedPaths = (gameState.paths || []).map(p => {
                    if (Array.isArray(p)) {
                        return { points: p, color: '#000000', width: 10, blocksLight: true };
                    }
                    if (typeof p.blocksLight === 'undefined') {
                        return { ...p, blocksLight: true };
                    }
                    if (typeof p.width === 'undefined') {
                        return { ...p, width: 10 };
                    }
                    return p;
                });
                
                const initialHistory = [...updatedPaths, ...updatedTokens];
                setHistory(initialHistory);
                setHistoryIndex(initialHistory.length -1);

                if (gameState.zoom) setZoom(gameState.zoom);
                if (gameState.pan) setPan(gameState.pan);
                if (gameState.playerZoom) setPlayerZoom(gameState.playerZoom);
                if (gameState.playerPan) setPlayerPan(gameState.playerPan);
            }
        } catch (error) {
            console.error("Failed to load game state from localStorage", error);
        }
    }, [storageKey]);

    const handleMapClick = (x: number, y: number) => {
        let newToken: Token | null = null;
        if (selectedTool === 'add-pc') {
            newToken = {
                id: `pc-${Date.now()}`,
                name: `PC ${tokens.filter(t => t.type === 'PC').length + 1}`,
                x, y, type: 'PC' as const, visible: true, color: '#3b82f6',
                size: 1,
                torch: { enabled: false, radius: 5 },
            };
        }
        if (selectedTool === 'add-enemy') {
            newToken = {
                id: `enemy-${Date.now()}`,
                name: `Enemy ${tokens.filter(t => t.type === 'Enemy').length + 1}`,
                x, y, type: 'Enemy' as const, visible: false, color: '#ef4444',
                size: 1,
                torch: { enabled: false, radius: 5 },
            };
        }
        if (newToken) {
            addToHistory(newToken);
        }
    };

    const handleNewPath = (path: Path) => {
        addToHistory(path);
    };

    const handleErase = (point: Point) => {
        const eraseRadius = 20; // This can be adjusted or made dynamic
        const currentPaths = history.filter(item => (item as any).points) as Path[];
        const currentTokens = history.filter(item => (item as any).id);

        const isPointInRadius = (p1: Point, p2: Point, radius: number) => {
             return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)) < radius;
        }

        const remainingPaths = currentPaths.filter(path => 
            !path.points.some(p => isPointInRadius(p, point, eraseRadius))
        );

        const newHistoryState = [...currentTokens, ...remainingPaths];
        setHistory(newHistoryState);
        setHistoryIndex(newHistoryState.length - 1);
    };


    const updateToken = (tokenId: string, updates: Partial<Token>) => {
        const currentToken = tokens.find(t => t.id === tokenId);
        if (currentToken) {
            addToHistory({ ...currentToken, ...updates });
        }
    };

    const handleTokenVisibilityChange = (tokenId: string, isVisible: boolean) => updateToken(tokenId, { visible: isVisible });
    const handleTokenDelete = (tokenId: string) => {
        const newHistory = history.filter((item: any) => item.id !== tokenId);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length -1);
    }
    const handleTokenMove = (tokenId: string, x: number, y: number) => updateToken(tokenId, { x, y });
    const handleTokenNameChange = (tokenId: string, newName: string) => updateToken(tokenId, { name: newName });
    const handleTokenColorChange = (tokenId: string, newColor: string) => updateToken(tokenId, { color: newColor });
    const handleTokenIconChange = (tokenId: string, newIconUrl: string) => updateToken(tokenId, { iconUrl: newIconUrl });
    const handleTokenSizeChange = (tokenId: string, size: number) => updateToken(tokenId, { size });
    const handleTokenTorchToggle = (tokenId: string) => {
        const token = tokens.find(t => t.id === tokenId);
        if(token) updateToken(tokenId, { torch: { ...token.torch, enabled: !token.torch.enabled } });
    }
    const handleTokenTorchRadiusChange = (tokenId: string, radius: number) => {
         const token = tokens.find(t => t.id === tokenId);
        if(token) updateToken(tokenId, { torch: { ...token.torch, radius } });
    }

    const handleZoom = (delta: number) => setZoom(prevZoom => Math.max(0.1, Math.min(5, prevZoom + delta)));
    const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); }
    const syncPlayerView = () => {
        setPlayerPan(pan);
        setPlayerZoom(zoom);
        updateGameState({ playerPan: pan, playerZoom: zoom });
        toast({ title: "Player View Synced!", description: "The player's view now matches yours." });
    };
    const matchPlayerView = () => { setPan(playerPan); setZoom(playerZoom); };

    return (
        <div className="flex h-dvh w-screen bg-background text-foreground">
            <GmSidebar 
                selectedTool={selectedTool}
                onToolSelect={setSelectedTool}
                undo={undo}
                redo={redo}
                resetView={resetView}
                zoomIn={() => handleZoom(0.1)}
                zoomOut={() => handleZoom(-0.1)}
            />
            
            <main className="flex-1 flex flex-col relative bg-muted/30">
                 <div className="absolute top-2 left-2 z-10 p-2 rounded-lg bg-card border border-border flex items-center gap-2">
                     <Button variant={showGrid ? "default" : "outline"} onClick={() => setShowGrid(!showGrid)} size="icon" className="w-8 h-8"><Grid/></Button>
                     <Button variant={showFogOfWar ? "default" : "outline"} onClick={() => setShowFogOfWar(!showFogOfWar)} size="icon" className="w-8 h-8">
                        {showFogOfWar ? <Eye /> : <EyeOff />}
                    </Button>
                </div>

                {(selectedTool === 'wall' || selectedTool === 'detail') && (
                    <Card className="absolute top-2 left-24 z-10 p-2 rounded-lg bg-card border border-border flex items-center gap-4">
                        <CardContent className="p-2 flex items-center gap-4">
                            <div className='flex items-center gap-2'>
                                {selectedTool === 'wall' ? <Brush/> : <PenLine />}
                                <Label className="text-sm font-medium">Brush Size</Label>
                                <Slider
                                    id="brush-size-slider"
                                    min={2} max={50} step={1}
                                    value={[brushSize]}
                                    onValueChange={(value) => setBrushSize(value[0])}
                                    className="w-32"
                                />
                                <span className='text-sm font-bold w-8 text-center'>{brushSize}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Color</Label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button style={{backgroundColor: brushColor}} className="w-8 h-8 rounded-md border-2 border-border" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-none">
                                        <div className="grid grid-cols-6 gap-1 p-1 bg-card rounded-md">
                                        {colorPalette.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={cn(
                                                    "w-8 h-8 rounded-md border-2 transition-all",
                                                    brushColor === color ? 'border-primary' : 'border-transparent hover:border-muted-foreground/50'
                                                )}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setBrushColor(color)}
                                                aria-label={`Select color ${color}`}
                                            />
                                        ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </Card>
                )}


                <div className="flex-1 relative overflow-hidden">
                    <MapGrid 
                        showGrid={showGrid} 
                        tokens={tokens}
                        paths={paths}
                        onMapClick={handleMapClick} 
                        onErase={handleErase}
                        onNewPath={handleNewPath}
                        selectedTool={selectedTool}
                        onTokenMove={handleTokenMove}
                        brushColor={brushColor}
                        brushSize={brushSize}
                        zoom={zoom}
                        pan={pan}
                        onZoomChange={setZoom}
                        onPanChange={setPan}
                        showFogOfWar={showFogOfWar}
                    />
                </div>
            </main>

            <aside className="w-80 h-full flex flex-col p-4 gap-4 border-l border-border bg-card z-20">
                 <TokenPanel 
                    tokens={tokens} 
                    onVisibilityChange={handleTokenVisibilityChange}
                    onTokenDelete={handleTokenDelete}
                    onTokenNameChange={handleTokenNameChange}
                    onTokenColorChange={handleTokenColorChange}
                    onTokenIconChange={handleTokenIconChange}
                    onTokenSizeChange={handleTokenSizeChange}
                    onTokenTorchToggle={handleTokenTorchToggle}
                    onTokenTorchRadiusChange={handleTokenTorchRadiusChange}
                    sessionId={sessionId}
                    syncPlayerView={syncPlayerView}
                    matchPlayerView={matchPlayerView}
                />
            </aside>
        </div>
    );
}
