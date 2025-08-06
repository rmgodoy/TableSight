
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MousePointer, Brush, CircleUserRound, Shield, Eraser } from 'lucide-react';
import type { Tool } from './gm-view';
import { cn } from '@/lib/utils';

interface GmToolbarProps {
    selectedTool: Tool;
    onToolSelect: (tool: Tool) => void;
    brushColor: string;
    onBrushColorChange: (color: string) => void;
}

const colorPalette = [
    '#000000', '#ef4444', '#f97316', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];

export function GmToolbar({ selectedTool, onToolSelect, brushColor, onBrushColorChange }: GmToolbarProps) {
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
                {selectedTool === 'brush' && (
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Brush Color</h3>
                        <div className="grid grid-cols-6 gap-2">
                            {colorPalette.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    className={cn(
                                        "w-full h-8 rounded-md border-2 transition-all",
                                        brushColor === color ? 'border-primary' : 'border-transparent hover:border-muted-foreground/50'
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => onBrushColorChange(color)}
                                    aria-label={`Select color ${color}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
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
