
'use client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Brush, Circle as CircleIcon, CircleUserRound, Eraser, Hand, Maximize, MousePointer, PenLine, Redo, Shield, Square, Undo, Upload, ZoomIn, ZoomOut, DoorOpen, Lightbulb } from 'lucide-react';
import type { Tool } from './gm-view';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRef } from 'react';

interface GmSidebarProps {
    selectedTool: Tool;
    onToolSelect: (tool: Tool) => void;
    onImport: (file: File) => void;
    undo: () => void;
    redo: () => void;
    resetView: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
}


export function GmSidebar({ 
    selectedTool, 
    onToolSelect,
    onImport,
    undo,
    redo,
    resetView,
    zoomIn,
    zoomOut
}: GmSidebarProps) {
    const importInputRef = useRef<HTMLInputElement>(null);

    const tools: { id: Tool, label: string, icon: React.ReactNode }[] = [
        { id: 'select', label: 'Select', icon: <MousePointer /> },
        { id: 'draw', label: 'Draw', icon: <Brush /> },
        { id: 'rectangle', label: 'Rectangle', icon: <Square /> },
        { id: 'circle', label: 'Circle', icon: <CircleIcon /> },
        { id: 'portal', label: 'Portal', icon: <DoorOpen /> },
        { id: 'erase', label: 'Erase', icon: <Eraser /> },
        { id: 'add-pc', label: 'Add PC', icon: <CircleUserRound /> },
        { id: 'add-enemy', label: 'Add Enemy', icon: <Shield /> },
        { id: 'add-light', label: 'Add Light', icon: <Lightbulb /> },
    ];

    const viewTools = [
        { id: 'undo', label: 'Undo', icon: <Undo />, action: undo },
        { id: 'redo', label: 'Redo', icon: <Redo />, action: redo },
        { id: 'zoom-in', label: 'Zoom In', icon: <ZoomIn />, action: zoomIn },
        { id: 'zoom-out', label: 'Zoom Out', icon: <ZoomOut />, action: zoomOut },
        { id: 'reset-view', label: 'Reset View', icon: <Maximize />, action: resetView },
    ];

    const handleImportClick = () => {
        importInputRef.current?.click();
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
        }
        // Reset the input value to allow re-uploading the same file
        event.target.value = '';
    };

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
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button 
                                size="icon"
                                variant='ghost'
                                className="w-10 h-10"
                                onClick={handleImportClick}
                            >
                                <Upload />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p>Import .dd2vtt Map</p>
                        </TooltipContent>
                    </Tooltip>
                    <input 
                        type="file" 
                        ref={importInputRef} 
                        className="hidden" 
                        accept=".dd2vtt"
                        onChange={handleFileChange} 
                    />
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
