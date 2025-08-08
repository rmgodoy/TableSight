
'use client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Brush, CircleUserRound, Eraser, Hand, Maximize, MousePointer, PenLine, Redo, Shield, Undo, ZoomIn, ZoomOut } from 'lucide-react';
import type { Tool } from './gm-view';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface GmSidebarProps {
    selectedTool: Tool;
    onToolSelect: (tool: Tool) => void;
    undo: () => void;
    redo: () => void;
    resetView: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
}


export function GmSidebar({ 
    selectedTool, 
    onToolSelect,
    undo,
    redo,
    resetView,
    zoomIn,
    zoomOut
}: GmSidebarProps) {
    const tools: { id: Tool, label: string, icon: React.ReactNode }[] = [
        { id: 'select', label: 'Select', icon: <MousePointer /> },
        { id: 'wall', label: 'Wall', icon: <Brush /> },
        { id: 'detail', label: 'Detail', icon: <PenLine /> },
        { id: 'erase', label: 'Erase', icon: <Eraser /> },
        { id: 'add-pc', label: 'Add PC', icon: <CircleUserRound /> },
        { id: 'add-enemy', label: 'Add Enemy', icon: <Shield /> },
    ];

    const viewTools = [
        { id: 'undo', label: 'Undo', icon: <Undo />, action: undo },
        { id: 'redo', label: 'Redo', icon: <Redo />, action: redo },
        { id: 'zoom-in', label: 'Zoom In', icon: <ZoomIn />, action: zoomIn },
        { id: 'zoom-out', label: 'Zoom Out', icon: <ZoomOut />, action: zoomOut },
        { id: 'reset-view', label: 'Reset View', icon: <Maximize />, action: resetView },
    ];

    return (
        <TooltipProvider delayDuration={100}>
            <aside className="w-16 h-full flex flex-col items-center p-2 gap-2 border-r border-border bg-card z-20">
                <h1 className="text-2xl font-bold font-headline text-primary pb-2">TA</h1>
                <Separator />
                <div className="flex flex-col gap-2">
                    {tools.map(tool => (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                 <Button 
                                    size="icon"
                                    variant={selectedTool === tool.id ? 'default' : 'ghost'}
                                    className="w-10 h-10"
                                    onClick={() => onToolSelect(tool.id)}
                                >
                                    {tool.icon}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>{tool.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
                 <Separator />
                <div className="flex flex-col gap-2">
                    {viewTools.map(tool => (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                 <Button 
                                    size="icon"
                                    variant='ghost'
                                    className="w-10 h-10"
                                    onClick={tool.action}
                                >
                                    {tool.icon}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>{tool.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </aside>
        </TooltipProvider>
    );
}
