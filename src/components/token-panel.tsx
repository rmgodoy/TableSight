'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CircleUserRound, Shield, Trash2, Upload, Palette } from 'lucide-react';
import type { Token } from './gm-view';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRef } from 'react';

interface TokenPanelProps {
    tokens: Token[];
    onVisibilityChange: (tokenId: string, isVisible: boolean) => void;
    onTokenDelete: (tokenId: string) => void;
    onTokenNameChange: (tokenId: string, newName: string) => void;
    onTokenColorChange: (tokenId: string, color: string) => void;
    onTokenIconChange: (tokenId: string, iconUrl: string) => void;
}

export function TokenPanel({ tokens, onVisibilityChange, onTokenDelete, onTokenNameChange, onTokenColorChange, onTokenIconChange }: TokenPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    <ul className="space-y-4">
                        {tokens.map(token => (
                            <li key={token.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white/50 shadow-lg shrink-0 bg-cover bg-center"
                                        style={{ backgroundColor: token.color, backgroundImage: token.iconUrl ? `url(${token.iconUrl})` : 'none' }}
                                    >
                                        {!token.iconUrl && (token.type === 'PC' ? <CircleUserRound className="text-white/80" /> : <Shield className="text-white/80" />)}
                                    </div>
                                    <Input 
                                        className="h-8 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                                        value={token.name} 
                                        onChange={(e) => onTokenNameChange(token.id, e.target.value)}
                                        aria-label="Token name"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon">
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

                                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="h-4 w-4" />
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleIconUpload(token.id, e)}
                                        />
                                    </Button>

                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => onVisibilityChange(token.id, !token.visible)}
                                    >
                                        {token.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => onTokenDelete(token.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
