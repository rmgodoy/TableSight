'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CircleUserRound, Shield } from 'lucide-react';

export function TokenPanel() {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Tokens</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    <li className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <CircleUserRound className="text-primary" />
                            <span>Elara</span>
                        </div>
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    </li>
                    <li className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <Shield className="text-destructive" />
                            <span>Goblin #1</span>
                        </div>
                        <Button variant="ghost" size="icon"><EyeOff className="h-4 w-4" /></Button>
                    </li>
                     <li className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <CircleUserRound className="text-primary" />
                            <span>Roric</span>
                        </div>
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    </li>
                </ul>
            </CardContent>
        </Card>
    );
}
