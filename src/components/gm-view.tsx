
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Grid, EyeOff, Brush, PenLine, Eraser, Trash, Paintbrush, Lightbulb, Grid3x3, Waves, BrainCircuit, PanelRight } from 'lucide-react';
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
import type { Point } from '@/lib/raycasting';
import { Switch } from './ui/switch';
import { mergeShapes, pathIntersects } from '@/lib/shape-merger';

export type Tool = 'select' | 'draw' | 'rectangle' | 'circle' | 'erase' | 'add-pc' | 'add-enemy' | 'portal' | 'add-light' | 'hidden-wall';
export type EraseMode = 'line' | 'brush';
export type DrawMode = 'wall' | 'detail';

export type Path = {
    id: string;
    points: Point[][];
    color: string;
    width: number;
    blocksLight: boolean;
    isPortal?: boolean;
    isHiddenWall?: boolean;
};

export type Token = {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'PC' | 'Enemy' | 'Light' | 'Portal';
  visible: boolean;
  color: string;
  iconUrl?: string;
  size: number;
  torch: {
    enabled: boolean;
    radius: number;
  };
  controls?: string; // ID of the path this token controls (for portals/hidden walls)
};

export type GameState = {
    sessionName?: string;
    tokens: Token[];
    paths: Path[];
    zoom?: number;
    pan?: { x: number, y: number };
    playerZoom?: number;
    playerPan?: { x: number, y: number };
    backgroundImage?: string | null;
    cellSize?: number;
    lastModified?: number;
};

// Represents a single state in the history for undo/redo
type HistoryState = {
    sessionName?: string;
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
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [smartMode, setSmartMode] = useState(false);
    const [selectedTool, setSelectedTool] = useState<Tool>('select');
    const [eraseMode, setEraseMode] = useState<EraseMode>('line');
    const [drawMode, setDrawMode] = useState<DrawMode>('wall');
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [eraseBrushSize, setEraseBrushSize] = useState(20);
    
    // Derived state from history
    const currentHistoryState = history[historyIndex] || { paths: [], tokens: [], backgroundImage: null, cellSize: 40 };
    const { paths, tokens, backgroundImage, cellSize, sessionName } = currentHistoryState;

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [playerZoom, setPlayerZoom] = useState(1);
    const [playerPan, setPlayerPan] = useState({ x: 0, y: 0 });
    const [showFogOfWar, setShowFogOfWar] = useState(true);
    const { toast } = useToast();
    const storageKey = `tabletop-alchemist-session-${sessionId}`;
    const [importAlertOpen, setImportAlertOpen] = useState(false);
    const pendingImportFile = useRef<File | null>(null);


    const recordHistory = useCallback((newState: Partial<HistoryState>) => {
        setHistory(prevHistory => {
            const newHistory = prevHistory.slice(0, historyIndex + 1);
            const currentState = newHistory[newHistory.length -1] || {paths: [], tokens: [], backgroundImage: null, cellSize: 40, sessionName: ''};
            newHistory.push({
                ...currentState,
                ...newState
            });
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);
    
    // This effect handles initializing the session from localStorage
    useEffect(() => {
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                const gameState: GameState = JSON.parse(savedState);
                const loadedPaths = (gameState.paths || []).map(p => ({
                    ...p,
                    id: p.id || `path-${Math.random()}`,
                    isPortal: p.isPortal || false,
                    isHiddenWall: p.isHiddenWall || false,
                    // backwards compatibility for points structure
                    points: p.points && p.points.length > 0 && Array.isArray(p.points[0]) ? p.points : [p.points || []]
                }));
                const loadedTokens = (gameState.tokens || []).map(t => ({
                    ...t,
                    type: t.type || (t.id.startsWith('pc-') ? 'PC' : 'Enemy'),
                    size: t.size || 1,
                    torch: t.torch || { enabled: false, radius: 5 }
                }));
                const loadedBg = gameState.backgroundImage || null;
                const loadedCellSize = gameState.cellSize || 40;
                const loadedSessionName = gameState.sessionName || '';
                
                const initialHistory: HistoryState = { sessionName: loadedSessionName, paths: loadedPaths, tokens: loadedTokens, backgroundImage: loadedBg, cellSize: loadedCellSize };
                setHistory([initialHistory]);
                setHistoryIndex(0);

                if (gameState.zoom) setZoom(gameState.zoom);
                if (gameState.pan) setPan(gameState.pan);
                if (gameState.playerZoom) setPlayerZoom(gameState.playerZoom);
                if (gameState.playerPan) setPlayerPan(gameState.playerPan);
            } else {
                const initialState: HistoryState = { sessionName: '', paths: [], tokens: [], backgroundImage: null, cellSize: 40 };
                setHistory([initialState]);
                setHistoryIndex(0);
            }
        } catch (error) {
            console.error("Failed to load game state from localStorage", error);
                const initialState: HistoryState = { sessionName: '', paths: [], tokens: [], backgroundImage: null, cellSize: 40 };
            setHistory([initialState]);
            setHistoryIndex(0);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);


    // This effect synchronizes the component state to localStorage.
    useEffect(() => {
        // Don't save if history is not yet initialized
        if (historyIndex < 0) return;

        const fullState: GameState = { 
            ...currentHistoryState, 
            zoom, 
            pan,
            playerZoom,
            playerPan,
            lastModified: Date.now(),
        };

        const handler = setTimeout(() => {
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
        }, 500);

        return () => clearTimeout(handler);
    }, [currentHistoryState, zoom, pan, playerZoom, playerPan, historyIndex, storageKey, toast]);


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

    const handleMapClick = (x: number, y: number, isPixelCoords: boolean = false) => {
        let newToken: Token | null = null;
        
        if (selectedTool === 'add-pc') {
            newToken = {
                id: `pc-${Date.now()}`,
                name: `PC ${tokens.filter(t => t.type === 'PC').length + 1}`,
                x, y, type: 'PC' as const, visible: true, color: '#3b82f6',
                size: 1,
                torch: { enabled: false, radius: 5 },
            };
        } else if (selectedTool === 'add-enemy') {
            newToken = {
                id: `enemy-${Date.now()}`,
                name: `Enemy ${tokens.filter(t => t.type === 'Enemy').length + 1}`,
                x, y, type: 'Enemy' as const, visible: false, color: '#ef4444',
                size: 1,
                torch: { enabled: false, radius: 5 },
            };
        } else if (selectedTool === 'add-light') {
             newToken = {
                id: `light-${Date.now()}`,
                name: `Light ${tokens.filter(t => t.type === 'Light').length + 1}`,
                x, y, type: 'Light' as const, visible: false, // Not visible to players
                color: '#fBBF24',
                size: 1,
                torch: { enabled: true, radius: 10 },
            };
        }

        if (newToken) {
            recordHistory({ tokens: [...tokens, newToken]});
        }
    };

    const handleNewPath = useCallback(async (path: Omit<Path, 'id' | 'isPortal' | 'isHiddenWall'>) => {
        const isPortalTool = selectedTool === 'portal';
        const isHiddenWallTool = selectedTool === 'hidden-wall';
        
        const newPathData: Path = { 
            ...path, 
            id: `path-${Date.now()}`, 
            isPortal: isPortalTool,
            isHiddenWall: isHiddenWallTool,
            blocksLight: isPortalTool || isHiddenWallTool || drawMode === 'wall'
        };

        const newTokens = [...tokens];
        if ((isPortalTool || isHiddenWallTool) && newPathData.points.length > 0 && newPathData.points[0].length > 0) {
            // Find center of portal/wall to place token
            const allPoints = newPathData.points[0];
            const { x: totalX, y: totalY } = allPoints.reduce((acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}), {x: 0, y: 0});
            const centerX = totalX / allPoints.length;
            const centerY = totalY / allPoints.length;

            const portalToken: Token = {
                id: `portal-token-${Date.now()}`,
                name: isHiddenWallTool ? `Hidden Wall ${tokens.filter(t => t.type === 'Portal').length + 1}` : `Portal ${tokens.filter(t => t.type === 'Portal').length + 1}`,
                x: centerX,
                y: centerY,
                type: 'Portal',
                visible: false, // Not visible to players by default
                color: '#ff00ff', // A distinct color for portal controls
                size: 1,
                torch: { enabled: false, radius: 0 },
                controls: newPathData.id,
            };
            newTokens.push(portalToken);
        }
    
        if (smartMode && !isPortalTool && !isHiddenWallTool && (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'draw')) {
            const intersectingPaths = paths.filter(p =>
                !p.isPortal && !p.isHiddenWall && pathIntersects(p, newPathData)
            );
    
            if (intersectingPaths.length > 0) {
                const pathsToMerge = [...intersectingPaths, newPathData];
                const mergedPathData = await mergeShapes(pathsToMerge);
    
                if (mergedPathData && mergedPathData.length > 0) {
                    const newMergedPaths = mergedPathData.map((mergedPath, index) => ({
                        ...mergedPath,
                        id: `path-${Date.now()}-merged-${index}`,
                    }));
                    const intersectingPathIds = new Set(intersectingPaths.map(p => p.id));
                    const remainingPaths = paths.filter(p => !intersectingPathIds.has(p.id));
                    recordHistory({ paths: [...remainingPaths, ...newMergedPaths], tokens: newTokens });
                } else {
                    // Merging failed, just add the new path
                    recordHistory({ paths: [...paths, newPathData], tokens: newTokens });
                }
            } else {
                 // No intersections, just add the new path
                 recordHistory({ paths: [...paths, newPathData], tokens: newTokens });
            }
        } else {
             recordHistory({ paths: [...paths, newPathData], tokens: newTokens });
        }
    }, [paths, tokens, recordHistory, drawMode, smartMode, selectedTool]);

    const handleEraseLine = useCallback((point: Point) => {
        const eraseRadius = 20; // proximity to consider a click "on" the line
        
        const distSq = (v: Point, w: Point) => (v.x - w.x)**2 + (v.y - w.y)**2;
        
        const distToSegmentSq = (p: Point, v: Point, w: Point) => {
            const l2 = distSq(v, w);
            if (l2 === 0) return distSq(p, v);
            let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            return distSq(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
        };
    
        const pathToErase = paths.find(path => {
            for (const ring of path.points) {
                for (let i = 0; i < ring.length - 1; i++) {
                    if (distToSegmentSq(point, ring[i], ring[i+1]) < eraseRadius * eraseRadius) {
                        return true;
                    }
                }
            }
            return false;
        });

        if (pathToErase) {
            const remainingPaths = paths.filter(path => path.id !== pathToErase.id);
            recordHistory({ paths: remainingPaths });
        }
    }, [paths, recordHistory]);

    const handleEraseBrush = useCallback((updatedPaths: Path[]) => {
        recordHistory({ paths: updatedPaths });
    }, [recordHistory]);

    const updateToken = useCallback((tokenId: string, updates: Partial<Token>) => {
        const newTokens = tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t);
        recordHistory({ tokens: newTokens });
    }, [tokens, recordHistory]);
    
    const handleTokenDelete = (tokenId: string) => {
        const tokenToDelete = tokens.find(t => t.id === tokenId);
        let newPaths = paths;
        
        // If it's a portal token, also delete its controlled path
        if (tokenToDelete && tokenToDelete.type === 'Portal' && tokenToDelete.controls) {
            newPaths = paths.filter(p => p.id !== tokenToDelete.controls);
        }

        const newTokens = tokens.filter(t => t.id !== tokenId);
        recordHistory({ tokens: newTokens, paths: newPaths });
    }

    const handleTokenVisibilityChange = (tokenId: string, isVisible: boolean) => updateToken(tokenId, { visible: isVisible });
    const handleTokenMove = (tokenId:string, x: number, y: number) => updateToken(tokenId, { x, y });
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
    
    const handlePortalToggle = useCallback((portalTokenId: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const currentState = newHistory[newHistory.length - 1];
        if (!currentState) return;

        const portalToken = currentState.tokens.find(t => t.id === portalTokenId);
        if (!portalToken || !portalToken.controls) return;

        const newPaths = currentState.paths.map(p => {
            if (p.id === portalToken.controls) {
                return { ...p, blocksLight: !p.blocksLight };
            }
            return p;
        });

        const newState = { ...currentState, paths: newPaths };
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const handleZoom = (delta: number) => setZoom(prevZoom => Math.max(0.1, Math.min(5, prevZoom + delta)));
    const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); }
    const syncPlayerView = () => {
        setPlayerPan(pan);
        setPlayerZoom(zoom);
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
                    points: [wall.map((p: {x: number, y: number}) => ({ x: p.x * pixelsPerGrid, y: p.y * pixelsPerGrid }))],
                    color: '#000000',
                    width: 5,
                    blocksLight: true,
                    isPortal: false,
                    isHiddenWall: false,
                }));
                
                const portalWalls: Path[] = [];
                const portalTokens: Token[] = [];

                (data.portals || []).forEach((portal: any, index: number) => {
                    const portalWallId = `portal-wall-${Date.now()}-${index}`;
                    
                    portalWalls.push({
                        id: portalWallId,
                        points: [portal.bounds.map((p: {x: number, y: number}) => ({ x: p.x * pixelsPerGrid, y: p.y * pixelsPerGrid }))],
                        color: '#ff0000', // Distinct color for portals
                        width: 5,
                        blocksLight: true, // Portals are closed by default
                        isPortal: true,
                        isHiddenWall: false,
                    });

                    portalTokens.push({
                        id: `portal-token-${Date.now()}-${index}`,
                        name: `Portal ${index + 1}`,
                        x: portal.position.x * pixelsPerGrid,
                        y: portal.position.y * pixelsPerGrid,
                        type: 'Portal' as const,
                        visible: false, // Not visible to players
                        color: '#ff0000',
                        size: 1,
                        torch: { enabled: false, radius: 0 },
                        controls: portalWallId,
                    });
                });

                 const newLightTokens: Token[] = (data.lights || []).map((light: any, index: number) => ({
                    id: `light-${Date.now()}-${index}`,
                    name: `Light ${index + 1}`,
                    x: light.position.x * pixelsPerGrid, 
                    y: light.position.y * pixelsPerGrid,
                    type: 'Light' as const,
                    visible: false, // Lights are not directly visible, they just emit light
                    color: '#fBBF24', // Not really used, but good to have
                    size: 1,
                    torch: {
                        enabled: true,
                        radius: light.range / 2 // This is in grid units
                    }
                }));

                const finalPaths = [...newWalls, ...portalWalls];
                const finalTokens = [...newLightTokens, ...portalTokens];
                
                // Reset state and load new map
                setPan({ x: 0, y: 0 });
                setZoom(1);
                
                recordHistory({ paths: finalPaths, tokens: finalTokens, backgroundImage: newBackgroundImage, cellSize: pixelsPerGrid });

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
    
    const isDrawingTool = selectedTool === 'draw' || selectedTool === 'rectangle' || selectedTool === 'circle';
    const isPortalTool = selectedTool === 'portal';
    const isHiddenWallTool = selectedTool === 'hidden-wall';
    const isLightTool = selectedTool === 'add-light';

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

                    {(isDrawingTool || isPortalTool || isHiddenWallTool || isLightTool) && (
                        <Card className="absolute top-2 left-24 z-10 p-2 rounded-lg bg-card border border-border flex items-center gap-4">
                            <CardContent className="p-2 flex items-center gap-4">
                                {isDrawingTool && (
                                     <ToggleGroup type="single" value={drawMode} onValueChange={(value: DrawMode) => value && setDrawMode(value)}>
                                        <ToggleGroupItem value="wall" aria-label="Draw as walls">
                                            <Waves className="h-4 w-4" />
                                            <span className="ml-2">Wall</span>
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="detail" aria-label="Draw as details">
                                            <PenLine className="h-4 w-4" />
                                             <span className="ml-2">Detail</span>
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                )}
                               
                                <div className="flex items-center space-x-2">
                                    <Switch id="snap-to-grid" checked={snapToGrid} onCheckedChange={setSnapToGrid}/>
                                    <Label htmlFor="snap-to-grid">Snap</Label>
                                </div>

                                {isDrawingTool && (
                                     <div className="flex items-center space-x-2">
                                        <Switch id="smart-mode" checked={smartMode} onCheckedChange={setSmartMode}/>
                                        <Label htmlFor="smart-mode">Smart</Label>
                                    </div>
                                )}
                               

                                {(isDrawingTool || isPortalTool || isHiddenWallTool) && <div className='flex items-center gap-2'>
                                    <Label className="text-sm font-medium">Size</Label>
                                    <Slider
                                        id="brush-size-slider"
                                        min={2} max={50} step={1}
                                        value={[brushSize]}
                                        onValueChange={(value) => setBrushSize(value[0])}
                                        className="w-32"
                                    />
                                    <span className='text-sm font-bold w-8 text-center'>{brushSize}</span>
                                </div>}

                                {isDrawingTool && (
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
                                )}
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
                            snapToGrid={snapToGrid}
                            tokens={tokens}
                            paths={paths}
                            backgroundImage={backgroundImage}
                            cellSize={cellSize}
                            onMapClick={handleMapClick} 
                            onEraseLine={handleEraseLine}
                            onEraseBrush={handleEraseBrush}
                            onNewPath={handleNewPath}
                            onTokenTorchToggle={handleTokenTorchToggle}
                            onPortalToggle={handlePortalToggle}
                            selectedTool={selectedTool}
                            eraseMode={eraseMode}
                            drawMode={drawMode}
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

                <aside className="w-80 h-full flex flex-col p-4 gap-4 border-l border-border bg-card z-20 overflow-hidden">
                    <TokenPanel 
                        tokens={tokens}
                        sessionName={sessionName}
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
