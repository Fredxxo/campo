import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Circle, History, X, Calendar, ArrowRight, Clock, Trash2, AlertTriangle } from 'lucide-react';

const Circulos = () => {
    // Definición inicial de círculos
    const initialCirculosList = [
        { name: "17 sur", hectares: 49 },
        { name: "17 norte", hectares: 49 },
        { name: "15(1)", hectares: 35 },
        { name: "15(4)", hectares: 35 },
        { name: "3(2)", hectares: 28 },
        { name: "3(3)", hectares: 28 },
        { name: "5(3)", hectares: 28 },
        { name: "5(4)", hectares: 28 },
        { name: "9 SUR", hectares: 25 },
        { name: "9 NORTE", hectares: 25 },
        { name: "11 SUR", hectares: 25 },
        { name: "11 NORTE", hectares: 25 },
        { name: "1 COMPLT", hectares: 9 },
        { name: "4(4)", hectares: 28 },
        { name: "18(2)", hectares: 20.67 },
        { name: "18(1)", hectares: 20.66 },
        { name: "18(3)", hectares: 20.66 },
        { name: "2(1)", hectares: 17 },
        { name: "2(2)", hectares: 17 },
        { name: "3(3 contorno)", hectares: null },
        { name: "5(2)", hectares: 28 },
        { name: "3(1)", hectares: 28 },
        { name: "14(1)", hectares: 37.5 },
        { name: "14(4)", hectares: 37.5 }
    ];

    const [circulosList, setCirculosList] = useState(initialCirculosList);

    // Estado principal para guardar la historia de actividades
    // Estructura: { [nombreCirculo]: [{ id, activity, situation, alert, startDate, endDate }] }
    // situation: 'Iniciado', 'En Proceso', 'Finalizado'
    // alert: '', 'Listo para cortar', 'Cortar urgente', 'Pasado'
    const [history, setHistory] = useState({});

    // Estado para controlar qué círculo se está inspeccionando (historial)
    const [selectedCircle, setSelectedCircle] = useState(null);

    // Inicializar el estado de historia si está vacío
    useEffect(() => {
        setHistory(prev => {
            const newHistory = { ...prev };
            let hasChanges = false;

            circulosList.forEach(c => {
                if (!newHistory[c.name] || newHistory[c.name].length === 0) {
                    newHistory[c.name] = [{
                        id: Date.now() + Math.random(), // Simple unique ID
                        activity: '',
                        situation: 'Iniciado',
                        alert: '',
                        startDate: new Date().toISOString(),
                        endDate: null
                    }];
                    hasChanges = true;
                }
            });

            return hasChanges ? newHistory : prev;
        });
    }, [circulosList]);

    const getCurrentState = (circuloName) => {
        const circleHistory = history[circuloName];
        if (!circleHistory || circleHistory.length === 0) return { activity: '', situation: 'Iniciado', alert: '' };
        return circleHistory[circleHistory.length - 1];
    };

    const handleHectaresChange = (index, newValue) => {
        const updatedList = [...circulosList];
        updatedList[index].hectares = newValue;
        setCirculosList(updatedList);
    };

    // Helper to close current record and start new one
    const createNewHistoryEntry = (prevHistory, circuloName, changes) => {
        const currentHistory = prevHistory[circuloName] ? [...prevHistory[circuloName]] : [];
        const now = new Date().toISOString();

        if (currentHistory.length === 0) return prevHistory;

        const lastIndex = currentHistory.length - 1;
        const currentItem = currentHistory[lastIndex];

        // Close current
        if (!currentItem.endDate) {
            currentHistory[lastIndex] = {
                ...currentItem,
                endDate: now
            };
        }

        // Create new with changes applied to current state
        currentHistory.push({
            id: Date.now(),
            activity: changes.activity !== undefined ? changes.activity : currentItem.activity,
            situation: changes.situation !== undefined ? changes.situation : currentItem.situation,
            alert: changes.alert !== undefined ? changes.alert : currentItem.alert, // Preserve or update alert
            startDate: now,
            endDate: null
        });

        return {
            ...prevHistory,
            [circuloName]: currentHistory
        };
    };

    const handleActivityChange = (circuloName, newActivity) => {
        setHistory(prev => createNewHistoryEntry(prev, circuloName, {
            activity: newActivity,
            situation: 'Iniciado', // Reset situation on new activity? Or keep? usually reset to start.
            alert: '' // Reset alert on new activity? usually safe to assume.
        }));
    };

    const handleSituationChange = (circuloName, newSituation) => {
        setHistory(prev => createNewHistoryEntry(prev, circuloName, { situation: newSituation }));
    };

    const handleAlertChange = (circuloName, newAlert) => {
        setHistory(prev => createNewHistoryEntry(prev, circuloName, { alert: newAlert }));
    };

    // Eliminar un item del historial
    const deleteHistoryItem = (circuloName, itemId) => {
        setHistory(prev => {
            const currentHistory = prev[circuloName] ? [...prev[circuloName]] : [];
            const updatedHistory = currentHistory.filter(item => item.id !== itemId);

            if (updatedHistory.length === 0) {
                updatedHistory.push({
                    id: Date.now(),
                    activity: '',
                    situation: 'Iniciado',
                    alert: '',
                    startDate: new Date().toISOString(),
                    endDate: null
                });
            }

            return {
                ...prev,
                [circuloName]: updatedHistory
            };
        });
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric' //, hour: '2-digit', minute: '2-digit'
        });
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString('es-AR', {
            hour: '2-digit', minute: '2-digit'
        });
    }

    const getActivityColor = (activity) => {
        switch (activity) {
            case 'Corte': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'Rastrillado': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'Enfardado': return 'text-purple-600 bg-purple-50 border-purple-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    // Card colors driven by ALERT status now
    const getAlertColor = (alert) => {
        switch (alert) {
            case 'Listo para cortar': return 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30';
            case 'Cortar urgente': return 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30';
            case 'Pasado': return 'border-red-500 ring-1 ring-red-500 bg-red-50/30';
            default: return 'border-transparent hover:border-campo-beige-300';
        }
    };

    const getAlertBadgeColor = (alert) => {
        switch (alert) {
            case 'Listo para cortar': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
            case 'Cortar urgente': return 'text-amber-700 bg-amber-100 border-amber-200';
            case 'Pasado': return 'text-red-700 bg-red-100 border-red-200';
            default: return 'text-slate-500 bg-slate-100 border-slate-200';
        }
    };

    // Basic badge for situation/process
    const getSituationBadgeColor = (situation) => {
        return 'text-slate-600 bg-slate-100 border-slate-200';
    };

    return (
        <div className="space-y-6 relative">
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
                {circulosList.map((circulo, index) => {
                    const currentState = getCurrentState(circulo.name);
                    const activityColorClass = getActivityColor(currentState.activity);
                    const cardColorClass = getAlertColor(currentState.alert); // Color based on alert
                    const alertBadgeClass = getAlertBadgeColor(currentState.alert);

                    return (
                        <Card
                            key={index}
                            className={`hover:shadow-md transition-all duration-300 group cursor-pointer bg-white ${cardColorClass}`}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${activityColorClass}`}>
                                        <Circle className="h-5 w-5" />
                                    </div>

                                    {/* Alert Selector (Top Right) */}
                                    <div className="relative">
                                        <select
                                            className={`appearance-none text-xs font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 text-right ${currentState.alert ? alertBadgeClass : 'text-slate-400 bg-slate-50 border-slate-200'}`}
                                            value={currentState.alert || ''}
                                            onChange={(e) => handleAlertChange(circulo.name, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">Normal</option>
                                            <option value="Listo para cortar">Listo para cortar</option>
                                            <option value="Cortar urgente">Cortar urgente</option>
                                            <option value="Pasado">Pasado</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                        {circulo.name}
                                    </h3>
                                    <div className="flex items-center bg-slate-50 rounded-md px-2 py-1 border border-transparent hover:border-slate-200 transition-colors">
                                        <input
                                            type="number"
                                            className="w-12 bg-transparent text-xs font-medium text-slate-600 focus:outline-none text-right"
                                            value={circulo.hectares || ''}
                                            onChange={(e) => handleHectaresChange(index, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="-"
                                        />
                                        <span className="text-xs font-medium text-slate-400 ml-1">Has</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-slate-500 hover:text-primary p-0 h-auto font-normal flex items-center gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCircle(circulo.name);
                                        }}
                                    >
                                        <History className="h-3 w-3" /> Ver Historial
                                    </Button>
                                    <span className="text-[10px] text-slate-400">
                                        {currentState.startDate ? formatDate(currentState.startDate) : ''}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 block mb-1">Actividad</label>
                                        <select
                                            className="w-full text-xs border-slate-200 rounded-md p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                            value={currentState.activity || ''}
                                            onChange={(e) => handleActivityChange(circulo.name, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="Corte">Corte</option>
                                            <option value="Rastrillado">Rastrillado</option>
                                            <option value="Enfardado">Enfardado</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500 block mb-1">Situación</label>
                                        <select
                                            className="w-full text-xs border-slate-200 rounded-md p-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                            value={currentState.situation || 'Iniciado'}
                                            onChange={(e) => handleSituationChange(circulo.name, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="Iniciado">Iniciado</option>
                                            <option value="En Proceso">En Proceso</option>
                                            <option value="Finalizado">Finalizado</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* History Modal / Overlay */}
            {selectedCircle && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCircle(null)}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Historial de Actividades</h2>
                                <p className="text-sm text-slate-500">Círculo: {selectedCircle}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedCircle(null)}>
                                <X className="h-5 w-5 text-slate-400 hover:text-red-500" />
                            </Button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pl-6 py-2">
                                {(history[selectedCircle] || []).slice().reverse().map((item, idx) => (
                                    <div key={item.id} className="relative group">
                                        <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${getActivityColor(item.activity).split(' ')[1] || 'bg-slate-300'}`}></div>

                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 hover:border-slate-300 transition-colors relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col gap-1">
                                                    <h3 className={`font-bold text-sm px-2 py-0.5 rounded-md w-fit ${getActivityColor(item.activity)}`}>
                                                        {item.activity || 'Sin actividad'}
                                                    </h3>
                                                    {/* Show alert in history if present */}
                                                    {item.alert && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${getAlertBadgeColor(item.alert)}`}>
                                                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                                                            {item.alert}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getSituationBadgeColor(item.situation)}`}>
                                                        {item.situation}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteHistoryItem(selectedCircle, item.id);
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                        title="Eliminar registro"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 mt-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>Inicio: {formatDate(item.startDate)} <span className="text-slate-400 ml-1">{formatTime(item.startDate)}</span></span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.endDate ? (
                                                        <>
                                                            <div className="w-3 flex justify-center"><ArrowRight className="h-3 w-3" /></div>
                                                            <span>Fin: {formatDate(item.endDate)} <span className="text-slate-400 ml-1">{formatTime(item.endDate)}</span></span>
                                                        </>
                                                    ) : (
                                                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> En curso
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(history[selectedCircle] || []).length === 0 && (
                                    <p className="text-center text-slate-400 py-8">No hay historial registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Circulos;
