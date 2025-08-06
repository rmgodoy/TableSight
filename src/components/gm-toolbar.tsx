'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MousePointer, Brush, CircleUserRound, Shield, Eraser } from 'lucide-react';
import type { Tool } from './gm-view';

interface GmToolbarProps {
    selectedTool: Tool;
    onToolSelect: (tool: Tool) => void;
}

export function GmToolbar({ selectedTool, onToolSelect }: GmToolbarProps) {
    const tools: { id: Tool, label: string, icon: React.ReactNode }[] = [
        { id: 'select', label: 'Select', icon: <MousePointer /> },
        { id: 'brush', label: 'Brush', icon: <Brush /> },
        { id: 'erase', label: 'Erase', icon: <Eraser /> },
    ];

    const tokenTools: { id: Tool, label: string, icon: React.ReactNode }[] = [
        { id: 'add-pc', label: 'Add PC', icon: <CircleUserRound /> },
        { id: 'add-enemy', label: 'Add Enemy', icon: <Shield /> },
    ]

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Map</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {tools.map(tool => (
                            <Button 
                                key={tool.id} 
                                variant={selectedTool === tool.id ? 'secondary' : 'outline'}
                                className="flex items-center justify-start gap-2"
                                onClick={() => onToolSelect(tool.id)}
                            >
                                {tool.icon} {tool.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <Separator />
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Tokens</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {tokenTools.map(tool => (
                            <Button
                                key={tool.id}
                                variant={selectedTool === tool.id ? 'secondary' : 'outline'}
                                className="flex items-center justify-start gap-2"
                                onClick={() => onToolSelect(tool.id)}
                            >
                                {tool.icon} {tool.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
