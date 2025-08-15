
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CircleUserRound, Shield, Trash2, Palette, Flame, Plus, Minus, Copy, Users, Link as LinkIcon, Home, Scaling, Lightbulb, DoorClosed, PanelRight, Heart } from 'lucide-react';
import type { Token } from './gm-view';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRef, useState, useEffect, useMemo } from 'react';
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
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

type TokenFilter = 'combatants' | 'lights' | 'portals';

interface TokenPanelProps {
    tokens: Token[];
    sessionName?: string;
    onVisibilityChange: (tokenId: string, isVisible: boolean) => void;
    onToggleAllEnemiesVisibility: () => void;
    onTokenDelete: (tokenId: string) => void;
    onTokenDuplicate: (tokenId: string) => void;
    onTokenNameChange: (tokenId: string, newName: string) => void;
    onTokenColorChange: (tokenId: string, color: string) => void;
    onTokenIconChange: (tokenId: string, iconUrl: string) => void;
    onTokenSizeChange: (tokenId: string, size: number) => void;
    onTokenTorchToggle: (tokenId: string) => void;
    onTokenTorchRadiusChange: (tokenId: string, radius: number) => void;
    onTokenHpChange: (tokenId: string, hp: { current: number, max: number }) => void;
    onTokenHover: (tokenId: string | null) => void;
    sessionId: string;
    syncPlayerView: () => void;
    matchPlayerView: () => void;
}

export function TokenPanel({ 
    tokens, 
    sessionName,
    onVisibilityChange, 
    onToggleAllEnemiesVisibility,
    onTokenDelete, 
    onTokenDuplicate,
    onTokenNameChange, 
    onTokenColorChange, 
    onTokenIconChange,
    onTokenSizeChange,
    onTokenTorchToggle,
    onTokenTorchRadiusChange,
    onTokenHpChange,
    onTokenHover,
    sessionId,
    syncPlayerView,
    matchPlayerView,
}: TokenPanelProps) {
    const { toast } = useToast();
    const [playerUrl, setPlayerUrl] = useState('');
    const [filter, setFilter] = useState<TokenFilter>('combatants');

     useEffect(() => {
        if (typeof window !== 'undefined') {
            const basePath = process.env.NODE_ENV === 'production' ? '/TableSight' : '';
            setPlayerUrl(`${window.location.origin}${basePath}/player#${sessionId}`);
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

    const filteredTokens = useMemo(() => {
        switch (filter) {
            case 'lights':
                return tokens.filter(t => t.type === 'Light');
            case 'portals':
                return tokens.filter(t => t.type === 'Portal');
            case 'combatants':
            default:
                return tokens.filter(t => t.type === 'PC' || t.type === 'Enemy');
        }
    }, [tokens, filter]);

    const enemyTokens = tokens.filter(t => t.type === 'Enemy');
    const areAllEnemiesVisible = enemyTokens.length > 0 && enemyTokens.every(t => t.visible);


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

    const renderIcon = (token: Token) => {
        if (token.type === 'PC') return <CircleUserRound className="text-white/80" />;
        if (token.type === 'Enemy') return <Shield className="text-white/80" />;
        if (token.type === 'Light') return <Lightbulb className={cn("text-white/80", token.torch.enabled && "text-yellow-300")} />;
        if (token.type === 'Portal') {
             if (token.name.toLowerCase().includes('wall')) {
                return <PanelRight className="text-gray-400" />;
            }
            return <DoorClosed className="text-red-300" />;
        }
        return null;
    }

    return (
        <div className="h-full flex flex-col gap-4">
            <Card className="w-full flex flex-col flex-1 min-h-0">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle>{ sessionName || 'Tokens' }</CardTitle>
                        <div className="flex flex-col items-end gap-2">
                             <ToggleGroup type="single" value={filter} onValueChange={(value: TokenFilter) => value && setFilter(value)} size="sm">
                                <ToggleGroupItem value="combatants" aria-label="Combatants">
                                    <Users className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="lights" aria-label="Lights">
                                    <Lightbulb className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="portals" aria-label="Portals">
                                    <DoorClosed className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                            {filter === 'combatants' && enemyTokens.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onToggleAllEnemiesVisibility}
                                    title={areAllEnemiesVisible ? 'Hide All Enemies' : 'Show All Enemies'}
                                >
                                    {areAllEnemiesVisible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                    {areAllEnemiesVisible ? 'Hide All' : 'Show All'}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className='flex-1 overflow-hidden p-0'>
                    <ScrollArea className="h-full w-full p-6 pt-0">
                        {filteredTokens.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center">No tokens of this type.</p>
                        ) : (
                            <ul className="space-y-2">
                                {filteredTokens.map(token => (
                                    <li 
                                        key={token.id} 
                                        className="flex flex-col p-2 rounded-md hover:bg-accent/50 transition-colors gap-2 text-sm"
                                        onMouseEnter={() => onTokenHover(token.id)}
                                        onMouseLeave={() => onTokenHover(null)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <Popover>
                                                    <PopoverTrigger asChild disabled={token.type === 'Light' || token.type === 'Portal'}>
                                                         <div
                                                            className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white/50 shadow-lg shrink-0 bg-cover bg-center",
                                                                (token.type !== 'Light' && token.type !== 'Portal') && "cursor-pointer"
                                                            )}
                                                            style={{ backgroundColor: token.color, backgroundImage: token.iconUrl ? `url(${'\'\'\''}${token.iconUrl}'\'\'')` : 'none' }}
                                                        >
                                                            {!token.iconUrl && renderIcon(token)}
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-2">
                                                        <div className='flex items-center gap-4'>
                                                            <div className='flex flex-col gap-2 items-center'>
                                                                <Label>Color</Label>
                                                                <input
                                                                    type="color"
                                                                    value={token.color}
                                                                    onChange={(e) => onTokenColorChange(token.id, e.target.value)}
                                                                    className="w-10 h-10 border-none cursor-pointer"
                                                                    title="Change token color"
                                                                />
                                                            </div>
                                                            <Separator orientation='vertical' className='h-16' />
                                                            <div className='flex flex-col gap-2 items-start'>
                                                                 <div>
                                                                    <input type="file" accept="image/*" className='hidden' id={`file-input-${token.id}`} onChange={(e) => handleIconUpload(token.id, e)}/>
                                                                    <Button onClick={() => document.getElementById(`file-input-${token.id}`)?.click()}>Upload Icon</Button>
                                                                </div>
                                                                <div className='flex items-center gap-2'>
                                                                    <Label>Size</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min={1}
                                                                        max={20}
                                                                        value={token.size}
                                                                        onChange={(e) => onTokenSizeChange(token.id, parseInt(e.target.value, 10) || 1)}
                                                                        className="h-8 w-20 text-center"
                                                                    />
                                                                </div>
                                                                 {token.type === 'Enemy' && token.hp && (
                                                                    <div className='flex items-center gap-2'>
                                                                        <Label>Max HP</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={token.hp.max}
                                                                            onChange={(e) => onTokenHpChange(token.id, { ...token.hp!, max: parseInt(e.target.value, 10) || 0 })}
                                                                            className="h-8 w-20 text-center"
                                                                            aria-label="Maximum HP"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <Input 
                                                    className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring truncate"
                                                    value={token.name} 
                                                    onChange={(e) => onTokenNameChange(token.id, e.target.value)}
                                                    aria-label="Token name"
                                                    disabled={token.type === 'Light' || token.type === 'Portal'}
                                                />
                                            </div>
                                            <div className="flex items-center shrink-0">
                                                {token.type !== 'Light' && token.type !== 'Portal' && (
                                                    <>
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
                                                            className="h-8 w-8"
                                                            title="Duplicate Token"
                                                            onClick={() => onTokenDuplicate(token.id)}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive h-8 w-8"
                                                    title="Delete Token"
                                                    onClick={() => onTokenDelete(token.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                         <div className="pl-10 flex flex-col items-start gap-4">
                                            {token.type === 'Enemy' && token.hp && (
                                                <div className='flex items-center gap-2 text-sm'>
                                                    <Heart className="h-4 w-4 text-red-500" />
                                                    <Label htmlFor={`hp-current-${token.id}`}>HP</Label>
                                                    <Input
                                                        id={`hp-current-${token.id}`}
                                                        type="number"
                                                        value={token.hp.current}
                                                        onChange={(e) => onTokenHpChange(token.id, { ...token.hp!, current: parseInt(e.target.value, 10) || 0 })}
                                                        className="h-8 w-20 text-center"
                                                        aria-label="Current HP"
                                                    />
                                                </div>
                                            )}
                                            {(token.type === 'PC' || token.type === 'Enemy' || token.type === 'Light') && (
                                                <div className='flex flex-col gap-2 w-full'>
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
                                            )}
                                         </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>


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

    