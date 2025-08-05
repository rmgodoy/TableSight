'use client';

import { useState, useEffect, useCallback } from 'react';
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

export type Tool = 'select' | 'wall' | 'floor' | 'erase' | 'add-pc' | 'add-enemy';

export type Token = {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'PC' | 'Enemy';
  visible: boolean;
};

export type GameState = {
    tokens: Token[];
};


export default function GmView({ sessionId }: { sessionId: string }) {
    const [playerUrl, setPlayerUrl] = useState('');
    const [showGrid, setShowGrid] = useState(true);
    const [selectedTool, setSelectedTool] = useState<Tool>('select');
    const [tokens, setTokens] = useState<Token[]>([]);
    const { toast } = useToast();
    const storageKey = `tabletop-alchemist-session-${sessionId}`;


    const updateGameState = useCallback((newTokens: Token[]) => {
        const newState: GameState = { tokens: newTokens };
        try {
            localStorage.setItem(storageKey, JSON.stringify(newState));
            setTokens(newTokens);
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
                setTokens(gameState.tokens || []);
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
                visible: false,
            };
            updateGameState([...tokens, newPc]);
        }
        if (selectedTool === 'add-enemy') {
            const newEnemy: Token = {
                id: `enemy-${Date.now()}`,
                name: `Enemy ${tokens.filter(t => t.type === 'Enemy').length + 1}`,
                x,
                y,
                type: 'Enemy' as const,
                visible: false,
            };
            updateGameState([...tokens, newEnemy]);
        }
    };

    const handleTokenVisibilityChange = (tokenId: string, isVisible: boolean) => {
        const newTokens = tokens.map(token => 
            token.id === tokenId ? { ...token, visible: isVisible } : token
        );
        updateGameState(newTokens);
    };
    
    const handleTokenDelete = (tokenId: string) => {
        const newTokens = tokens.filter(token => token.id !== tokenId);
        updateGameState(newTokens);
    };

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
                    <GmToolbar selectedTool={selectedTool} onToolSelect={setSelectedTool} />
                    <TokenPanel 
                        tokens={tokens} 
                        onVisibilityChange={handleTokenVisibilityChange}
                        onTokenDelete={handleTokenDelete}
                    />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-4 gap-4">
                <div className="flex-1 relative">
                    <MapGrid 
                        showGrid={showGrid} 
                        tokens={tokens}
                        onMapClick={handleMapClick} 
                        selectedTool={selectedTool}
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
