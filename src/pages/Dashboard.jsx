import React from 'react';
import { ArrowUpRight, ArrowDownRight, Circle, Droplets, DollarSign, Wrench, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const StatCard = ({ title, value, change, icon: Icon, colorClass }) => (
    <Card>
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClass}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
                <span className={`flex items-center font-medium ${change >= 0 ? 'text-campo-green-600' : 'text-rose-600'}`}>
                    {change >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                    {Math.abs(change)}%
                </span>
                <span className="text-muted-foreground ml-2">vs mes anterior</span>
            </div>
        </CardContent>
    </Card>
);

const Dashboard = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Panel General</h1>
                <p className="text-muted-foreground mt-2">Bienvenido al sistema de administración de campo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Círculos Activos"
                    value="12"
                    change={8.2}
                    icon={Circle}
                    colorClass="bg-blue-600"
                />
                <StatCard
                    title="Riego (mm)"
                    value="450"
                    change={-2.4}
                    icon={Droplets}
                    colorClass="bg-cyan-600"
                />
                <StatCard
                    title="Mantenimiento"
                    value="3"
                    change={0}
                    icon={Wrench}
                    colorClass="bg-orange-500"
                />
                <StatCard
                    title="Ventas Totales"
                    value="$124.5k"
                    change={12.5}
                    icon={DollarSign}
                    colorClass="bg-campo-green-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start gap-4 p-3 hover:bg-campo-beige-100 rounded-lg transition-colors border border-transparent hover:border-campo-beige-200">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-campo-green-500" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Mantenimiento completado en Círculo #{i + 3}</p>
                                        <p className="text-xs text-muted-foreground">Hace {i * 2} horas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-md">
                    <div className="bg-gradient-to-br from-sky-500 to-blue-600 h-full p-6 text-white relative">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <h2 className="text-lg font-bold mb-1">Estado del Tiempo</h2>
                                <p className="text-lg font-semibold opacity-90">Soleado</p>
                                <p className="text-5xl font-bold mt-4">24°C</p>
                            </div>
                            <Droplets className="w-24 h-24 opacity-20 absolute -right-4 -top-4" />
                            <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                                <Wind className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-black/10 rounded-lg p-3 backdrop-blur-sm">
                                <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Humedad</p>
                                <p className="text-xl font-semibold">45%</p>
                            </div>
                            <div className="bg-black/10 rounded-lg p-3 backdrop-blur-sm">
                                <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Viento</p>
                                <p className="text-xl font-semibold">12 km/h</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;

