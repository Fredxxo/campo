import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Circle } from 'lucide-react';

const Circulos = () => {
    const circulosList = [
        "1 COMPLT",
        "2(1)", "2(2)",
        "3(1)", "3(2)", "3(3)", "3(3 contorno)",
        "4(4)",
        "5(2)", "5(3)", "5(4)",
        "9 SUR", "9 NORTE",
        "11 SUR", "11 NORTE",
        "14(1)", "14(4)",
        "15(1)", "15(4)",
        "17(2)", "17(3)",
        "18(1)", "18(2)", "18(3)"
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Círculos</h1>
                    <p className="text-muted-foreground mt-2">Gestión de lotes y pivots.</p>
                </div>
                <Button className="shadow-lg shadow-primary/30">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Círculo
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {circulosList.map((circulo, index) => (
                    <Card
                        key={index}
                        className="hover:shadow-md transition-all duration-300 group cursor-pointer border-transparent hover:border-campo-beige-300 bg-white"
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-campo-green-50 flex items-center justify-center text-campo-green-600 group-hover:bg-campo-green-600 group-hover:text-white transition-colors duration-300">
                                    <Circle className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-semibold text-campo-green-700 bg-campo-green-100 px-2 py-1 rounded-full border border-campo-green-200">
                                    Activo
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                {circulo}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Lote agrícola
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Circulos;

