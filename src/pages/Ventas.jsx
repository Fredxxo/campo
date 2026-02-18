import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Plus } from 'lucide-react';

const Ventas = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Ventas</h1>
                    <p className="text-muted-foreground mt-2">Registro de ventas y facturación.</p>
                </div>
                <Button className="shadow-lg shadow-primary/30">
                    <Plus className="mr-2 h-4 w-4" /> Nueva Venta
                </Button>
            </div>

            <Card className="min-h-[24rem] flex items-center justify-center border-dashed">
                <CardContent>
                    <p className="text-muted-foreground text-lg">Contenido de Ventas</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default Ventas;

