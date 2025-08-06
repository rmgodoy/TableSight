
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, Grid, Undo, Redo, Home } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { GmToolbar } from '@/components/gm-toolbar';
import { TokenPanel } from '@/components/token-panel';
import { MapGrid } from '@/components/map-grid';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export type Tool = 'select' | 'brush' | 'erase' | 'add-pc' | 'add-enemy';

export type Point = { x: number; y: number };
export type Path = {
    points: Point[];
    color: string;
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
  torch: {
    enabled: boolean;
    radius: number;
  };
};

export type GameState = {
    tokens: Token[];
    paths: Path[];
};


export default function GmView({ sessionId }: { sessionId: string }) {
    const [playerUrl, setPlayerUrl] = useState('');
    const [showGrid, setShowGrid] = useState(true);
    const [selectedTool, setSelectedTool] = useState<Tool>('select');
    const [brushColor, setBrushColor] = useState('#000000');
    const [tokens, setTokens] = useState<Token[]>([]);
    const [paths, setPaths] = useState<Path[]>([]);
    const { toast } = useToast();
    const storageKey = `tabletop-alchemist-session-${sessionId}`;


    const updateGameState = useCallback((newTokens: Token[], newPaths: Path[]) => {
        const newState: GameState = { tokens: newTokens, paths: newPaths };
        try {
            localStorage.setItem(storageKey, JSON.stringify(newState));
            setTokens(newTokens);
            setPaths(newPaths);
        } catch (error) {
            console.error("Failed to save game state to localStorage", error);
            toast({
                title: "Error",
                description: "Could not save game state. Your browser might be in private mode or storage is full.",
                variant: "destructive"
            });
        }
    }, [storageKey, toast]);
    
    useEffect(() => {
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                const gameState: GameState = JSON.parse(savedState);
                // Backwards compatibility for old states without torch
                const updatedTokens = (gameState.tokens || []).map(t => ({
                  ...t,
                  torch: t.torch || { enabled: false, radius: 5 }
                }));
                const updatedPaths = (gameState.paths || []).map(p => {
                    // Backwards compatibility for paths without color
                    if (Array.isArray(p)) {
                        return { points: p, color: '#000000' };
                    }
                    return p;
                });
                setTokens(updatedTokens);
                setPaths(updatedPaths);
            }
        } catch (error) {
            console.error("Failed to load game state from localStorage", error);
        }
    }, [storageKey]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPlayerUrl(`${window.location.origin}/player/${sessionId}`);
        }
    }, [sessionId]);

    const copyPlayerUrl = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(playerUrl);
            toast({
              title: "Player URL Copied!",
              description: "Share this link with your players.",
            });
        }
    };

    const handleMapClick = (x: number, y: number) => {
        if (selectedTool === 'add-pc') {
            const newPc: Token = {
                id: `pc-${Date.now()}`,
                name: `PC ${tokens.filter(t => t.type === 'PC').length + 1}`,
                x,
                y,
                type: 'PC' as const,
                visible: true,
                color: '#3b82f6',
                torch: { enabled: false, radius: 5 },
            };
            updateGameState([...tokens, newPc], paths);
        }
        if (selectedTool === 'add-enemy') {
            const newEnemy: Token = {
                id: `enemy-${Date.now()}`,
                name: `Enemy ${tokens.filter(t => t.type === 'Enemy').length + 1}`,
                x,
                y,
                type: 'Enemy' as const,
                visible: false,
                color: '#ef4444',
                torch: { enabled: false, radius: 5 },
            };
            updateGameState([...tokens, newEnemy], paths);
        }
    };

    const handleNewPath = (path: Path) => {
        updateGameState(tokens, [...paths, path]);
    };

    const handleErase = (point: Point) => {
        // A simple erase implementation: remove paths that are close to the erase point.
        const eraseRadius = 20; // in pixels
        const newPaths = paths.filter(path => 
            !path.points.some(p => Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)) < eraseRadius)
        );
        updateGameState(tokens, newPaths);
    };


    const handleTokenVisibilityChange = (tokenId: string, isVisible: boolean) => {
        const newTokens = tokens.map(token => 
            token.id === tokenId ? { ...token, visible: isVisible } : token
        );
        updateGameState(newTokens, paths);
    };
    
    const handleTokenDelete = (tokenId: string) => {
        const newTokens = tokens.filter(token => token.id !== tokenId);
        updateGameState(newTokens, paths);
    };

    const handleTokenMove = (tokenId: string, x: number, y: number) => {
        const newTokens = tokens.map(token =>
            token.id === tokenId ? { ...token, x, y } : token
        );
        updateGameState(newTokens, paths);
    };

    const handleTokenNameChange = (tokenId: string, newName: string) => {
        const newTokens = tokens.map(token =>
            token.id === tokenId ? { ...token, name: newName } : token
        );
        updateGameState(newTokens, paths);
    };

    const handleTokenColorChange = (tokenId: string, newColor: string) => {
        const newTokens = tokens.map(token =>
            token.id === tokenId ? { ...token, color: newColor } : token
        );
        updateGameState(newTokens, paths);
    };

    const handleTokenIconChange = (tokenId: string, newIconUrl: string) => {
        const newTokens = tokens.map(token =>
            token.id === tokenId ? { ...token, iconUrl: newIconUrl } : token
        );
        updateGameState(newTokens, paths);
    };

    const handleTokenTorchToggle = (tokenId: string) => {
        const newTokens = tokens.map(token =>
            token.id === tokenId ? { ...token, torch: { ...token.torch, enabled: !token.torch.enabled } } : token
        );
        updateGameState(newTokens, paths);
    }
    
    const handleTokenTorchRadiusChange = (tokenId: string, radius: number) => {
        const newTokens = tokens.map(token =>
            token.id === tokenId ? { ...token, torch: { ...token.torch, radius } } : token
        );
        updateGameState(newTokens, paths);
    }

    return (
        <div className="flex h-dvh w-screen bg-background text-foreground overflow-hidden">
            {/* Left Sidebar */}
            <aside className="w-80 h-full flex flex-col p-4 gap-4 border-r border-border bg-card/50">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold font-headline text-primary">Tabletop Alchemist</h1>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/"><Home className="h-4 w-4" /></Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Player Link</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">Share this URL for the player screen.</p>
                        <div className="flex items-center gap-2">
                            <Input readOnly value={playerUrl} className="bg-muted border-none" />
                            <Button size="icon" variant="outline" onClick={copyPlayerUrl}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <GmToolbar 
                        selectedTool={selectedTool} 
                        onToolSelect={setSelectedTool}
                        brushColor={brushColor}
                        onBrushColorChange={setBrushColor}
                    />
                    <TokenPanel 
                        tokens={tokens} 
                        onVisibilityChange={handleTokenVisibilityChange}
                        onTokenDelete={handleTokenDelete}
                        onTokenNameChange={handleTokenNameChange}
                        onTokenColorChange={handleTokenColorChange}
                        onTokenIconChange={handleTokenIconChange}
                        onTokenTorchToggle={handleTokenTorchToggle}
                        onTokenTorchRadiusChange={handleTokenTorchRadiusChange}
                    />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-4 gap-4">
                <div className="flex-1 relative">
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
                    />
                </div>
                <footer className="h-16 flex items-center justify-center p-2 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2">
                        <Button variant="outline"><Undo className="mr-2" /> Undo</Button>
                        <Button variant="outline">Redo <Redo className="ml-2" /></Button>
                        <Separator orientation="vertical" className="h-6 mx-4" />
                        <Button variant="outline" onClick={() => setShowGrid(!showGrid)}><Grid className="mr-2" /> Toggle Grid</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">End Session</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure you want to end the session?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. Your map will be saved, but the session will end.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction asChild>
                                <Link href="/">End Session</Link>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                    </div>
                </footer>
            </main>
        </div>
    );
}
