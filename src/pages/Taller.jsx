import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Plus, Wrench, Calendar, Trash2, X, CheckCircle, Clock, MapPin, User, Timer, AlertCircle, PlayCircle, StopCircle } from 'lucide-react';
import { db } from '../firebase'; // Ensure this path is correct based on your project structure
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';

const Taller = () => {
    const [maintenanceItems, setMaintenanceItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        description: '',
        category: '',
        sector: '',
        operator: '',
        status: 'Pendiente',
        date: new Date().toISOString().split('T')[0],
        startedAt: null,
        completedAt: null
    });

    // Círculos Logic (Copied from Circulos.jsx to ensure consistency)
    const initialCirculosList = [
        { name: "17 sur" }, { name: "17 norte" }, { name: "15(1)" }, { name: "15(4)" },
        { name: "3(2)" }, { name: "3(3)" }, { name: "5(3)" }, { name: "5(4)" },
        { name: "9 SUR" }, { name: "9 NORTE" }, { name: "11 SUR" }, { name: "11 NORTE" },
        { name: "1 COMPLT" }, { name: "4(4)" }, { name: "18(2)" }, { name: "18(1)" },
        { name: "18(3)" }, { name: "2(1)" }, { name: "2(2)" }, { name: "3(3 contorno)" },
        { name: "5(2)" }, { name: "3(1)" }, { name: "14(1)" }, { name: "14(4)" }
    ];
    const [circles, setCircles] = useState([]);

    useEffect(() => {
        const unsubscribeCircles = onSnapshot(collection(db, "circles"), (snapshot) => {
            const firestoreCircleNames = new Set();
            const deletedCircles = new Set();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.deleted) deletedCircles.add(doc.id);
                else firestoreCircleNames.add(doc.id);
            });

            const combinedCircles = new Set();
            initialCirculosList.forEach(c => {
                if (!deletedCircles.has(c.name)) combinedCircles.add(c.name);
            });
            firestoreCircleNames.forEach(name => combinedCircles.add(name));

            const sortedList = Array.from(combinedCircles).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
            });
            setCircles(sortedList);
        });

        const q = query(collection(db, "taller"), orderBy("date", "desc"));
        const unsubscribeTaller = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMaintenanceItems(items);
        });

        return () => {
            unsubscribeCircles();
            unsubscribeTaller();
        };
    }, []);

    const categories = [
        "Tractor",
        "Segadora",
        "Rastrillo",
        "Megaenfardadora",
        "Megaenrolladora",
        "Zampi",
        "Mosquito"
    ];

    const handleAddItem = async () => {
        if (!newItem.description || !newItem.category) return;

        try {
            const docRef = await addDoc(collection(db, "taller"), {
                ...newItem,
                createdAt: new Date().toISOString(),
                startedAt: null,
                completedAt: null
            });

            // Pause circle activity logic
            if (circles.includes(newItem.sector)) {
                const circleRef = doc(db, "circles", newItem.sector);
                const circleSnap = await getDoc(circleRef);

                if (circleSnap.exists()) {
                    const circleData = circleSnap.data();
                    const history = circleData.history || [];

                    if (history.length > 0) {
                        const lastItem = history[history.length - 1];

                        // If it's active, pause it
                        if (lastItem.situation === 'En Proceso' || lastItem.situation === 'Iniciado') {
                            const now = new Date().toISOString();
                            const updatedHistory = [...history];

                            // Close current
                            updatedHistory[updatedHistory.length - 1] = {
                                ...lastItem,
                                endDate: now
                            };

                            // Add new paused entry
                            updatedHistory.push({
                                id: Date.now(),
                                activity: lastItem.activity,
                                situation: 'Frenado',
                                alert: lastItem.alert,
                                machinery: lastItem.machinery, // keeping the machinery assigned
                                startDate: now,
                                endDate: null,
                                pauseReason: `Rotura de maquinaria en Taller. ${newItem.description}`,
                                tallerItemId: docRef.id
                            });

                            await updateDoc(circleRef, { history: updatedHistory });
                        }
                    }
                }
            }

            setIsModalOpen(false);
            setNewItem({
                description: '',
                category: '',
                sector: '',
                operator: '',
                status: 'Pendiente',
                date: new Date().toISOString().split('T')[0],
                startedAt: null,
                completedAt: null
            });
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };

    const handleDeleteItem = async (itemOrId) => {
        if (window.confirm('¿Estás seguro de eliminar esta entrada?')) {
            try {
                const itemId = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
                const item = typeof itemOrId === 'string' ? maintenanceItems.find(i => i.id === itemOrId) : itemOrId;

                // Si el ticket detuvo un círculo, lo reanudamos antes de borrar el ticket
                if (item && item.sector && circles.includes(item.sector)) {
                    const circleRef = doc(db, "circles", item.sector);
                    const circleSnap = await getDoc(circleRef);

                    if (circleSnap.exists()) {
                        const circleData = circleSnap.data();
                        const history = circleData.history || [];

                        if (history.length > 0) {
                            const lastItem = history[history.length - 1];
                            if (lastItem.situation === 'Frenado' && lastItem.tallerItemId === itemId) {
                                const resumeNow = new Date().toISOString();
                                const updatedHistory = [...history];

                                updatedHistory[updatedHistory.length - 1] = {
                                    ...lastItem,
                                    endDate: resumeNow
                                };

                                updatedHistory.push({
                                    id: Date.now(),
                                    activity: lastItem.activity,
                                    situation: 'En Proceso',
                                    alert: lastItem.alert,
                                    machinery: lastItem.machinery,
                                    startDate: resumeNow,
                                    endDate: null,
                                    pauseReason: null,
                                    tallerItemId: null
                                });

                                await updateDoc(circleRef, { history: updatedHistory });
                            }
                        }
                    }
                }
                // Borrar el documento de taller
                await deleteDoc(doc(db, "taller", itemId));
            } catch (error) {
                console.error("Error al eliminar de Taller: ", error);
                alert("Hubo un error al eliminar el ticket: " + error.message);
            }
        }
    };

    const handleStatusChange = async (item, newStatus) => {
        const updates = { status: newStatus };
        const now = new Date().toISOString();

        if (newStatus === 'En Reparación' && !item.startedAt) {
            updates.startedAt = now;
        } else if (newStatus === 'Finalizado' && !item.completedAt) {
            updates.completedAt = now;

            // Resume circle activity logic
            if (circles.includes(item.sector)) {
                const circleRef = doc(db, "circles", item.sector);
                const circleSnap = await getDoc(circleRef);

                if (circleSnap.exists()) {
                    const circleData = circleSnap.data();
                    const history = circleData.history || [];

                    if (history.length > 0) {
                        const lastItem = history[history.length - 1];

                        // Check if it's currently paused by this very ticket
                        if (lastItem.situation === 'Frenado' && lastItem.tallerItemId === item.id) {
                            const resumeNow = new Date().toISOString();
                            const updatedHistory = [...history];

                            // Close the paused entry
                            updatedHistory[updatedHistory.length - 1] = {
                                ...lastItem,
                                endDate: resumeNow
                            };

                            // Add new active entry
                            updatedHistory.push({
                                id: Date.now(),
                                activity: lastItem.activity,
                                situation: 'En Proceso', // resume as 'En Proceso'
                                alert: lastItem.alert,
                                machinery: lastItem.machinery,
                                startDate: resumeNow,
                                endDate: null,
                                pauseReason: null,
                                tallerItemId: null
                            });

                            await updateDoc(circleRef, { history: updatedHistory });
                        }
                    }
                }
            }
        }

        // Optional: If moving back to previous states, you might want to clear timestamps
        // For now, we prefer to keep the *first* start time and *last* completion time, 
        // or just simple transitions. Let's keep it simple.

        await updateDoc(doc(db, "taller", item.id), updates);
    };

    const getCategoryColor = (category) => {
        // You can customize colors per category if desired
        return 'bg-campo-brown-100 text-campo-brown-700';
    };

    const formatDuration = (start, end) => {
        if (!start) return '-';
        const startTime = new Date(start).getTime();
        const endTime = end ? new Date(end).getTime() : new Date().getTime();
        const diff = endTime - startTime;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Taller</h1>
                    <p className="text-muted-foreground mt-2">Gestión de mantenimiento y maquinaria.</p>
                </div>
                <Button className="shadow-lg shadow-primary/30" onClick={() => setIsModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Entrada
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {maintenanceItems.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getCategoryColor(item.category)}`}>
                                    {item.category}
                                </span>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <select
                                            className={`appearance-none text-xs font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 text-center
                                                ${item.status === 'Pendiente' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                    item.status === 'En Reparación' ? 'bg-campo-green-100 text-campo-green-800 border-campo-green-200' :
                                                        item.status === 'Finalizado' ? 'bg-green-100 text-green-800 border-green-200' :
                                                            'bg-campo-beige-200 text-campo-carbon-800 border-campo-beige-300'}`}
                                            value={item.status}
                                            onChange={(e) => handleStatusChange(item, e.target.value)}
                                        >
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="En Reparación">En Reparación</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="Esperando Repuestos">Esperando Repuestos</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteItem(item)}
                                        title="Eliminar registro"
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors p-2 flex items-center justify-center"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <h3 className={`text-lg font-bold mb-2 ${item.status === 'Finalizado' ? 'line-through text-campo-beige-500' : 'text-campo-carbon-800'}`}>
                                {item.description}
                            </h3>

                            <div className="space-y-1 mt-2">
                                {item.sector && (
                                    <div className="flex items-center gap-2 text-sm text-campo-carbon-600">
                                        <MapPin className="h-3.5 w-3.5 text-campo-beige-500" />
                                        <span>{item.sector}</span>
                                    </div>
                                )}
                                {item.operator && (
                                    <div className="flex items-center gap-2 text-sm text-campo-carbon-600">
                                        <User className="h-3.5 w-3.5 text-campo-beige-500" />
                                        <span>{item.operator}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 text-xs text-campo-beige-600 mt-4 pt-4 border-t border-campo-beige-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Indicado: {new Date(item.date).toLocaleDateString()}</span>
                                    </div>
                                    {item.createdAt && (
                                        <span className="text-campo-beige-500 text-[10px]">
                                            Creado: {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                {/* Timer Section */}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-campo-beige-50 p-2 rounded-md border border-campo-beige-200">
                                        <span className="block text-[10px] uppercase text-campo-beige-500 font-bold mb-1">Tiempo Pendiente</span>
                                        <div className="flex items-center gap-1 text-campo-carbon-700 font-medium">
                                            <Timer className="h-3 w-3 text-amber-500" />
                                            {formatDuration(item.createdAt, item.startedAt)}
                                        </div>
                                    </div>
                                    <div className="bg-campo-beige-50 p-2 rounded-md border border-campo-beige-200">
                                        <span className="block text-[10px] uppercase text-campo-beige-500 font-bold mb-1">Tiempo Reparación</span>
                                        <div className="flex items-center gap-1 text-campo-carbon-700 font-medium">
                                            <Wrench className="h-3 w-3 text-campo-green-500" />
                                            {item.startedAt ? formatDuration(item.startedAt, item.completedAt) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {maintenanceItems.length === 0 && (
                <div className="text-center py-12 bg-campo-beige-50 rounded-lg border-2 border-dashed border-campo-beige-300">
                    <Wrench className="h-12 w-12 text-campo-beige-400 mx-auto mb-4" />
                    <p className="text-campo-beige-600 font-medium">No hay mantenimientos registrados.</p>
                    <p className="text-sm text-campo-beige-500">Comienza agregando una nueva entrada.</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div
                        className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex items-center justify-between bg-campo-beige-50">
                            <h2 className="text-xl font-bold text-campo-carbon-800">Nueva Entrada de Taller</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                                <X className="h-5 w-5 text-campo-beige-500 hover:text-red-500" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Categoría</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    value={newItem.category}
                                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                >
                                    <option value="">Seleccionar Maquinaria...</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Sector donde se averió</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    value={newItem.sector}
                                    onChange={(e) => setNewItem({ ...newItem, sector: e.target.value })}
                                >
                                    <option value="">Seleccionar Círculo...</option>
                                    <option value="Galpón">Galpón</option>
                                    <option value="Taller">Taller</option>
                                    <option value="Otro">Otro</option>
                                    <option disabled>──────────</option>
                                    {circles.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Persona Encargada</label>
                                <input
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    placeholder="Nombre del operario"
                                    value={newItem.operator}
                                    onChange={(e) => setNewItem({ ...newItem, operator: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Descripción del Trabajo / Problema</label>
                                <textarea
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[100px]"
                                    placeholder="Detalle del mantenimiento..."
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        value={newItem.date}
                                        onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-campo-carbon-700 mb-1">Estado Inicial</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        value={newItem.status}
                                        onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                                    >
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="En Reparación">En Reparación</option>
                                        <option value="Esperando Repuestos">Esperando Repuestos</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddItem} disabled={!newItem.category || !newItem.description}>Guardar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Taller;

