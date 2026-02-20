import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Plus, Play, Square, X, Clock, Trash2, Droplet, History, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';

const Riego = () => {
    const [pivots, setPivots] = useState([]);
    const [circles, setCircles] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newPivotName, setNewPivotName] = useState('');
    const [now, setNow] = useState(Date.now());
    const [selectedCircleIds, setSelectedCircleIds] = useState({});
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, pivotId: null, pivotName: '' });
    const [expandedPivot, setExpandedPivot] = useState(null);
    const [riegoHistoryByCircle, setRiegoHistoryByCircle] = useState({});
    const [shakeDropdown, setShakeDropdown] = useState(null);

    useEffect(() => {
        const unsubPivots = onSnapshot(collection(db, "pivots"), (snapshot) => {
            const p = [];
            snapshot.forEach(doc => {
                p.push({ id: doc.id, ...doc.data() });
            });
            p.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setPivots(p);
        });

        const unsubCircles = onSnapshot(collection(db, "circles"), (snapshot) => {
            const c = [];
            const riegoData = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.deleted) {
                    c.push({ id: doc.id, name: doc.id, ...data });
                    if (data.riegoHistory && data.riegoHistory.length > 0) {
                        riegoData[doc.id] = data.riegoHistory;
                    }
                }
            });
            c.sort((a, b) => {
                const numA = parseInt(a.name);
                const numB = parseInt(b.name);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.name.localeCompare(b.name);
            });
            setCircles(c);
            setRiegoHistoryByCircle(riegoData);
        });

        const timer = setInterval(() => setNow(Date.now()), 1000);

        return () => {
            unsubPivots();
            unsubCircles();
            clearInterval(timer);
        };
    }, []);

    // Initialize selected circles from active pivots
    useEffect(() => {
        const initialSelected = {};
        pivots.forEach(p => {
            if (p.activeCircle) {
                initialSelected[p.id] = p.activeCircle;
            }
        });
        setSelectedCircleIds(prev => ({ ...prev, ...initialSelected }));
    }, [pivots]);

    const handleAddPivot = async () => {
        if (!newPivotName.trim()) return;
        try {
            const id = newPivotName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            await setDoc(doc(db, "pivots", id), {
                name: newPivotName,
                activeCircle: null,
                startTime: null
            });
            setIsAddModalOpen(false);
            setNewPivotName('');
        } catch (error) {
            console.error("Error adding pivot:", error);
            alert("Hubo un error al crear el Pivot.");
        }
    };

    const handleDeletePivot = async () => {
        const { pivotId } = deleteConfirmation;
        if (!pivotId) return;
        try {
            await deleteDoc(doc(db, "pivots", pivotId));
            setDeleteConfirmation({ isOpen: false, pivotId: null, pivotName: '' });
        } catch (error) {
            console.error("Error deleting pivot:", error);
            alert("Hubo un error al eliminar el pivot.");
        }
    };

    const handleStartRiego = async (pivot) => {
        const circleId = selectedCircleIds[pivot.id];
        if (!circleId) {
            setShakeDropdown(pivot.id);
            setTimeout(() => setShakeDropdown(null), 1000);
            return;
        }
        try {
            await updateDoc(doc(db, "pivots", pivot.id), {
                activeCircle: circleId,
                startTime: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error starting riego:", error);
        }
    };

    const handleStopRiego = async (pivot) => {
        if (!pivot.startTime || !pivot.activeCircle) return;
        try {
            const endTime = new Date();
            const startTime = new Date(pivot.startTime);
            const diffMs = endTime - startTime;
            const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

            // Save to circle history for reporting
            const circleRef = doc(db, "circles", pivot.activeCircle);
            await setDoc(circleRef, {
                riegoHistory: arrayUnion({
                    id: Date.now(),
                    pivotId: pivot.id,
                    pivotName: pivot.name,
                    startTime: pivot.startTime,
                    endTime: endTime.toISOString(),
                    durationHours: parseFloat(diffHours)
                })
            }, { merge: true });

            // Reset pivot status but keep the circle selected in dropdown
            const lastCircle = pivot.activeCircle;
            await updateDoc(doc(db, "pivots", pivot.id), {
                activeCircle: null,
                startTime: null
            });

            // Keep the last circle selected for quick re-toggle
            setSelectedCircleIds(prev => ({ ...prev, [pivot.id]: lastCircle }));
        } catch (error) {
            console.error("Error stopping riego:", error);
            alert("Hubo un error al detener el riego.");
        }
    };

    const deleteRiegoEntry = async (circleId, entryId) => {
        try {
            const history = riegoHistoryByCircle[circleId] || [];
            const updatedHistory = history.filter(e => e.id !== entryId);
            await setDoc(doc(db, "circles", circleId), { riegoHistory: updatedHistory }, { merge: true });
        } catch (error) {
            console.error("Error deleting riego entry:", error);
            alert("Hubo un error al eliminar el registro.");
        }
    };

    const getElapsedTime = (isoString) => {
        if (!isoString) return "";
        const diff = now - new Date(isoString).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString('es-AR', {
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Calculate total hours per circle from riegoHistory
    const getCircleHoursSummary = () => {
        const summary = {};
        Object.entries(riegoHistoryByCircle).forEach(([circleId, historyArr]) => {
            const totalHours = historyArr.reduce((sum, entry) => sum + (entry.durationHours || 0), 0);
            const lastRiego = historyArr.length > 0
                ? historyArr.reduce((latest, entry) => {
                    const entryTime = new Date(entry.endTime || entry.startTime).getTime();
                    return entryTime > latest ? entryTime : latest;
                }, 0)
                : null;
            summary[circleId] = {
                totalHours: totalHours.toFixed(1),
                totalSessions: historyArr.length,
                lastRiego
            };
        });

        // Add circles with active riego (in-progress, not yet recorded)
        pivots.forEach(p => {
            if (p.startTime && p.activeCircle && !summary[p.activeCircle]) {
                summary[p.activeCircle] = { totalHours: '0.0', totalSessions: 0, lastRiego: null, active: true };
            }
            if (p.startTime && p.activeCircle && summary[p.activeCircle]) {
                summary[p.activeCircle].active = true;
            }
        });

        return summary;
    };

    // Get riego history for a specific pivot
    const getPivotHistory = (pivotId) => {
        const allEntries = [];
        Object.entries(riegoHistoryByCircle).forEach(([circleId, historyArr]) => {
            historyArr.forEach(entry => {
                if (entry.pivotId === pivotId) {
                    allEntries.push({ ...entry, circleName: circleId });
                }
            });
        });
        allEntries.sort((a, b) => new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime));
        return allEntries;
    };

    const circleSummary = getCircleHoursSummary();
    const sortedCircleSummary = Object.entries(circleSummary).sort((a, b) => parseFloat(b[1].totalHours) - parseFloat(a[1].totalHours));

    return (
        <div className="space-y-8 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Riego</h1>
                    <p className="text-muted-foreground mt-2">Gestión y control de pivots.</p>
                </div>
                <Button className="shadow-lg shadow-primary/30 bg-campo-green-600 hover:bg-campo-green-700 text-white" onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Agregar Pivot
                </Button>
            </div>

            {/* Pivot Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pivots.map(pivot => {
                    const isRunning = !!pivot.startTime;
                    const pivotHistory = getPivotHistory(pivot.id);
                    const isExpanded = expandedPivot === pivot.id;
                    const activeCircleName = circles.find(c => c.id === pivot.activeCircle)?.name;

                    return (
                        <Card key={pivot.id} className={`border-2 transition-all ${isRunning ? 'border-campo-green-400 shadow-[0_0_15px_rgba(45,106,79,0.2)] bg-campo-green-50/30' : 'border-transparent'}`}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-full ${isRunning ? 'bg-campo-green-100 text-campo-green-600 animate-pulse' : 'bg-campo-beige-200 text-campo-beige-600'}`}>
                                            <Droplet className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-campo-carbon-800">{pivot.name}</h3>
                                            <p className="text-xs font-medium text-campo-beige-600">
                                                {isRunning ? (
                                                    <span className="text-campo-green-600">
                                                        Regando <span className="font-bold">{activeCircleName || pivot.activeCircle}</span>
                                                    </span>
                                                ) : 'Apagado'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isRunning && (
                                            <div className="flex items-center gap-1 text-campo-green-700 font-mono text-sm bg-campo-green-100 px-2 py-1 rounded-md">
                                                <Clock className="h-3 w-3" />
                                                {getElapsedTime(pivot.startTime)}
                                            </div>
                                        )}
                                        {!isRunning && (
                                            <button
                                                className="text-campo-beige-400 hover:text-red-500 hover:bg-campo-beige-100 p-1.5 rounded-full transition-colors"
                                                onClick={() => setDeleteConfirmation({ isOpen: true, pivotId: pivot.id, pivotName: pivot.name })}
                                                title="Eliminar pivot"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-campo-carbon-600 mb-1 block">Círculo Asignado</label>
                                        <select
                                            className={`w-full text-sm rounded-md p-2.5 bg-campo-beige-50 focus:ring-2 focus:ring-campo-green-500 disabled:opacity-50 transition-all ${shakeDropdown === pivot.id ? 'border-red-500 ring-2 ring-red-300 animate-[shake_0.3s_ease-in-out_0s_2]' : 'border-campo-beige-300'}`}
                                            value={selectedCircleIds[pivot.id] || ''}
                                            onChange={(e) => setSelectedCircleIds({ ...selectedCircleIds, [pivot.id]: e.target.value })}
                                            disabled={isRunning}
                                        >
                                            <option value="">Seleccionar círculo...</option>
                                            {circles.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} {c.hectares ? `(${c.hectares} ha)` : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-bold ${isRunning ? 'text-campo-green-600' : 'text-campo-beige-500'}`}>
                                                {isRunning ? 'Encendido' : 'Apagado'}
                                            </span>
                                            <button
                                                onClick={() => isRunning ? handleStopRiego(pivot) : handleStartRiego(pivot)}
                                                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isRunning ? 'bg-campo-green-500 focus:ring-campo-green-500' : 'bg-campo-beige-400 focus:ring-campo-beige-500'}`}
                                            >
                                                <span
                                                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${isRunning ? 'translate-x-9' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Pivot History Toggle */}
                                    {pivotHistory.length > 0 && (
                                        <button
                                            className="w-full flex items-center justify-center gap-2 text-xs text-campo-beige-600 hover:text-campo-green-600 pt-1 transition-colors"
                                            onClick={() => setExpandedPivot(isExpanded ? null : pivot.id)}
                                        >
                                            <History className="h-3 w-3" />
                                            <span>Historial ({pivotHistory.length})</span>
                                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        </button>
                                    )}
                                </div>

                                {/* Expanded History */}
                                {isExpanded && (
                                    <div className="mt-4 border-t border-campo-beige-200 pt-4 space-y-2 max-h-48 overflow-y-auto">
                                        {pivotHistory.map((entry, idx) => (
                                            <div key={entry.id || idx} className="bg-campo-beige-50 rounded-lg p-3 border border-campo-beige-200 text-xs group/entry">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-campo-carbon-700">
                                                        <Droplet className="h-3 w-3 inline mr-1 text-campo-green-500" />
                                                        {entry.circleName}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-campo-green-600 bg-campo-green-50 px-2 py-0.5 rounded">
                                                            {entry.durationHours}h
                                                        </span>
                                                        <button
                                                            onClick={() => deleteRiegoEntry(entry.circleName, entry.id)}
                                                            className="text-campo-beige-400 hover:text-red-500 transition-colors opacity-0 group-hover/entry:opacity-100"
                                                            title="Eliminar registro"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-campo-beige-500">
                                                    {formatDate(entry.startTime)} {formatTime(entry.startTime)} → {formatTime(entry.endTime)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
                {pivots.length === 0 && (
                    <div className="col-span-full py-16 text-center text-campo-beige-600 border-2 border-dashed border-campo-beige-300 rounded-xl">
                        <Droplet className="h-12 w-12 mx-auto text-campo-beige-400 mb-4" />
                        <p className="text-lg font-medium text-campo-carbon-600">No hay pivots configurados.</p>
                        <p className="text-sm mt-1">Haz clic en "Agregar Pivot" para comenzar a regar.</p>
                    </div>
                )}
            </div>

            {/* Hours per Circle Summary */}
            {sortedCircleSummary.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-campo-green-600" />
                        <h2 className="text-xl font-bold text-campo-carbon-800">Horas de Riego por Círculo</h2>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-campo-beige-100 border-b border-campo-beige-300">
                                            <th className="text-left py-3 px-4 text-xs font-bold text-campo-beige-600 uppercase tracking-wider">Círculo</th>
                                            <th className="text-center py-3 px-4 text-xs font-bold text-campo-beige-600 uppercase tracking-wider">Sesiones</th>
                                            <th className="text-center py-3 px-4 text-xs font-bold text-campo-beige-600 uppercase tracking-wider">Horas Totales</th>
                                            <th className="text-right py-3 px-4 text-xs font-bold text-campo-beige-600 uppercase tracking-wider">Último Riego</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-campo-beige-200">
                                        {sortedCircleSummary.map(([circleId, data]) => (
                                            <tr key={circleId} className="hover:bg-campo-beige-50/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {data.active && (
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-campo-green-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-campo-green-500"></span>
                                                            </span>
                                                        )}
                                                        <span className="font-bold text-campo-carbon-800">{circleId}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center text-campo-carbon-600">{data.totalSessions}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="font-mono font-bold text-campo-green-700 bg-campo-green-50 px-3 py-1 rounded-full text-xs">
                                                        {data.totalHours}h
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-xs text-campo-beige-600">
                                                    {data.lastRiego ? formatDate(new Date(data.lastRiego).toISOString()) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal Agregar Pivot */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between bg-campo-beige-50">
                            <h2 className="text-xl font-bold text-campo-carbon-800">Nuevo Pivot</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                                <X className="h-5 w-5 text-campo-beige-500 hover:text-red-500" />
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Nombre del Pivot</label>
                                <input
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campo-green-500"
                                    placeholder="Ej: Pivot Central, Equipo 1"
                                    value={newPivotName}
                                    onChange={(e) => setNewPivotName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddPivot} className="bg-campo-green-600 hover:bg-campo-green-700 text-white" disabled={!newPivotName.trim()}>Guardar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirmation({ isOpen: false, pivotId: null, pivotName: '' })}>
                    <div
                        className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold text-campo-carbon-800 mb-2">¿Eliminar Pivot?</h2>
                            <p className="text-sm text-campo-carbon-600 mb-6">
                                ¿Estás seguro que deseas eliminar <span className="font-bold text-campo-carbon-800">{deleteConfirmation.pivotName}</span>? El historial de riego de los círculos se mantendrá.
                            </p>

                            <div className="flex gap-3 justify-center">
                                <Button variant="ghost" onClick={() => setDeleteConfirmation({ isOpen: false, pivotId: null, pivotName: '' })}>Cancelar</Button>
                                <Button className="bg-red-600 hover:bg-red-700 text-white border-red-600" onClick={handleDeletePivot}>Sí, Eliminar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Riego;
