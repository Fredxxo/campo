import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Info, Map as MapIcon, Navigation, CheckCircle2, AlertTriangle, Route } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Button } from '../components/ui/Button';

// Fix for default Leaflet icon not showing correctly in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create Custom DivIcon factory for our "Círculos"
const createCircleIcon = (circleNumber, colorClass, isUnplanted = false) => {
    const baseClasses = isUnplanted
        ? "bg-campo-beige-100 border-campo-beige-400 border-dashed text-campo-beige-500 shadow-none opacity-90"
        : "bg-white border-white shadow-[0_4px_10px_rgba(0,0,0,0.5)] text-gray-900";

    const innerColorClasses = isUnplanted ? "bg-transparent" : colorClass;

    return L.divIcon({
        className: 'custom-circle-marker',
        html: `
      <div class="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-4 transform -translate-x-1/2 -translate-y-1/2 group transition-transform hover:scale-110 ${baseClasses}">
        <div class="absolute inset-0 rounded-full opacity-80 ${innerColorClasses}"></div>
        <span class="relative z-10 font-bold text-lg md:text-xl">${circleNumber}</span>
      </div>
    `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
    });
};

const DEFAULT_CENTER = [-33.2450, -68.1560]; // Santa Rosa, Mendoza (prox)

const statusColors = {
    'Listo para cortar': 'bg-emerald-500',
    'Cortar urgente': 'bg-amber-500',
    'Pasado': 'bg-red-500',
    'Normal': 'bg-campo-green-500',
};

const activityColors = {
    'En crecimiento': 'bg-campo-green-400',
    'Corte': 'bg-amber-400',
    'Rastrillado': 'bg-orange-400',
    'Enfardado': 'bg-purple-400',
    'Sin actividad': 'bg-gray-400'
};

// Remove '13' from the map entirely
const mapMarkers = Array.from({ length: 18 }, (_, i) => String(i + 1)).filter(n => n !== '13');
const ALLOWED_MARKERS = mapMarkers;

// Círculos que solo están en el mapa (no plantados/inactivos en la gestión)
const UNPLANTED_CIRCLES = ['6', '7', '8', '10', '12', '16'];

const DraggableMarker = ({ circulo, isEditMode, updatePosition }) => {
    const [position, setPosition] = useState(circulo.position || DEFAULT_CENTER);
    const markerRef = useRef(null);

    // To avoid unnecesary renders while dragging, handle it in Leaflet events
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const newPos = marker.getLatLng();
                    setPosition(newPos);
                    updatePosition(circulo, { lat: newPos.lat, lng: newPos.lng });
                }
            },
        }),
        [circulo, updatePosition],
    );

    // Sync state if firebase changes
    useEffect(() => {
        if (circulo.position) {
            setPosition(circulo.position);
        }
    }, [circulo.position]);

    const currentStatus = circulo.status || 'Normal';
    const isUnplanted = UNPLANTED_CIRCLES.includes(String(circulo.name));
    const currentActivity = isUnplanted ? 'No plantado' : (circulo.activity || 'Sin actividad');

    // Decide what color to show. Status Alert overrides Activity color
    const colorClass = (currentStatus !== 'Normal' && currentStatus !== '')
        ? statusColors[currentStatus] || statusColors['Normal']
        : activityColors[currentActivity] || (isUnplanted ? 'bg-transparent' : activityColors['Sin actividad']);

    const icon = createCircleIcon(circulo.name, colorClass, isUnplanted);

    return (
        <Marker
            draggable={isEditMode}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
            icon={icon}
            zIndexOffset={isEditMode ? 1000 : 0} // Traer al frente al editar
        >
            <Popup className="custom-popup">
                <div className="p-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <div className={`w-3 h-3 rounded-full ${isUnplanted ? 'bg-campo-beige-400' : colorClass}`}></div>
                        <h3 className="font-bold text-lg text-gray-800 m-0 leading-none">Círculo {circulo.name} {isUnplanted ? '(No Plantado)' : ''}</h3>
                    </div>

                    <div className="space-y-1.5 text-sm mt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Lotes:</span>
                            <span className="font-medium text-right ml-2 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] leading-tight max-w-[120px] truncate" title={circulo.originalNames?.join(', ')}>
                                {circulo.originalNames?.join(', ')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Alertas conjuntas:</span>
                            <span className="font-medium px-2 py-0.5 rounded text-xs bg-gray-100">{currentStatus || 'Normal'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Actividad:</span>
                            <span className="font-medium text-right ml-2 truncate max-w-[100px]">{currentActivity}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Has. Totales:</span>
                            <span className="font-medium">{circulo.hectares || '-'} ha</span>
                        </div>
                    </div>

                    {isEditMode && (
                        <div className="mt-3 pt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 text-center font-bold">
                            📍 Arrástrame para guardar ubicación
                        </div>
                    )}
                </div>
            </Popup>
        </Marker>
    )
};

const Mapa = () => {
    const [circulos, setCirculos] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "circles"), (snapshot) => {
            const groups = {};

            // Inicializar todos los marcadores solicitados para asegurar que aparezcan
            ALLOWED_MARKERS.forEach(markerNumber => {
                groups[markerNumber] = {
                    name: markerNumber,
                    originalNames: [],
                    hectares: 0,
                    position: null,
                    statuses: new Set(),
                    activities: new Set(),
                };
            });

            let validCenter = null;

            snapshot.forEach(doc => {
                const c = doc.data();

                // Extraer solo el número inicial del nombre (ej: "17 sur" -> "17", "15(1)" -> "15")
                const match = doc.id.match(/^(\d+)/);
                if (!match) return; // Ignorar si no empieza con número
                const mainNumber = match[1];

                // Filtrar solo los números principales solicitados
                if (!ALLOWED_MARKERS.includes(mainNumber)) return;

                if (!groups[mainNumber]) {
                    // Solo procesar si es uno de los marcadores solicitados
                    return;
                }

                const group = groups[mainNumber];

                if (c.deleted) {
                    // Si el lote principal o sublote está borrado, igual usamos su posición si existe
                    // para no perder su ubicación en el mapa.
                    if (c.lat && c.lng && !group.position) {
                        group.position = [c.lat, c.lng];
                    }
                    return; // No sumar hectáreas ni actividades de círculos borrados
                }

                // Decode current status/activity
                let currentStatus = '';
                if (c.statusHistory && c.statusHistory.length > 0) {
                    currentStatus = c.statusHistory[c.statusHistory.length - 1].status;
                }

                let currentActivity = '';
                if (c.history && c.history.length > 0) {
                    currentActivity = c.history[c.history.length - 1].activity;
                }

                group.originalNames.push(doc.id);
                group.hectares += (parseFloat(c.hectares) || 0);

                if (c.lat && c.lng && !group.position) {
                    group.position = [c.lat, c.lng];
                    if (!validCenter) validCenter = group.position;
                }

                if (currentStatus && currentStatus !== 'Normal') group.statuses.add(currentStatus);
                if (currentActivity && currentActivity !== 'Sin actividad') group.activities.add(currentActivity);
            });

            const processedData = Object.values(groups).map((group) => {
                // Determinar el status "peor" para pintar (Pasado > Cortar urgente > Listo para cortar > Normal)
                let finalStatus = 'Normal';
                if (group.statuses.has('Pasado')) finalStatus = 'Pasado';
                else if (group.statuses.has('Cortar urgente')) finalStatus = 'Cortar urgente';
                else if (group.statuses.has('Listo para cortar')) finalStatus = 'Listo para cortar';

                // Determinar actividad preferente
                let finalActivity = 'Sin actividad';
                if (group.activities.size > 0) {
                    finalActivity = Array.from(group.activities)[0]; // Tomar alguna de las activas
                }

                let pos = group.position;
                if (!pos) {
                    // Posición predeterminada determinista para que no "salten" en cada actualización
                    const num = parseInt(group.name) || 0;
                    const latOffset = Math.sin(num * Math.PI / 4) * 0.02; // Distribución en círculo
                    const lngOffset = Math.cos(num * Math.PI / 4) * 0.02;
                    pos = [DEFAULT_CENTER[0] + latOffset, DEFAULT_CENTER[1] + lngOffset];
                }

                return {
                    name: group.name,
                    originalNames: group.originalNames,
                    hectares: group.hectares > 0 ? group.hectares.toFixed(1) : 0,
                    position: pos,
                    status: finalStatus,
                    activity: finalActivity,
                    subCirclesCount: group.originalNames.length
                };
            });

            // Sort circles just for consistency
            processedData.sort((a, b) => parseInt(a.name) - parseInt(b.name));

            setCirculos(processedData);
            if (validCenter && !isEditMode) setMapCenter(validCenter);
        });

        return () => unsubscribe();
    }, [isEditMode]);

    const updateCirclePosition = async (circuloData, newPosition) => {
        try {
            // Si el lote principal no tiene subdiviones en Firebase aún, guardamos usando el nombre principal (ej: "1")
            const namesToUpdate = circuloData.originalNames && circuloData.originalNames.length > 0
                ? circuloData.originalNames
                : [circuloData.name];

            // Guardar la nueva posición en todos los sub-lotes (o en el principal)
            const promises = namesToUpdate.map(name =>
                setDoc(doc(db, "circles", name), {
                    lat: newPosition.lat,
                    lng: newPosition.lng,
                    // Aseguramos que se inicie con historial vacío si es un documento nuevo
                    history: [],
                    statusHistory: []
                }, { merge: true })
            );
            await Promise.all(promises);
        } catch (error) {
            console.error("Error updating position:", error);
        }
    };

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-campo-carbon-800 flex items-center gap-2">
                        <MapIcon className="text-campo-green-700" size={28} />
                        Mapa Interactivo de Círculos
                    </h1>
                    <p className="text-campo-beige-600 mt-1">
                        Vista satelital real del establecimiento agrícola para gestión espacial.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="bg-campo-green-50 px-4 py-2.5 rounded-xl border border-campo-green-200 flex items-center gap-3">
                        <Info className="text-campo-green-700 flex-shrink-0" size={20} />
                        <span className="text-sm text-campo-carbon-700 leading-tight">
                            {!isEditMode
                                ? <span>Haz clic en "Ubicar Círculos" central para arrastrar cada lote a su lugar.</span>
                                : <span><strong>Modo Edición:</strong> Arrastra cada ícono a su lugar. El GPS se guarda solo.</span>}
                        </span>
                    </div>

                    <Button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`whitespace-nowrap px-6 py-2.5 h-auto text-sm font-bold shadow-lg transition-all duration-300 ${isEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2' : 'bg-campo-green-600 hover:bg-campo-green-700 text-white shadow-campo-green-600/30'}`}
                    >
                        {isEditMode ? (
                            <><CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar</>
                        ) : (
                            <><Route className="mr-2 h-4 w-4" /> Ubicar Círculos</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-campo-beige-200 overflow-hidden relative flex-1 min-h-[400px]">
                {circulos.length > 0 ? (
                    <MapContainer
                        center={mapCenter}
                        zoom={14}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', zIndex: 10 }}
                        className="leaflet-map-wrapper bg-campo-green-950"
                    >
                        {/* Esri World Imagery (High Resolution Satellite) */}
                        <TileLayer
                            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, IGN, IGP, UPR-EGP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            maxZoom={18}
                        />

                        {circulos.map((circulo) => (
                            <DraggableMarker
                                key={circulo.name}
                                circulo={circulo}
                                isEditMode={isEditMode}
                                updatePosition={updateCirclePosition}
                            />
                        ))}
                    </MapContainer>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 flex-col gap-4">
                        <div className="w-12 h-12 border-4 border-campo-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">Cargando mapa interactivo y conectando con el satélite...</p>
                    </div>
                )}

                {/* Legend Overlay */}
                <div className="absolute bottom-6 left-6 z-[400] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl shadow-black/10 border border-gray-200 pointer-events-none transition-opacity duration-300">
                    <h4 className="font-bold text-sm text-gray-800 mb-3 border-b pb-2">Referencia de Colores</h4>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-3.5 h-3.5 rounded-full ${statusColors['Listo para cortar']}`}></div>
                            <span className="text-xs font-medium text-gray-700">Listo para cortar</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className={`w-3.5 h-3.5 rounded-full ${statusColors['Cortar urgente']}`}></div>
                            <span className="text-xs font-medium text-gray-700">Cortar urgente</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className={`w-3.5 h-3.5 rounded-full ${activityColors['En crecimiento']}`}></div>
                            <span className="text-xs font-medium text-gray-700">En Crecimiento / Regando</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className={`w-3.5 h-3.5 rounded-full ${activityColors['Corte']}`}></div>
                            <span className="text-xs font-medium text-gray-700">En Tareas (Rastrillado, Fardo)</span>
                        </div>
                        <div className="flex items-center gap-2.5 pt-1 border-t border-gray-100 mt-1">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-dashed border-campo-beige-400 bg-campo-beige-100`}></div>
                            <span className="text-xs font-medium text-campo-beige-600">No Plantado (Solo Referencia)</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
              .leaflet-container {
                font-family: inherit;
              }
              .custom-circle-marker {
                background: transparent;
                border: none;
              }
              .custom-popup .leaflet-popup-content-wrapper {
                 border-radius: 12px;
                 padding: 0;
                 overflow: hidden;
                 box-shadow: 0 10px 25px rgba(0,0,0,0.15);
              }
              .custom-popup .leaflet-popup-content {
                 margin: 14px 16px;
                 line-height: 1.4;
              }
              .custom-popup .leaflet-popup-tip-container {
                 margin-top: -1px;
              }
            `}</style>
        </div>
    );
};

export default Mapa;
