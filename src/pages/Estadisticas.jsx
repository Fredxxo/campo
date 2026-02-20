import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart3, CheckCircle, AlertTriangle, XCircle, Calendar, Package, Scale, LayoutGrid, Wrench } from 'lucide-react';

const Estadisticas = () => {
    const [stats, setStats] = useState({});
    const [tallerStats, setTallerStats] = useState({});
    const [tallerCategoryStats, setTallerCategoryStats] = useState({});
    const [circleStats, setCircleStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'circles'

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "circles"), (snapshot) => {
            const rawData = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.history && Array.isArray(data.history)) {
                    rawData.push({ name: doc.id, history: data.history });
                }
            });

            processStats(rawData);
            setLoading(false);
        });

        const unsubscribeTaller = onSnapshot(collection(db, "taller"), (snapshot) => {
            const tStats = {};
            const catStats = {};

            snapshot.forEach(doc => {
                const item = doc.data();

                // 1. Monthly Stats Logic
                if (item.date) {
                    const [year, month] = item.date.split('-');
                    const monthKey = `${year}-${month}`;

                    if (!tStats[monthKey]) {
                        tStats[monthKey] = {
                            total: 0,
                            completed: 0,
                            pending: 0,
                            byCategory: {}
                        };
                    }

                    tStats[monthKey].total++;
                    if (item.status === 'Completado') tStats[monthKey].completed++;
                    else tStats[monthKey].pending++;

                    if (!tStats[monthKey].byCategory[item.category]) {
                        tStats[monthKey].byCategory[item.category] = 0;
                    }
                    tStats[monthKey].byCategory[item.category]++;
                }

                // 2. Global Category Stats Logic
                if (item.category) {
                    if (!catStats[item.category]) {
                        catStats[item.category] = {
                            total: 0,
                            completed: 0,
                            pending: 0,
                            events: []
                        };
                    }
                    catStats[item.category].total++;
                    if (item.status === 'Completado') catStats[item.category].completed++;
                    else catStats[item.category].pending++;

                    catStats[item.category].events.push({
                        date: item.date,
                        description: item.description,
                        status: item.status,
                        operator: item.operator
                    });
                }
            });
            setTallerStats(tStats);
            setTallerCategoryStats(catStats);
        });

        return () => {
            unsubscribe();
            unsubscribeTaller();
        };
    }, []);

    const processStats = (circlesData) => {
        const monthlyStats = {};
        const cStats = {}; // Group by circle

        circlesData.forEach(circle => {
            const history = circle.history;
            if (!history || history.length === 0) return;

            // Initialize circle stats if not exists
            if (!cStats[circle.name]) {
                cStats[circle.name] = {
                    totalCuts: 0,
                    totalQuantity: 0,
                    totalWeight: 0,
                    events: []
                };
            }

            // Sort history by date just in case
            const sortedHistory = [...history].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            for (let i = 0; i < sortedHistory.length; i++) {
                const currentItem = sortedHistory[i];
                const prevItem = i > 0 ? sortedHistory[i - 1] : null; // Handle first item case if needed

                const date = new Date(currentItem.startDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyStats[monthKey]) {
                    monthlyStats[monthKey] = {
                        total: 0,
                        listo: 0,
                        urgente: 0,
                        pasado: 0,
                        details: [],
                        production: {
                            totalQuantity: 0,
                            totalWeight: 0,
                            byQuality: {}, // Initialize byQuality
                            details: []
                        }
                    };
                }

                // 1. Logic for "Corte" Statistics (existing)
                if (currentItem.activity === 'Corte' && (prevItem && prevItem.activity !== 'Corte')) {
                    monthlyStats[monthKey].total++;

                    const previousAlert = prevItem.alert;
                    let status = 'Normal';

                    if (previousAlert === 'Listo para cortar') {
                        monthlyStats[monthKey].listo++;
                        status = 'A tiempo';
                    } else if (previousAlert === 'Cortar urgente') {
                        monthlyStats[monthKey].urgente++;
                        status = 'Urgente';
                    } else if (previousAlert === 'Pasado') {
                        monthlyStats[monthKey].pasado++;
                        status = 'Pasado';
                    }

                    monthlyStats[monthKey].details.push({
                        circle: circle.name,
                        date: date.toLocaleDateString(),
                        status: status,
                        prevAlert: previousAlert,
                        activity: 'Corte'
                    });
                }

                // 2. Logic for "Enfardado" Statistics (NEW)
                if (currentItem.activity === 'Enfardado' && (currentItem.quantity || currentItem.weight)) {
                    const qty = parseInt(currentItem.quantity) || 0;
                    const weight = parseFloat(currentItem.weight) || 0;

                    // Monthly Stats
                    monthlyStats[monthKey].production.totalQuantity += qty;
                    monthlyStats[monthKey].production.totalWeight += weight;
                    monthlyStats[monthKey].production.details.push({
                        circle: circle.name,
                        date: date.toLocaleDateString(),
                        quantity: qty,
                        weight: weight
                    });

                    // Circle Stats
                    cStats[circle.name].totalCuts++;
                    cStats[circle.name].totalQuantity += qty;
                    cStats[circle.name].totalWeight += weight;
                    cStats[circle.name].events.push({
                        date: date.toLocaleDateString(),
                        quantity: qty,
                        weight: weight,
                        quality: currentItem.quality || '-'
                    });
                }
            }
        });

        // Sort months descending
        const sortedKeys = Object.keys(monthlyStats).sort().reverse();
        const sortedStats = {};
        sortedKeys.forEach(key => {
            sortedStats[key] = monthlyStats[key];
        });

        // Sort circles by name (numeric)
        const sortedCircleKeys = Object.keys(cStats).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        const sortedCircleStats = {};
        sortedCircleKeys.forEach(key => sortedCircleStats[key] = cStats[key]);

        setStats(sortedStats);
        setCircleStats(sortedCircleStats);
    };

    // Helper to get all unique months from both stats
    const getAllMonths = () => {
        const months = new Set([...Object.keys(stats), ...Object.keys(tallerStats)]);
        return Array.from(months).sort().reverse();
    };

    const getMonthName = (key) => {
        const [year, month] = key.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    };

    if (loading) {
        return <div className="p-8 text-center text-campo-beige-600">Cargando estadísticas...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Estadísticas</h1>
                    <p className="text-muted-foreground mt-2">Resumen de producción y rendimiento.</p>
                </div>
                <div className="flex bg-campo-beige-200 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-campo-beige-100 text-campo-carbon-900 shadow-sm' : 'text-campo-beige-600 hover:text-campo-carbon-900'}`}
                    >
                        <Calendar className="h-4 w-4" /> Por Mes
                    </button>
                    <button
                        onClick={() => setViewMode('circles')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'circles' ? 'bg-campo-beige-100 text-campo-carbon-900 shadow-sm' : 'text-campo-beige-600 hover:text-campo-carbon-900'}`}
                    >
                        <LayoutGrid className="h-4 w-4" /> Por Círculo
                    </button>
                    <button
                        onClick={() => setViewMode('taller')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'taller' ? 'bg-campo-beige-100 text-campo-carbon-900 shadow-sm' : 'text-campo-beige-600 hover:text-campo-carbon-900'}`}
                    >
                        <Wrench className="h-4 w-4" /> Taller
                    </button>
                </div>
            </div>

            {viewMode === 'monthly' ? (
                getAllMonths().length === 0 ? (
                    <div className="text-center p-12 bg-campo-beige-100 rounded-xl shadow-sm border border-campo-beige-200">
                        <BarChart3 className="mx-auto h-12 w-12 text-campo-beige-400 mb-4" />
                        <h3 className="text-lg font-medium text-campo-carbon-900">No hay datos suficientes</h3>
                        <h3 className="text-lg font-medium text-campo-carbon-900">No hay datos suficientes</h3>
                        <p className="text-campo-beige-600 mt-2">Registra actividades para ver estadísticas.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {getAllMonths().map((monthKey) => {
                            const data = stats[monthKey] || { production: { details: [], byQuality: {}, totalQuantity: 0, totalWeight: 0 }, total: 0, details: [] };
                            const tData = tallerStats[monthKey];

                            return (
                                <div key={monthKey} className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-campo-beige-300 pb-2">
                                        <Calendar className="h-6 w-6 text-indigo-600" />
                                        <h2 className="text-2xl font-bold text-campo-carbon-800">
                                            {getMonthName(monthKey).charAt(0).toUpperCase() + getMonthName(monthKey).slice(1)}
                                        </h2>
                                    </div>

                                    {/* Section: Producción (Enfardado) */}
                                    {data.production.details.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-campo-carbon-600 flex items-center gap-2">
                                                <Package className="h-5 w-5" /> Producción de Rollos/Fardos
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Card className="bg-indigo-50/50 border-indigo-100">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-indigo-600 flex items-center gap-2">
                                                            <Package className="h-4 w-4" />
                                                            Total Unidades
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-3xl font-bold text-indigo-700">{data.production.totalQuantity}</div>
                                                        <p className="text-xs text-indigo-600 mt-1">Rollos / Fardos</p>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-campo-green-50/50 border-blue-100">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-campo-green-600 flex items-center gap-2">
                                                            <Scale className="h-4 w-4" />
                                                            Total Kilos
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-3xl font-bold text-campo-green-700">{data.production.totalWeight.toLocaleString('es-AR')}</div>
                                                        <p className="text-xs text-campo-green-600 mt-1">Kg Totales</p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Breakdown by Quality */}
                                            {Object.keys(data.production.byQuality || {}).length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                    {Object.entries(data.production.byQuality).map(([quality, qData]) => (
                                                        <div key={quality} className="bg-campo-beige-50 rounded-lg p-3 border border-campo-beige-200 flex flex-col">
                                                            <span className="text-xs font-bold text-campo-beige-600 uppercase mb-1">{quality}</span>
                                                            <span className="text-lg font-bold text-campo-carbon-800">{qData.quantity} <span className="text-xs font-normal text-campo-beige-500">un.</span></span>
                                                            <span className="text-xs text-campo-beige-600">{qData.weight.toLocaleString('es-AR')} kg</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}


                                            <div className="bg-campo-beige-100 rounded-lg border border-campo-beige-300 overflow-hidden shadow-sm">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-campo-beige-600 uppercase bg-campo-beige-50 border-b border-campo-beige-200">
                                                        <tr>
                                                            <th className="px-4 py-3 font-medium">Círculo</th>
                                                            <th className="px-4 py-3 font-medium">Fecha</th>
                                                            <th className="px-4 py-3 font-medium text-left">Calidad</th>
                                                            <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                                                            <th className="px-4 py-3 font-medium text-right">Kilos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {data.production.details.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-campo-beige-50">
                                                                <td className="px-4 py-3 font-medium text-campo-carbon-700">{item.circle}</td>
                                                                <td className="px-4 py-3 text-campo-beige-600">{item.date}</td>
                                                                <td className="px-4 py-3 text-left text-campo-carbon-600"><span className="text-xs font-bold px-2 py-0.5 rounded bg-campo-beige-200 border border-campo-beige-300">{item.quality || '-'}</span></td>
                                                                <td className="px-4 py-3 text-right font-mono text-campo-carbon-700">{item.quantity}</td>
                                                                <td className="px-4 py-3 text-right font-mono text-campo-carbon-700">{item.weight} kg</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Section: Cortes Efficiency */}
                                    {data.total > 0 && (
                                        <div className="space-y-4 pt-4 border-t border-campo-beige-200 mt-8">
                                            <h3 className="text-lg font-semibold text-campo-carbon-600 flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5" /> Eficiencia de Cortes
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Card className="bg-emerald-50/50 border-emerald-100">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4" />
                                                            A Tiempo
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-2xl font-bold text-emerald-700">{data.listo}</div>
                                                        <p className="text-xs text-emerald-600 mt-1">
                                                            {((data.listo / data.total) * 100).toFixed(0)}% del total
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-amber-50/50 border-amber-100">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            Urgente
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-2xl font-bold text-amber-700">{data.urgente}</div>
                                                        <p className="text-xs text-amber-600 mt-1">
                                                            {((data.urgente / data.total) * 100).toFixed(0)}% del total
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-red-50/50 border-red-100">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                                                            <XCircle className="h-4 w-4" />
                                                            Pasado
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-2xl font-bold text-red-700">{data.pasado}</div>
                                                        <p className="text-xs text-red-600 mt-1">
                                                            {((data.pasado / data.total) * 100).toFixed(0)}% del total
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Optional: Detailed list */}
                                            <div className="bg-campo-beige-100 rounded-lg border border-campo-beige-300 overflow-hidden">
                                                <div className="px-4 py-3 bg-campo-beige-50 border-b border-campo-beige-300 text-xs font-semibold text-campo-beige-600 uppercase tracking-wider">
                                                    Detalle de cortes ({data.total})
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {data.details.map((detail, idx) => (
                                                        <div key={idx} className="px-4 py-3 flex justify-between items-center text-sm hover:bg-campo-beige-50">
                                                            <div className="font-medium text-campo-carbon-700">{detail.circle}</div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-campo-beige-600 text-xs">{detail.date}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${detail.status === 'A tiempo' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                                    detail.status === 'Urgente' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                        detail.status === 'Pasado' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                            'bg-campo-beige-200 text-campo-carbon-600 border-campo-beige-300'
                                                                    }`}>
                                                                    {detail.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Section: Taller Statistics */}
                                    {tData && (
                                        <div className="space-y-4 pt-4 border-t border-campo-beige-200 mt-8">
                                            <h3 className="text-lg font-semibold text-campo-carbon-600 flex items-center gap-2">
                                                <Wrench className="h-5 w-5" /> Mantenimiento (Taller)
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Card className="bg-campo-beige-50/50 border-campo-beige-300">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-campo-carbon-600 flex items-center gap-2">
                                                            <Wrench className="h-4 w-4" />
                                                            Total Entradas
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-2xl font-bold text-campo-carbon-700">{tData.total}</div>
                                                        <p className="text-xs text-campo-beige-600 mt-1">
                                                            Mantenimientos registrados
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-amber-50/50 border-amber-100">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            Pendientes
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-2xl font-bold text-amber-700">{tData.pending}</div>
                                                        <p className="text-xs text-amber-600 mt-1">
                                                            En proceso o espera
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-emerald-50/50 border-emerald-100">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4" />
                                                            Completados
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-2xl font-bold text-emerald-700">{tData.completed}</div>
                                                        <p className="text-xs text-emerald-600 mt-1">
                                                            Finalizados exitosamente
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Breakdown by Category */}

                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : viewMode === 'circles' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.keys(circleStats).length === 0 ? (
                        <div className="col-span-full text-center p-12 bg-campo-beige-100 rounded-xl shadow-sm border border-campo-beige-200">
                            <BarChart3 className="mx-auto h-12 w-12 text-campo-beige-400 mb-4" />
                            <h3 className="text-lg font-medium text-campo-carbon-900">No hay datos por círculo</h3>
                            <p className="text-campo-beige-600 mt-2">Registra producciones para ver el desglose por círculo.</p>
                        </div>
                    ) : (
                        Object.entries(circleStats).map(([circuloName, cData]) => (
                            <Card key={circuloName} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3 border-b border-campo-beige-200">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg font-bold text-campo-carbon-800">{circuloName}</CardTitle>
                                        <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-100">
                                            {cData.totalCuts} {cData.totalCuts === 1 ? 'Corte' : 'Cortes'}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-campo-beige-600 mb-1">Total Unidades</p>
                                            <p className="text-xl font-bold text-campo-carbon-700">{cData.totalQuantity}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-campo-beige-600 mb-1">Total Kg</p>
                                            <p className="text-xl font-bold text-campo-carbon-700">{cData.totalWeight.toLocaleString('es-AR')}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-campo-beige-200 pt-3">
                                        <p className="text-xs font-semibold text-campo-beige-600 uppercase mb-2">Historial de Producción</p>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {cData.events.slice().reverse().map((event, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm p-2 bg-campo-beige-50 rounded-md">
                                                    <div className="flex flex-col">
                                                        <span className="text-campo-beige-600 text-xs">{event.date}</span>
                                                        <span className="text-[10px] font-bold text-indigo-600 uppercase">{event.quality}</span>
                                                    </div>
                                                    <div className="flex gap-3 text-xs font-medium text-campo-carbon-700">
                                                        <span>{event.quantity} u.</span>
                                                        <span>{event.weight} kg</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.keys(tallerCategoryStats).length === 0 ? (
                        <div className="col-span-full text-center p-12 bg-campo-beige-100 rounded-xl shadow-sm border border-campo-beige-200">
                            <Wrench className="mx-auto h-12 w-12 text-campo-beige-400 mb-4" />
                            <h3 className="text-lg font-medium text-campo-carbon-900">No hay datos de taller</h3>
                            <p className="text-campo-beige-600 mt-2">Registra mantenimientos en Taller para ver las estadísticas.</p>
                        </div>
                    ) : (
                        Object.entries(tallerCategoryStats).map(([category, cData]) => (
                            <Card key={category} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3 border-b border-campo-beige-200">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg font-bold text-campo-carbon-800">{category}</CardTitle>
                                        <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-100">
                                            {cData.total} {cData.total === 1 ? 'Entrada' : 'Entradas'}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-campo-beige-600 mb-1">Pendientes</p>
                                            <p className="text-xl font-bold text-amber-600">{cData.pending}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-campo-beige-600 mb-1">Completados</p>
                                            <p className="text-xl font-bold text-emerald-600">{cData.completed}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-campo-beige-200 pt-3">
                                        <p className="text-xs font-semibold text-campo-beige-600 uppercase mb-2">Historial Reciente</p>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {cData.events.sort((a, b) => new Date(b.date) - new Date(a.date)).map((event, idx) => (
                                                <div key={idx} className="flex flex-col text-sm p-2 bg-campo-beige-50 rounded-md">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] text-campo-beige-500">{event.date}</span>
                                                        {event.status === 'Pendiente' ?
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">Pdte</span> :
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Ok</span>
                                                        }
                                                    </div>
                                                    <span className="text-campo-carbon-700 font-medium truncate">{event.description}</span>
                                                    {event.operator && <span className="text-xs text-campo-beige-600 mt-0.5">{event.operator}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div >
    );
};

export default Estadisticas;
