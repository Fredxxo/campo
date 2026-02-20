import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Circle, History, X, Calendar, ArrowRight, Clock, Trash2, AlertTriangle, Droplet } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

const Circulos = () => {
    // Definición inicial de círculos (nombres y valores por defecto)
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
    const [history, setHistory] = useState({});
    const [statusHistory, setStatusHistory] = useState({}); // New separate history for status
    const [selectedCircle, setSelectedCircle] = useState(null);
    const [activePivots, setActivePivots] = useState({}); // circleId -> pivotName mapping for active irrigation

    // Enfardado Modal State
    const [isEnfardadoModalOpen, setIsEnfardadoModalOpen] = useState(false);
    const [enfardadoData, setEnfardadoData] = useState({ quantity: '', weight: '', quality: '' });
    const [pendingEnfardadoCircle, setPendingEnfardadoCircle] = useState(null);


    // Suscribirse a cambios en la colección 'circles' de Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "circles"), (snapshot) => {

            const historyData = {};
            const statusHistoryData = {};
            const hectaresData = {};
            const firestoreCircleNames = new Set();
            const deletedCircles = new Set();

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.deleted) {
                    deletedCircles.add(doc.id);
                } else {
                    if (data.history) historyData[doc.id] = data.history;
                    if (data.statusHistory) statusHistoryData[doc.id] = data.statusHistory;
                    if (data.hectares !== undefined) hectaresData[doc.id] = data.hectares;
                    firestoreCircleNames.add(doc.id);
                }
            });

            setHistory(historyData);
            setStatusHistory(statusHistoryData);

            // Combinar la lista inicial con los encontrados en Firestore
            // Usamos un Map para asegurar unicidad y priorizar datos de Firestore
            const combinedCircles = new Map();

            // Primero, añadimos los iniciales
            initialCirculosList.forEach(circle => {
                if (!deletedCircles.has(circle.name)) {
                    combinedCircles.set(circle.name, {
                        ...circle,
                        hectares: hectaresData[circle.name] !== undefined ? hectaresData[circle.name] : circle.hectares
                    });
                }
            });

            // Luego, añadimos los que están en Firestore pero NO en la lista inicial
            firestoreCircleNames.forEach(name => {
                if (!combinedCircles.has(name)) {
                    combinedCircles.set(name, {
                        name: name,
                        hectares: hectaresData[name] !== undefined ? hectaresData[name] : 0
                    });
                }
            });

            const sortedList = Array.from(combinedCircles.values()).sort((a, b) => {
                const numA = parseInt(a.name);
                const numB = parseInt(b.name);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.name.localeCompare(b.name);
            });

            setCirculosList(sortedList);

        }, (error) => {
            console.error("Error fetching circles:", error);
        });

        // Subscribe to pivots to know which circles are being irrigated
        const unsubPivots = onSnapshot(collection(db, "pivots"), (snapshot) => {
            const active = {};
            snapshot.forEach(d => {
                const data = d.data();
                if (data.startTime && data.activeCircle) {
                    active[data.activeCircle] = data.name || d.id;
                }
            });
            setActivePivots(active);
        });

        return () => {
            unsubscribe();
            unsubPivots();
        };
    }, []);

    // Estado para el modal de agregar círculo
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCircleName, setNewCircleName] = useState('');
    const [newCircleHectares, setNewCircleHectares] = useState('');
    // Estado para el modal de confirmación de eliminación
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, circleName: null });

    const handleAddCircle = async () => {
        if (!newCircleName.trim()) return;

        try {
            await setDoc(doc(db, "circles", newCircleName), {
                hectares: newCircleHectares ? parseFloat(newCircleHectares) : 0,
                history: [],
                statusHistory: []
            });
            setIsAddModalOpen(false);
            setNewCircleName('');
            setNewCircleHectares('');
        } catch (error) {
            console.error("Error adding circle:", error);
            alert("Hubo un error al crear el círculo.");
        }
    };

    const handleDeleteCircle = async () => {
        const { circleName } = deleteConfirmation;
        if (!circleName) return;

        try {
            await setDoc(doc(db, "circles", circleName), { deleted: true }, { merge: true });
            setDeleteConfirmation({ isOpen: false, circleName: null });
        } catch (error) {
            console.error("Error deleting circle:", error);
            alert("Hubo un error al eliminar el círculo.");
        }
    };

    const getCurrentState = (circuloName) => {
        const circleHistory = history[circuloName];
        if (!circleHistory || circleHistory.length === 0) return { activity: '', situation: 'Iniciado', alert: '' };
        return circleHistory[circleHistory.length - 1];
    };

    // Helper to get current status from statusHistory
    const getCurrentStatus = (circuloName) => {
        const sHistory = statusHistory[circuloName];
        if (!sHistory || sHistory.length === 0) return '';
        return sHistory[sHistory.length - 1].status;
    };

    const updateCircleData = async (circleName, dataToUpdate) => {
        try {
            await setDoc(doc(db, "circles", circleName), dataToUpdate, { merge: true });
        } catch (error) {
            console.error("Error updating circle data:", error);
        }
    };

    const handleHectaresChange = (index, newValue) => {
        // Actualización optimista
        const updatedList = [...circulosList];
        updatedList[index].hectares = newValue;
        setCirculosList(updatedList);

        // Guardar en Firestore
        updateCircleData(updatedList[index].name, { hectares: newValue });
    };

    // Helper to calculate new history array
    const calculateNewHistory = (currentHistory = [], changes) => {
        // Asegurar que haya un estado inicial si está vacío
        if (currentHistory.length === 0) {
            currentHistory = [{
                id: Date.now() + Math.random(),
                activity: '',
                situation: 'Iniciado',
                alert: '', // Deprecated in favor of separate status, but kept for legacy
                startDate: new Date().toISOString(),
                endDate: null
            }];
        }

        const list = [...currentHistory];
        const lastIndex = list.length - 1;
        const currentItem = list[lastIndex];
        const now = new Date().toISOString();

        if (!currentItem.endDate) {
            list[lastIndex] = { ...currentItem, endDate: now };
        }
        list.push({
            id: Date.now(),
            activity: changes.activity !== undefined ? changes.activity : currentItem.activity,
            situation: changes.situation !== undefined ? changes.situation : currentItem.situation,
            alert: changes.alert !== undefined ? changes.alert : currentItem.alert,
            quantity: changes.quantity || null, // Capture quantity
            weight: changes.weight || null, // Capture weight
            quality: changes.quality || null, // Capture quality
            startDate: now,
            endDate: null
        });

        return list;
    };

    const handleActivityChange = (circuloName, newActivity) => {
        const currentHistory = history[circuloName] || [];
        const lastItem = currentHistory[currentHistory.length - 1] || {};
        const lastActivity = lastItem.activity || '';
        const currentStatus = getCurrentStatus(circuloName);

        // Process Constraints
        if (newActivity === 'Corte') {
            // Optional: Require a status to start? For now, allow it.
        } else if (newActivity === 'Rastrillado') {
            if (lastActivity !== 'Corte') {
                alert("Solo se puede Rastrillar después de Cortar.");
                return;
            }
        } else if (newActivity === 'Enfardado') {
            if (lastActivity !== 'Rastrillado') {
                alert("Solo se puede Enfardar después de Rastrillar.");
                return;
            }
            // INTERCEPT: Open Modal for Enfardado
            setPendingEnfardadoCircle(circuloName);
            setEnfardadoData({ quantity: '', weight: '', quality: '' });
            setIsEnfardadoModalOpen(true);
            return; // Stop here, wait for modal confirmation
        }

        const newHistory = calculateNewHistory(currentHistory, {
            activity: newActivity,
            situation: 'Iniciado',
            alert: currentStatus // Sync alert field with current status
        });
        updateCircleData(circuloName, { history: newHistory });
    };

    const confirmEnfardado = () => {
        if (!pendingEnfardadoCircle) return;
        if (!enfardadoData.quantity || !enfardadoData.weight || !enfardadoData.quality) {
            alert("Por favor ingrese cantidad, peso y calidad.");
            return;
        }

        const circuloName = pendingEnfardadoCircle;
        const currentHistory = history[circuloName] || [];
        const currentStatus = getCurrentStatus(circuloName);

        const newHistory = calculateNewHistory(currentHistory, {
            activity: 'Enfardado',
            situation: 'Iniciado',
            alert: currentStatus,
            quantity: enfardadoData.quantity,
            weight: enfardadoData.weight,
            quality: enfardadoData.quality
        });

        updateCircleData(circuloName, { history: newHistory });

        // Reset and close modal
        setIsEnfardadoModalOpen(false);
        setPendingEnfardadoCircle(null);
        setEnfardadoData({ quantity: '', weight: '', quality: '' });
    };

    const handleStatusChange = (circuloName, newStatus) => {
        const currentStatus = getCurrentStatus(circuloName);
        const currentHistory = history[circuloName] || [];
        const lastActivity = (currentHistory[currentHistory.length - 1] || {}).activity;

        // Constraint: Cannot clear status (set to empty) unless last activity was 'Enfardado'
        // OR if there was no status to begin with (initial set)
        if (newStatus === '' && currentStatus !== '') {
            if (lastActivity !== 'Enfardado') {
                alert("No se puede cambiar la situación a 'Normal' hasta que se haya completado el proceso (Enfardado).");
                return;
            }
        }

        // Add to separate status history
        const sHistory = statusHistory[circuloName] || [];
        const newStatusEntry = {
            id: Date.now(),
            status: newStatus,
            date: new Date().toISOString()
        };
        const newStatusHistory = [...sHistory, newStatusEntry];

        // Also update the main activity history 'alert' field to keep UI in sync
        // We do this by creating a new history entry ONLY if we want to log it there too,
        // OR simply update the current 'alert' field of the open activity?
        // Let's create a new granular entry to be safe and consistent with previous design
        const newMainHistory = calculateNewHistory(currentHistory, { alert: newStatus });

        updateCircleData(circuloName, {
            statusHistory: newStatusHistory,
            history: newMainHistory
        });
    };

    const handleSituationChange = (circuloName, newSituation) => {
        const currentHistory = history[circuloName] || [];
        const newHistory = calculateNewHistory(currentHistory, { situation: newSituation });
        updateCircleData(circuloName, { history: newHistory });
    };

    // Eliminar un item del historial
    const deleteHistoryItem = (circuloName, itemId, type = 'activity') => {
        if (type === 'activity') {
            const currentHistory = history[circuloName] || [];
            const updatedHistory = currentHistory.filter(item => item.id !== itemId);
            updateCircleData(circuloName, { history: updatedHistory });
        } else if (type === 'status') {
            const currentStatusHistory = statusHistory[circuloName] || [];
            const updatedHistory = currentStatusHistory.filter(item => item.id !== itemId);
            updateCircleData(circuloName, { statusHistory: updatedHistory });
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
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
            default: return 'text-campo-carbon-600 bg-campo-beige-50 border-campo-beige-300';
        }
    };

    // Card colors driven by STATUS (alert)
    const getStatusColor = (status) => {
        switch (status) {
            case 'Listo para cortar': return 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30';
            case 'Cortar urgente': return 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30';
            case 'Pasado': return 'border-red-500 ring-1 ring-red-500 bg-red-50/30';
            default: return 'border-transparent hover:border-campo-beige-300';
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'Listo para cortar': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
            case 'Cortar urgente': return 'text-amber-700 bg-amber-100 border-amber-200';
            case 'Pasado': return 'text-red-700 bg-red-100 border-red-200';
            default: return 'text-campo-beige-600 bg-campo-beige-200 border-campo-beige-300';
        }
    };

    const getSituationBadgeColor = (situation) => {
        return 'text-campo-carbon-600 bg-campo-beige-200 border-campo-beige-300';
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Círculos</h1>
                    <p className="text-muted-foreground mt-2">Gestión de lotes y pivots.</p>
                </div>
                <Button className="shadow-lg shadow-primary/30" onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Círculo
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {circulosList.map((circulo, index) => {
                    const currentState = getCurrentState(circulo.name);
                    const currentStatus = getCurrentStatus(circulo.name);
                    const irrigatingPivot = activePivots[circulo.name]; // pivot name if this circle is being irrigated

                    const activityColorClass = getActivityColor(currentState.activity);
                    const cardColorClass = irrigatingPivot ? 'border-campo-green-400 ring-1 ring-campo-green-400 bg-campo-green-50/30' : getStatusColor(currentStatus);
                    const statusBadgeClass = getStatusBadgeColor(currentStatus);

                    return (
                        <Card
                            key={index}
                            className={`hover:shadow-md transition-all duration-300 group cursor-pointer bg-campo-beige-100 ${cardColorClass}`}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${activityColorClass}`}>
                                        <Circle className="h-5 w-5" />
                                    </div>

                                    {/* Status / Alert Dropdown (Top Right) */}
                                    <div className="flex items-center gap-1">
                                        <div className="relative">
                                            <select
                                                className={`appearance-none text-xs font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 text-right ${currentStatus ? statusBadgeClass : 'text-campo-beige-500 bg-campo-beige-50 border-campo-beige-300'}`}
                                                value={currentStatus || ''}
                                                onChange={(e) => handleStatusChange(circulo.name, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">Normal</option>
                                                <option value="Listo para cortar">Listo para cortar</option>
                                                <option value="Cortar urgente">Cortar urgente</option>
                                                <option value="Pasado">Pasado</option>
                                            </select>
                                        </div>
                                        <button
                                            className="text-campo-beige-400 hover:text-red-500 hover:bg-campo-beige-50 p-1 rounded-full transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmation({ isOpen: true, circleName: circulo.name });
                                            }}
                                            title="Eliminar círculo"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                        {circulo.name}
                                    </h3>
                                    <div className="flex items-center bg-campo-beige-50 rounded-md px-2 py-1 border border-transparent hover:border-campo-beige-300 transition-colors">
                                        <input
                                            type="number"
                                            className="w-12 bg-transparent text-xs font-medium text-campo-carbon-600 focus:outline-none text-right"
                                            value={circulo.hectares || ''}
                                            onChange={(e) => handleHectaresChange(index, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="-"
                                        />
                                        <span className="text-xs font-medium text-campo-beige-500 ml-1">Has</span>
                                    </div>
                                </div>

                                {/* Irrigation Active Indicator */}
                                {irrigatingPivot && (
                                    <div className="mt-2 flex items-center gap-2 bg-campo-green-50 text-campo-green-700 border border-campo-green-200 rounded-lg px-3 py-1.5">
                                        <Droplet className="h-3.5 w-3.5 animate-pulse" />
                                        <span className="text-xs font-bold">Regando</span>
                                        <span className="text-xs text-campo-green-500">({irrigatingPivot})</span>
                                    </div>
                                )}

                                <div className="mt-4 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-campo-beige-600 hover:text-primary p-0 h-auto font-normal flex items-center gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCircle(circulo.name);
                                        }}
                                    >
                                        <History className="h-3 w-3" /> Ver Historial
                                    </Button>
                                    <span className="text-[10px] text-campo-beige-500">
                                        {currentState.startDate ? formatDate(currentState.startDate) : ''}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-campo-beige-600 block mb-1">Actividad</label>
                                        <select
                                            className="w-full text-xs border-campo-beige-300 rounded-md p-2 bg-campo-beige-50 focus:ring-2 focus:ring-campo-green-500 focus:border-campo-green-500 transition-shadow"
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
                                        <label className="text-xs font-medium text-campo-beige-600 block mb-1">Situación</label>
                                        <select
                                            className="w-full text-xs border-campo-beige-300 rounded-md p-2 bg-campo-beige-50 focus:ring-2 focus:ring-campo-green-500 focus:border-campo-green-500 transition-shadow"
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

            {/* Modal para Agregar Círculo */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsAddModalOpen(false)}>
                    <div
                        className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex items-center justify-between bg-campo-beige-50">
                            <h2 className="text-xl font-bold text-campo-carbon-800">Nuevo Círculo</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                                <X className="h-5 w-5 text-campo-beige-500 hover:text-red-500" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Nombre / Número del Círculo</label>
                                <input
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Ej: 17 sur, 5(3)"
                                    value={newCircleName}
                                    onChange={(e) => setNewCircleName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Hectáreas (Opcional)</label>
                                <input
                                    type="number"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="0"
                                    value={newCircleHectares}
                                    onChange={(e) => setNewCircleHectares(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddCircle} disabled={!newCircleName.trim()}>Guardar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Enfardado Data Entry */}
            {isEnfardadoModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsEnfardadoModalOpen(false)}>
                    <div
                        className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex items-center justify-between bg-campo-beige-50">
                            <h2 className="text-xl font-bold text-campo-carbon-800">Datos de Enfardado</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsEnfardadoModalOpen(false)}>
                                <X className="h-5 w-5 text-campo-beige-500 hover:text-red-500" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Cantidad (Unidades)</label>
                                <input
                                    type="number"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campo-green-500"
                                    placeholder="Ej: 150"
                                    value={enfardadoData.quantity}
                                    onChange={(e) => setEnfardadoData({ ...enfardadoData, quantity: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Peso Total (Kg)</label>
                                <input
                                    type="number"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campo-green-500"
                                    placeholder="Ej: 4500"
                                    value={enfardadoData.weight}
                                    onChange={(e) => setEnfardadoData({ ...enfardadoData, weight: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Calidad</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campo-green-500"
                                    value={enfardadoData.quality}
                                    onChange={(e) => setEnfardadoData({ ...enfardadoData, quality: e.target.value })}
                                >
                                    <option value="">Seleccionar Calidad...</option>
                                    <option value="Premium">Premium</option>
                                    <option value="Primera">Primera</option>
                                    <option value="Segunda">Segunda</option>
                                    <option value="Tercera">Tercera</option>
                                    <option value="Descarte">Descarte</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsEnfardadoModalOpen(false)}>Cancelar</Button>
                                <Button
                                    className="bg-campo-green-600 hover:bg-campo-green-700 text-white"
                                    onClick={confirmEnfardado}
                                    disabled={!enfardadoData.quantity || !enfardadoData.weight || !enfardadoData.quality}
                                >
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirmation({ isOpen: false, circleName: null })}>
                    <div
                        className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold text-campo-carbon-800 mb-2">¿Eliminar Círculo?</h2>
                            <p className="text-sm text-campo-carbon-600 mb-6">
                                ¿Estás seguro que deseas eliminar <span className="font-bold text-campo-carbon-800">{deleteConfirmation.circleName}</span>? Esta acción no se puede deshacer fácilmente.
                            </p>

                            <div className="flex gap-3 justify-center">
                                <Button variant="ghost" onClick={() => setDeleteConfirmation({ isOpen: false, circleName: null })}>Cancelar</Button>
                                <Button className="bg-red-600 hover:bg-red-700 text-white border-red-600" onClick={handleDeleteCircle}>Si, Eliminar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal / Overlay */}
            {selectedCircle && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCircle(null)}>
                    <div
                        className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex items-center justify-between bg-campo-beige-50">
                            <div>
                                <h2 className="text-xl font-bold text-campo-carbon-800">Historial de Actividades</h2>
                                <p className="text-sm text-campo-beige-600">Círculo: {selectedCircle}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedCircle(null)}>
                                <X className="h-5 w-5 text-campo-beige-500 hover:text-red-500" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">
                                {/* Activity History Column */}
                                <div className="p-6 border-r border-campo-beige-200 overflow-y-auto">
                                    <h3 className="text-sm font-bold text-campo-beige-600 uppercase tracking-wider mb-6">Actividades</h3>
                                    <div className="relative border-l-2 border-campo-beige-300 ml-3 space-y-8 pl-6 py-2">
                                        {(history[selectedCircle] || []).slice().reverse().map((item, idx) => (
                                            <div key={item.id} className="relative group">
                                                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-campo-beige-100 shadow-sm ${getActivityColor(item.activity).split(' ')[1] || 'bg-campo-beige-400'}`}></div>

                                                <div className="bg-campo-beige-50 rounded-lg p-4 border border-campo-beige-200 hover:border-campo-beige-400 transition-colors relative">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className={`font-bold text-sm px-2 py-0.5 rounded-md w-fit ${getActivityColor(item.activity)}`}>
                                                                {item.activity || 'Sin actividad'}
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getSituationBadgeColor(item.situation)}`}>
                                                                {item.situation}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteHistoryItem(selectedCircle, item.id, 'activity');
                                                                }}
                                                                className="text-campo-beige-500 hover:text-red-500 transition-colors p-1"
                                                                title="Eliminar registro"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Display Enfardado Data */}
                                                    {item.activity === 'Enfardado' && (item.quantity || item.weight || item.quality) && (
                                                        <div className="mt-2 text-xs font-bold text-campo-carbon-700 bg-purple-50 p-2 rounded border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300 flex gap-3 flex-wrap">
                                                            {item.quantity && <span>📦 {item.quantity} un.</span>}
                                                            {item.weight && <span>⚖️ {item.weight} kg</span>}
                                                            {item.quality && <span>⭐ {item.quality}</span>}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-4 text-xs text-campo-beige-600 mt-3">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>Inicio: {formatDate(item.startDate)} <span className="text-campo-beige-500 ml-1">{formatTime(item.startDate)}</span></span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {item.endDate ? (
                                                                <>
                                                                    <div className="w-3 flex justify-center"><ArrowRight className="h-3 w-3" /></div>
                                                                    <span>Fin: {formatDate(item.endDate)} <span className="text-campo-beige-500 ml-1">{formatTime(item.endDate)}</span></span>
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
                                            <p className="text-center text-campo-beige-500 py-8">No hay actividades registradas.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Status History Column */}
                                <div className="p-6 bg-campo-beige-50/50 overflow-y-auto">
                                    <h3 className="text-sm font-bold text-campo-beige-600 uppercase tracking-wider mb-6">Historial de Estado</h3>
                                    <div className="space-y-4">
                                        {(statusHistory[selectedCircle] || []).slice().reverse().map((item, idx) => (
                                            <div key={item.id} className="bg-campo-beige-100 p-3 rounded-lg border border-campo-beige-300 shadow-sm flex  justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status).includes('emerald') ? 'bg-emerald-500' :
                                                        getStatusColor(item.status).includes('amber') ? 'bg-amber-500' :
                                                            getStatusColor(item.status).includes('red') ? 'bg-red-500' : 'bg-campo-beige-400'
                                                        }`}></div>
                                                    <div>
                                                        <p className="text-sm font-bold text-campo-carbon-700">{item.status || 'Normal'}</p>
                                                        <p className="text-xs text-campo-beige-500">{formatDate(item.date)} {formatTime(item.date)}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteHistoryItem(selectedCircle, item.id, 'status');
                                                    }}
                                                    className="text-campo-beige-400 hover:text-red-500 transition-colors p-1"
                                                    title="Eliminar registro"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {(statusHistory[selectedCircle] || []).length === 0 && (
                                            <p className="text-center text-campo-beige-500 py-8">No hay cambios de estado registrados.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Circulos;
