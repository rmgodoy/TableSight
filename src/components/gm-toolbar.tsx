'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MousePointer, Square, Layers, Eraser, CircleUserRound, Shield } from 'lucide-react';

export function GmToolbar() {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Map</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="flex items-center justify-start gap-2"><MousePointer /> Select</Button>
                        <Button variant="outline" className="flex items-center justify-start gap-2"><Square /> Wall</Button>
                        <Button variant="outline" className="flex items-center justify-start gap-2"><Layers /> Floor</Button>
                        <Button variant="outline" className="flex items-center justify-start gap-2"><Eraser /> Erase</Button>
                    </div>
                </div>
                <Separator />
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Tokens</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="flex items-center justify-start gap-2"><CircleUserRound /> Add PC</Button>
                        <Button variant="outline" className="flex items-center justify-start gap-2"><Shield /> Add Enemy</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
