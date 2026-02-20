import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, X, Search, FileText } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const Ventas = () => {
    const [ventasList, setVentasList] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        remito: '',
        transportista: '',
        producto: '',
        calidad: '',
        contacto: '',
        patente: '',
        peso: '',
        precio: '',
        estado: 'Pendiente',
        cantidad: '',
        deuda: '',
        destino: '',
        observaciones: ''
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "ventas"), (snapshot) => {
            const ventasData = [];
            snapshot.forEach(doc => {
                ventasData.push({ id: doc.id, ...doc.data() });
            });
            // Sort by createdAt descending
            ventasData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis() || Date.now());
            setVentasList(ventasData);
        }, (error) => {
            console.error("Error fetching ventas:", error);
        });

        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const calculateTotal = () => {
        const peso = parseFloat(formData.peso) || 0;
        const precio = parseFloat(formData.precio) || 0;
        return peso * precio;
    };

    const handleSaveSale = async () => {
        try {
            const totalCalc = calculateTotal();
            const initialDeuda = formData.estado === 'Cobrado' || formData.estado === 'Cancelada' ? 0 : totalCalc;

            const newSale = {
                ...formData,
                peso: parseFloat(formData.peso) || 0,
                precio: parseFloat(formData.precio) || 0,
                precioTotal: totalCalc,
                deuda: initialDeuda, // Inicialmente la deuda asignada
                cantidad: parseInt(formData.cantidad, 10) || 0,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "ventas"), newSale);
            setIsAddModalOpen(false);
            setFormData({
                remito: '',
                transportista: '',
                producto: '',
                calidad: '',
                contacto: '',
                patente: '',
                peso: '',
                precio: '',
                estado: 'Pendiente',
                cantidad: '',
                deuda: '',
                destino: '',
                observaciones: ''
            });

        } catch (error) {
            console.error("Error saving sale:", error);
            alert("Hubo un error al guardar la venta.");
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        return timestamp.toDate?.().toLocaleDateString('es-AR') || new Date().toLocaleDateString('es-AR');
    };

    const handleStatusChange = async (venta, newEstado) => {
        try {
            const ventaRef = doc(db, "ventas", venta.id);
            const updateData = { estado: newEstado };

            if (newEstado === 'Cobrado') {
                updateData.fechaCobro = serverTimestamp();
                updateData.deuda = 0; // Se cobra todo, la deuda queda en 0
            } else if (newEstado === 'Pendiente') {
                updateData.fechaCobro = null;
                updateData.deuda = venta.precioTotal || 0; // Vuelve a tener la deuda total si es pendiente
            } else if (newEstado === 'Cancelada') {
                updateData.deuda = 0; // Si se cancela, no hay deuda
            }

            await updateDoc(ventaRef, updateData);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Hubo un error al actualizar el estado.");
        }
    };

    const getDaysPassed = (start, end) => {
        if (!start) return 0;
        const startDate = start.toDate ? start.toDate() : new Date(start);
        const endDate = end ? (end.toDate ? end.toDate() : new Date(end)) : new Date();
        const diffTime = Math.abs(endDate - startDate);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Ventas</h1>
                    <p className="text-muted-foreground mt-2">Registro de ventas y facturación.</p>
                </div>
                <Button className="shadow-lg shadow-primary/30" onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Venta
                </Button>
            </div>

            <Card className="shadow-md border-campo-beige-200 bg-white">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-campo-carbon-600 uppercase bg-campo-beige-50 border-b border-campo-beige-200 whitespace-nowrap">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Remito</th>
                                    <th className="px-4 py-3">Transportista</th>
                                    <th className="px-4 py-3">Contacto</th>
                                    <th className="px-4 py-3">Patente</th>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3">Calidad</th>
                                    <th className="px-4 py-3 text-right">Cant.</th>
                                    <th className="px-4 py-3 text-right">Peso (Kg)</th>
                                    <th className="px-4 py-3 text-right">Precio/Kg</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-right">Deuda</th>
                                    <th className="px-4 py-3">Destino</th>
                                    <th className="px-4 py-3">Observaciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventasList.length === 0 ? (
                                    <tr>
                                        <td colSpan="15" className="text-center py-8 text-muted-foreground">
                                            No hay ventas registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    ventasList.map((venta) => (
                                        <tr key={venta.id} className="border-b border-campo-beige-100 hover:bg-campo-beige-50/50 transition-colors whitespace-nowrap">
                                            <td className="px-4 py-3">{formatDate(venta.createdAt)}</td>
                                            <td className="px-4 py-3 font-medium text-campo-carbon-800">{venta.remito}</td>
                                            <td className="px-4 py-3">{venta.transportista}</td>
                                            <td className="px-4 py-3">{venta.contacto}</td>
                                            <td className="px-4 py-3">{venta.patente}</td>
                                            <td className="px-4 py-3">{venta.producto}</td>
                                            <td className="px-4 py-3">{venta.calidad}</td>
                                            <td className="px-4 py-3 text-right font-medium">{venta.cantidad}</td>
                                            <td className="px-4 py-3 text-right font-medium">{venta.peso?.toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-3 text-right">${venta.precio?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right font-bold text-campo-green-700">${venta.precioTotal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <select
                                                        className={`text-[11px] font-bold px-2 py-1.5 rounded-full border cursor-pointer focus:outline-none appearance-none text-center min-w-[100px] ${venta.estado === 'Cobrado' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm' :
                                                                venta.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm' :
                                                                    venta.estado === 'Cancelada' ? 'bg-red-100 text-red-800 border-red-200 shadow-sm' :
                                                                        'bg-gray-100 text-gray-800 border-gray-200 shadow-sm'
                                                            }`}
                                                        value={venta.estado || 'Pendiente'}
                                                        onChange={(e) => handleStatusChange(venta, e.target.value)}
                                                    >
                                                        <option value="Pendiente">Pendiente</option>
                                                        <option value="Cobrado">Cobrado</option>
                                                        <option value="Cancelada">Cancelada</option>
                                                    </select>
                                                    {venta.estado === 'Cobrado' && venta.fechaCobro && (
                                                        <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1 whitespace-nowrap" title={`Cobrado el ${formatDate(venta.fechaCobro)}`}>
                                                            Tardó {getDaysPassed(venta.createdAt, venta.fechaCobro)} días
                                                        </div>
                                                    )}
                                                    {venta.estado === 'Pendiente' && venta.createdAt && (
                                                        <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1 whitespace-nowrap">
                                                            Hace {getDaysPassed(venta.createdAt, null)} días
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${venta.deuda > 0 ? 'text-red-600' : 'text-emerald-600'}`}>${venta.deuda?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</td>
                                            <td className="px-4 py-3 truncate max-w-[120px]" title={venta.destino}>{venta.destino}</td>
                                            <td className="px-4 py-3 truncate max-w-[150px]" title={venta.observaciones}>{venta.observaciones}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal Nueva Venta */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsAddModalOpen(false)}>
                    <div
                        className="bg-campo-beige-100 rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b flex items-center justify-between bg-campo-beige-50 shrink-0">
                            <h2 className="text-xl font-bold text-campo-carbon-800 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-campo-green-600" />
                                Nueva Venta
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                                <X className="h-5 w-5 text-campo-beige-500 hover:text-red-500" />
                            </Button>
                        </div>

                        <div className="p-6 overflow-y-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                {/* Transporte Info */}
                                <div className="space-y-4 lg:col-span-3 border-b border-campo-beige-200 pb-6">
                                    <h3 className="text-sm font-bold text-campo-carbon-800 uppercase tracking-wider">Transporte y Logística</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Remito</label>
                                            <input type="text" name="remito" value={formData.remito} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" placeholder="Nº de Remito" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Transportista</label>
                                            <input type="text" name="transportista" value={formData.transportista} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Contacto</label>
                                            <input type="text" name="contacto" value={formData.contacto} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Patente</label>
                                            <input type="text" name="patente" value={formData.patente} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Producto Info */}
                                <div className="space-y-4 lg:col-span-3 border-b border-campo-beige-200 pb-6">
                                    <h3 className="text-sm font-bold text-campo-carbon-800 uppercase tracking-wider">Detalles del Producto</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="lg:col-span-2">
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Producto</label>
                                            <input type="text" name="producto" value={formData.producto} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" placeholder="Ej: Fardos de Alfalfa" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Calidad</label>
                                            <select name="calidad" value={formData.calidad} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500">
                                                <option value="">Seleccionar...</option>
                                                <option value="Premium">Premium</option>
                                                <option value="Primera">Primera</option>
                                                <option value="Segunda">Segunda</option>
                                                <option value="Tercera">Tercera</option>
                                                <option value="Descarte">Descarte</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Cantidad</label>
                                            <input type="number" name="cantidad" value={formData.cantidad} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" placeholder="Unidades" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Peso Total (Kg)</label>
                                            <input type="number" name="peso" value={formData.peso} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Valores y Estado */}
                                <div className="space-y-4 lg:col-span-3">
                                    <h3 className="text-sm font-bold text-campo-carbon-800 uppercase tracking-wider">Facturación y Destino</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Precio por Kg ($)</label>
                                            <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Precio Total</label>
                                            <div className="flex h-10 w-full items-center rounded-md border border-transparent bg-campo-beige-200 px-3 py-2 text-lg font-bold text-campo-carbon-800">
                                                $ {calculateTotal().toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Estado Inicial</label>
                                            <select name="estado" value={formData.estado} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500">
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="Cobrado">Cobrado</option>
                                                <option value="Cancelada">Cancelada</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Deuda Inicial</label>
                                            <div className={`flex h-10 w-full items-center rounded-md border border-transparent px-3 py-2 text-sm font-bold ${formData.estado === 'Cobrado' || formData.estado === 'Cancelada' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                $ {(formData.estado === 'Cobrado' || formData.estado === 'Cancelada' ? 0 : calculateTotal()).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Destino</label>
                                            <input type="text" name="destino" value={formData.destino} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-xs font-medium text-campo-carbon-700 mb-1">Observaciones</label>
                                            <input type="text" name="observaciones" value={formData.observaciones} onChange={handleInputChange} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campo-green-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-campo-beige-50 flex justify-end gap-3 shrink-0">
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                            <Button className="bg-campo-green-600 hover:bg-campo-green-700 text-white shadow-md" onClick={handleSaveSale}>
                                Guardar Venta
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ventas;
