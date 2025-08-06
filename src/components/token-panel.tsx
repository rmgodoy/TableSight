
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CircleUserRound, Shield, Trash2, Palette, Flame, Minus, Plus } from 'lucide-react';
import type { Token } from './gm-view';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface TokenPanelProps {
    tokens: Token[];
    onVisibilityChange: (tokenId: string, isVisible: boolean) => void;
    onTokenDelete: (tokenId: string) => void;
    onTokenNameChange: (tokenId: string, newName: string) => void;
    onTokenColorChange: (tokenId: string, color: string) => void;
    onTokenIconChange: (tokenId: string, iconUrl: string) => void;
    onTokenTorchToggle: (tokenId: string) => void;
    onTokenTorchRadiusChange: (tokenId: string, radius: number) => void;
}

export function TokenPanel({ 
    tokens, 
    onVisibilityChange, 
    onTokenDelete, 
    onTokenNameChange, 
    onTokenColorChange, 
    onTokenIconChange,
    onTokenTorchToggle,
    onTokenTorchRadiusChange
}: TokenPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hiddenFileInputs = useRef<{[key: string]: HTMLInputElement | null}>({});

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
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Tokens</CardTitle>
            </CardHeader>
            <CardContent>
                 {tokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No tokens on the map.</p>
                ) : (
                    <ul className="space-y-2">
                        {tokens.map(token => (
                            <li key={token.id} className="flex flex-col p-2 rounded-md hover:bg-accent/50 transition-colors gap-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white/50 shadow-lg shrink-0 bg-cover bg-center"
                                            style={{ backgroundColor: token.color, backgroundImage: token.iconUrl ? `url(${token.iconUrl})` : 'none' }}
                                        >
                                            {!token.iconUrl && (token.type === 'PC' ? <CircleUserRound className="text-white/80" /> : <Shield className="text-white/80" />)}
                                        </div>
                                        <Input 
                                            className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring truncate"
                                            value={token.name} 
                                            onChange={(e) => onTokenNameChange(token.id, e.target.value)}
                                            aria-label="Token name"
                                        />
                                    </div>
                                    <div className="flex items-center shrink-0">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Palette className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-2">
                                                <input
                                                    type="color"
                                                    value={token.color}
                                                    onChange={(e) => onTokenColorChange(token.id, e.target.value)}
                                                    className="w-10 h-10 border-none cursor-pointer"
                                                    title="Change token color"
                                                />
                                            </PopoverContent>
                                        </Popover>

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
                                <div className="flex items-center justify-between pl-10">
                                    <Button variant="ghost" className="h-8 px-2" onClick={() => onTokenTorchToggle(token.id)}>
                                         <Flame className={cn("h-4 w-4 mr-2", token.torch.enabled ? "text-orange-500" : "text-muted-foreground")} />
                                         <span className={cn(token.torch.enabled ? "text-orange-500" : "text-muted-foreground")}>Torch</span>
                                    </Button>
                                    
                                    {token.torch.enabled && (
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onTokenTorchRadiusChange(token.id, Math.max(0, token.torch.radius - 1))}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input
                                            type="number"
                                            className="h-6 w-12 text-center border-x-0 rounded-none bg-transparent"
                                            value={token.torch.radius}
                                            onChange={(e) => onTokenTorchRadiusChange(token.id, parseInt(e.target.value) || 0)}
                                            aria-label="Torch radius"
                                        />
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onTokenTorchRadiusChange(token.id, token.torch.radius + 1)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
