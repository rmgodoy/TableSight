
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Grid, EyeOff, Brush, PenLine, Eraser, Trash, Paintbrush, Lightbulb } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { GmSidebar } from '@/components/gm-sidebar';
import { TokenPanel } from '@/components/token-panel';
import { MapGrid } from '@/components/map-grid';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type Tool = 'select' | 'wall' | 'detail' | 'erase' | 'add-pc' | 'add-enemy';
export type EraseMode = 'line' | 'brush';

export type Point = { x: number; y: number };
export type Path = {
    id: string;
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
  type: 'PC' | 'Enemy' | 'Light';
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
    backgroundImage?: string | null;
    cellSize?: number;
};

// Represents a single state in the history for undo/redo
type HistoryState = {
    paths: Path[];
    tokens: Token[];
    backgroundImage: string | null;
    cellSize: number;
}

const colorPalette = [
    '#000000', '#ef4444', '#f97316', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];


export default function GmView({ sessionId }: { sessionId: string }) {
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [showGrid, setShowGrid] = useState(true);
    const [selectedTool, setSelectedTool] = useState<Tool>('select');
    const [eraseMode, setEraseMode] = useState<EraseMode>('line');
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [eraseBrushSize, setEraseBrushSize] = useState(20);
    
    const [tokens, setTokens] = useState<Token[]>([]);
    const [paths, setPaths] = useState<Path[]>([]);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [cellSize, setCellSize] = useState(40);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [playerZoom, setPlayerZoom] = useState(1);
    const [playerPan, setPlayerPan] = useState({ x: 0, y: 0 });
    const [showFogOfWar, setShowFogOfWar] = useState(true);
    const { toast } = useToast();
    const storageKey = `tabletop-alchemist-session-${sessionId}`;
    const [importAlertOpen, setImportAlertOpen] = useState(false);
    const pendingImportFile = useRef<File | null>(null);


    const updateGameState = useCallback((newState: Partial<GameState> = {}) => {
        const fullState: GameState = { 
            tokens, 
            paths, 
            zoom, 
            pan,
            playerZoom,
            playerPan,
            backgroundImage,
            cellSize,
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
    }, [storageKey, toast, tokens, paths, zoom, pan, playerPan, playerZoom, backgroundImage, cellSize]);

    const recordHistory = (newPaths: Path[], newTokens: Token[], newBackgroundImage: string | null, newCellSize: number) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ paths: newPaths, tokens: newTokens, backgroundImage: newBackgroundImage, cellSize: newCellSize });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
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

    // This effect synchronizes the component state (paths, tokens) with the current point in history
    useEffect(() => {
        if(historyIndex >= 0 && history[historyIndex]) {
            const { paths: historyPaths, tokens: historyTokens, backgroundImage: historyBg, cellSize: historyCellSize } = history[historyIndex];
            setPaths(historyPaths);
            setTokens(historyTokens);
            setBackgroundImage(historyBg);
            setCellSize(historyCellSize);
        }
    }, [history, historyIndex]);
    
    // This effect synchronizes the local state to localStorage.
    // It's debounced to avoid excessive writes.
    useEffect(() => {
        // Only run if there is something in the history
        if(history.length === 0) return;

        const handler = setTimeout(() => {
            updateGameState();
        }, 500); // Debounce time in ms
        return () => clearTimeout(handler);
    }, [tokens, paths, backgroundImage, cellSize, zoom, pan, playerPan, playerZoom, updateGameState, history.length]);


    useEffect(() => {
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                const gameState: GameState = JSON.parse(savedState);
                const loadedPaths = (gameState.paths || []).map(p => ({
                    ...p,
                    id: p.id || `path-${Math.random()}` 
                }));
                const loadedTokens = (gameState.tokens || []).map(t => ({
                  ...t,
                  type: t.type || (t.id.startsWith('pc-') ? 'PC' : 'Enemy'),
                  size: t.size || 1,
                  torch: t.torch || { enabled: false, radius: 5 }
                }));
                const loadedBg = gameState.backgroundImage || null;
                const loadedCellSize = gameState.cellSize || 40;
                
                setPaths(loadedPaths);
                setTokens(loadedTokens);
                setBackgroundImage(loadedBg);
                setCellSize(loadedCellSize);

                // Initialize history with the loaded state
                const initialHistory: HistoryState = [{ paths: loadedPaths, tokens: loadedTokens, backgroundImage: loadedBg, cellSize: loadedCellSize }];
                setHistory(initialHistory);
                setHistoryIndex(0);

                if (gameState.zoom) setZoom(gameState.zoom);
                if (gameState.pan) setPan(gameState.pan);
                if (gameState.playerZoom) setPlayerZoom(gameState.playerZoom);
                if (gameState.playerPan) setPlayerPan(gameState.playerPan);
            } else {
                 // If no saved state, initialize with an empty state
                const initialState: HistoryState = { paths: [], tokens: [], backgroundImage: null, cellSize: 40 };
                setHistory([initialState]);
                setHistoryIndex(0);
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
            const newTokens = [...tokens, newToken];
            recordHistory(paths, newTokens, backgroundImage, cellSize);
        }
    };

    const handleNewPath = (path: Omit<Path, 'id'>) => {
        const newPath = { ...path, id: `path-${Date.now()}` };
        const newPaths = [...paths, newPath];
        recordHistory(newPaths, tokens, backgroundImage, cellSize);
    };

    const handleEraseLine = (point: Point) => {
        const eraseRadius = 20;
        const isPointInRadius = (p1: Point, p2: Point, radius: number) => {
             return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)) < radius;
        }

        const remainingPaths = paths.filter(path => 
            !path.points.some(p => isPointInRadius(p, point, eraseRadius))
        );
        
        if(remainingPaths.length < paths.length) {
            recordHistory(remainingPaths, tokens, backgroundImage, cellSize);
        }
    };

    const handleEraseBrush = (updatedPaths: Path[]) => {
        recordHistory(updatedPaths, tokens, backgroundImage, cellSize);
    };

    const updateToken = (tokenId: string, updates: Partial<Token>) => {
        let newTokens = [...tokens];
        const tokenIndex = newTokens.findIndex(t => t.id === tokenId);
        if (tokenIndex !== -1) {
            newTokens[tokenIndex] = { ...newTokens[tokenIndex], ...updates };
            recordHistory(paths, newTokens, backgroundImage, cellSize);
        }
    };
    
    const handleTokenDelete = (tokenId: string) => {
        const newTokens = tokens.filter(t => t.id !== tokenId);
        recordHistory(paths, newTokens, backgroundImage, cellSize);
    }

    const handleTokenVisibilityChange = (tokenId: string, isVisible: boolean) => updateToken(tokenId, { visible: isVisible });
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

    const confirmImport = () => {
        if (!pendingImportFile.current) return;

        const file = pendingImportFile.current;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);

                const pixelsPerGrid = data.resolution.pixels_per_grid;
                const newBackgroundImage = `data:image/webp;base64,${data.image}`;
                const newWalls: Path[] = (data.line_of_sight || []).map((wall: any, index: number) => ({
                    id: `wall-${Date.now()}-${index}`,
                    points: wall.map((p: {x: number, y: number}) => ({ x: p.x, y: p.y })),
                    color: '#000000',
                    width: 5,
                    blocksLight: true
                }));
                 const newLightTokens: Token[] = (data.lights || []).map((light: any, index: number) => ({
                    id: `light-${Date.now()}-${index}`,
                    name: `Light ${index + 1}`,
                    x: light.position.x,
                    y: light.position.y,
                    type: 'Light' as const,
                    visible: false, // Lights are not directly visible, they just emit light
                    color: '#fBBF24', // Not really used, but good to have
                    size: 1, // Lights don't have a physical size in the same way
                    torch: {
                        enabled: true,
                        radius: light.range
                    }
                }));

                // Reset state and load new map
                setPan({ x: 0, y: 0 });
                setZoom(1);
                setBackgroundImage(newBackgroundImage);
                
                recordHistory(newWalls, newLightTokens, newBackgroundImage, pixelsPerGrid);

                toast({ title: "Map Imported!", description: `${file.name} was successfully imported.` });

            } catch (e) {
                console.error("Failed to parse dd2vtt file", e);
                toast({
                    title: "Import Failed",
                    description: "The selected file could not be parsed. Please ensure it's a valid .dd2vtt file.",
                    variant: "destructive"
                });
            } finally {
                pendingImportFile.current = null;
                setImportAlertOpen(false);
            }
        };
        reader.readAsText(file);
    };

    const onImport = (file: File) => {
        pendingImportFile.current = file;
        setImportAlertOpen(true);
    };

    return (
        <>
            <AlertDialog open={importAlertOpen} onOpenChange={setImportAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Import New Map?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Importing a new map will clear all existing walls, drawings, and tokens from the current map. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => pendingImportFile.current = null}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmImport}>Import</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex h-dvh w-screen bg-background text-foreground">
                <GmSidebar 
                    selectedTool={selectedTool}
                    onToolSelect={setSelectedTool}
                    onImport={onImport}
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

                    {selectedTool === 'erase' && (
                        <Card className="absolute top-2 left-24 z-10 p-2 rounded-lg bg-card border border-border flex items-center gap-4">
                            <CardContent className="p-2 flex items-center gap-4">
                            <ToggleGroup type="single" value={eraseMode} onValueChange={(value: EraseMode) => value && setEraseMode(value)}>
                                    <ToggleGroupItem value="line" aria-label="Erase whole line">
                                        <Trash className="h-4 w-4" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="brush" aria-label="Erase with brush">
                                        <Paintbrush className="h-4 w-4" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                                
                                {eraseMode === 'brush' && (
                                    <div className='flex items-center gap-2'>
                                        <Label className="text-sm font-medium">Eraser Size</Label>
                                        <Slider
                                            id="eraser-size-slider"
                                            min={5} max={100} step={1}
                                            value={[eraseBrushSize]}
                                            onValueChange={(value) => setEraseBrushSize(value[0])}
                                            className="w-32"
                                        />
                                        <span className='text-sm font-bold w-8 text-center'>{eraseBrushSize}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex-1 relative overflow-hidden">
                        <MapGrid 
                            showGrid={showGrid} 
                            tokens={tokens}
                            paths={paths}
                            backgroundImage={backgroundImage}
                            cellSize={cellSize}
                            onMapClick={handleMapClick} 
                            onEraseLine={handleEraseLine}
                            onEraseBrush={handleEraseBrush}
                            onNewPath={handleNewPath}
                            onTokenTorchToggle={handleTokenTorchToggle}
                            selectedTool={selectedTool}
                            eraseMode={eraseMode}
                            onTokenMove={handleTokenMove}
                            brushColor={brushColor}
                            brushSize={brushSize}
                            eraseBrushSize={eraseBrushSize}
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
                        tokens={tokens.filter(t => t.type !== 'Light')} 
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
        </>
    );
}
