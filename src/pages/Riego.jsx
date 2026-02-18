import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Calendar } from 'lucide-react';

const Riego = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Riego</h1>
                    <p className="text-muted-foreground mt-2">Control y programación de riego.</p>
                </div>
                <Button className="shadow-lg shadow-primary/30">
                    <Calendar className="mr-2 h-4 w-4" /> Programar Riego
                </Button>
            </div>

            <Card className="min-h-[24rem] flex items-center justify-center border-dashed">
                <CardContent>
                    <p className="text-muted-foreground text-lg">Contenido de Riego</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default Riego;

