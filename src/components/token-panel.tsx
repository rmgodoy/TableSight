
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CircleUserRound, Shield, Trash2, Palette, Flame, Plus, Minus, Copy, Users, Link as LinkIcon, Home } from 'lucide-react';
import type { Token } from './gm-view';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
import Link from 'next/link';
import { Separator } from './ui/separator';

interface TokenPanelProps {
    tokens: Token[];
    onVisibilityChange: (tokenId: string, isVisible: boolean) => void;
    onTokenDelete: (tokenId: string) => void;
    onTokenNameChange: (tokenId: string, newName: string) => void;
    onTokenColorChange: (tokenId: string, color: string) => void;
    onTokenIconChange: (tokenId: string, iconUrl: string) => void;
    onTokenTorchToggle: (tokenId: string) => void;
    onTokenTorchRadiusChange: (tokenId: string, radius: number) => void;
    sessionId: string;
    syncPlayerView: () => void;
    matchPlayerView: () => void;
}

export function TokenPanel({ 
    tokens, 
    onVisibilityChange, 
    onTokenDelete, 
    onTokenNameChange, 
    onTokenColorChange, 
    onTokenIconChange,
    onTokenTorchToggle,
    onTokenTorchRadiusChange,
    sessionId,
    syncPlayerView,
    matchPlayerView,
}: TokenPanelProps) {
    const { toast } = useToast();
    const [playerUrl, setPlayerUrl] = useState('');

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


    const handleIconUpload = (tokenId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    onTokenIconChange(tokenId, event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Tokens</CardTitle>
                </CardHeader>
                <CardContent className='overflow-y-auto'>
                    {tokens.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center">No tokens on the map.</p>
                    ) : (
                        <ul className="space-y-2">
                            {tokens.map(token => (
                                <li key={token.id} className="flex flex-col p-2 rounded-md hover:bg-accent/50 transition-colors gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                     <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white/50 shadow-lg shrink-0 bg-cover bg-center cursor-pointer"
                                                        style={{ backgroundColor: token.color, backgroundImage: token.iconUrl ? `url(${token.iconUrl})` : 'none' }}
                                                    >
                                                        {!token.iconUrl && (token.type === 'PC' ? <CircleUserRound className="text-white/80" /> : <Shield className="text-white/80" />)}
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-2">
                                                    <div className='flex items-center gap-2'>
                                                        <input
                                                            type="color"
                                                            value={token.color}
                                                            onChange={(e) => onTokenColorChange(token.id, e.target.value)}
                                                            className="w-10 h-10 border-none cursor-pointer"
                                                            title="Change token color"
                                                        />
                                                        <Separator orientation='vertical' className='h-8' />
                                                        <div>
                                                            <input type="file" accept="image/*" className='hidden' id={`file-input-${token.id}`} onChange={(e) => handleIconUpload(token.id, e)}/>
                                                            <Button onClick={() => document.getElementById(`file-input-${token.id}`)?.click()}>Upload Icon</Button>
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Input 
                                                className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring truncate"
                                                value={token.name} 
                                                onChange={(e) => onTokenNameChange(token.id, e.target.value)}
                                                aria-label="Token name"
                                            />
                                        </div>
                                        <div className="flex items-center shrink-0">
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => onVisibilityChange(token.id, !token.visible)}
                                                title={token.visible ? "Hide Token" : "Show Token"}
                                            >
                                                {token.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive h-8 w-8"
                                                onClick={() => onTokenDelete(token.id)}
                                                title="Delete Token"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="pl-10 flex flex-col items-start gap-2">
                                        <Button variant="ghost" className="h-8 px-2 justify-start" onClick={() => onTokenTorchToggle(token.id)}>
                                            <Flame className={cn("h-4 w-4 mr-2", token.torch.enabled ? "text-orange-500" : "text-muted-foreground")} />
                                            <span className={cn(token.torch.enabled ? "text-primary" : "text-muted-foreground")}>Torch</span>
                                        </Button>
                                        
                                        {token.torch.enabled && (
                                        <div className="flex items-center gap-2 w-full">
                                            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => onTokenTorchRadiusChange(token.id, Math.max(1, token.torch.radius - 1))}><Minus/></Button>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={999}
                                                value={token.torch.radius}
                                                onChange={(e) => onTokenTorchRadiusChange(token.id, parseInt(e.target.value, 10) || 1)}
                                                className="h-8 w-full text-center"
                                            />
                                            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => onTokenTorchRadiusChange(token.id, token.torch.radius + 1)}><Plus/></Button>
                                        </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <div className='flex-1' />

             <Card>
                <CardContent className="p-2 space-y-2">
                     <p className="text-sm text-muted-foreground p-2">Share this URL for the player screen.</p>
                        <div className="flex items-center gap-2 p-2">
                            <Input readOnly value={playerUrl} className="bg-muted border-none" />
                            <Button size="icon" variant="outline" onClick={copyPlayerUrl}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    <div className='grid grid-cols-2 gap-2'>
                       <Button variant="outline" onClick={syncPlayerView}><Eye className="mr-2 h-4 w-4" /> Sync View</Button>
                       <Button variant="outline" onClick={matchPlayerView}><Users className="mr-2 h-4 w-4" /> Match View</Button>
                    </div>

                    <Separator />
                     <div className='grid grid-cols-2 gap-2'>
                        <Button variant="outline" asChild><Link href="/"><Home className="mr-2 h-4 w-4" /> Home</Link></Button>
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
                </CardContent>
            </Card>
        </div>
    );
}
