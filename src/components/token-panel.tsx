'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CircleUserRound, Shield, Trash2 } from 'lucide-react';
import type { Token } from './gm-view';

interface TokenPanelProps {
    tokens: Token[];
    onVisibilityChange: (tokenId: string, isVisible: boolean) => void;
    onTokenDelete: (tokenId: string) => void;
}

export function TokenPanel({ tokens, onVisibilityChange, onTokenDelete }: TokenPanelProps) {
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
                            <li key={token.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    {token.type === 'PC' ? <CircleUserRound className="text-primary" /> : <Shield className="text-destructive" />}
                                    <span>{token.name}</span>
                                </div>
                                <div className="flex items-center">
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
