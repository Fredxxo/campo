import React, { useState } from 'react';
import mapaImg from '../assets/mapa.jpg'; // Asegúrate de reemplazar esta imagen con la foto satelital real
import { Info, Map as MapIcon, Navigation } from 'lucide-react';

// Coordenadas aproximadas basadas en la foto proporcionada. (top, left as percentages)
// Se pueden ajustar para que coincidan perfectamente con tu imagen después de colocar el archivo.
const MARKERS = [
    { id: 1, top: '86%', left: '16%' },
    { id: 2, top: '78%', left: '21%' },
    { id: 3, top: '70%', left: '28%' },
    { id: 4, top: '62%', left: '42%' },
    { id: 5, top: '48%', left: '46%' },
    { id: 6, top: '36%', left: '55%' },
    { id: 7, top: '44%', left: '35%' },
    { id: 8, top: '38%', left: '26%' },
    { id: 9, top: '34%', left: '42%' },
    { id: 10, top: '28%', left: '32%' },
    { id: 11, top: '26%', left: '46%' },
    { id: 12, top: '20%', left: '36%' },
    { id: 14, top: '10%', left: '46%' },
    { id: 15, top: '66%', left: '60%' },
    { id: 16, top: '74%', left: '76%' },
    { id: 17, top: '80%', left: '88%' },
];

const Mapa = () => {
    const [activeMarker, setActiveMarker] = useState(null);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-campo-carbon-800 flex items-center gap-2">
                        <MapIcon className="text-campo-green-700" size={28} />
                        Mapa de Círculos
                    </h1>
                    <p className="text-campo-beige-600 mt-1">
                        Vista interactiva del establecimiento y distribución de los lotes.
                    </p>
                </div>

                <div className="bg-campo-green-50 p-4 rounded-xl border border-campo-green-200 flex items-start gap-3 max-w-md">
                    <Info className="text-campo-green-700 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-campo-green-900">
                        <strong>Modo premium interactivo:</strong> La imagen se ha mejorado mediante filtros. Asegurate de subir la foto satelital en <code className="bg-campo-green-200 px-1 rounded">src/assets/mapa.jpg</code> para ver tu campo aquí.
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-campo-beige-200 overflow-hidden relative group">

                {/* Contenedor del Mapa con proporción */}
                <div className="relative w-full aspect-[3/4] md:aspect-[4/3] lg:aspect-[16/9] bg-campo-green-900 overflow-hidden flex items-center justify-center">

                    {/* Imagen de fondo con filtros CSS para look "premium" y de marca */}
                    <div className="absolute inset-0 w-full h-full mix-blend-luminosity opacity-80 z-0 bg-campo-carbon-900">
                        <img
                            src={mapaImg}
                            alt="Mapa Satelital del Campo"
                            className="w-full h-full object-cover sepia-[.3] contrast-125 saturate-50 transition-transform duration-1000 group-hover:scale-105"
                            onError={(e) => {
                                // Fallback visual en caso de que aún no exista la imagen real
                                e.target.style.display = 'none';
                                e.target.parentElement.classList.add('bg-[url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2689")]', 'bg-cover', 'bg-center');
                            }}
                        />
                        {/* Overlay de gradiente para darle profundidad y lectura clara al mapa */}
                        <div className="absolute inset-0 bg-gradient-to-t from-campo-green-950/80 via-campo-green-900/20 to-transparent"></div>
                    </div>

                    {/* Renderizado de Marcadores */}
                    {MARKERS.map((marker) => (
                        <div
                            key={marker.id}
                            className="absolute z-10"
                            style={{ top: marker.top, left: marker.left }}
                            onMouseEnter={() => setActiveMarker(marker.id)}
                            onMouseLeave={() => setActiveMarker(null)}
                        >
                            <div
                                className={`
                  relative transform -translate-x-1/2 -translate-y-1/2 
                  w-10 h-10 md:w-14 md:h-14 
                  rounded-full flex items-center justify-center font-bold text-lg md:text-xl
                  cursor-pointer transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)]
                  backdrop-blur-md
                  ${activeMarker === marker.id
                                        ? 'scale-125 bg-campo-beige-100 text-campo-green-900 border-2 border-campo-green-700 z-50'
                                        : 'bg-campo-green-900/70 border border-campo-beige-300/50 text-white hover:bg-campo-green-700'
                                    }
                `}
                            >
                                {marker.id}

                                {/* Tooltip Dinámico */}
                                <div className={`
                    absolute top-full lg:left-full lg:top-1/2 lg:-translate-y-1/2 mt-3 lg:mt-0 lg:ml-4 bg-white text-left p-3 rounded-lg shadow-xl shadow-campo-green-900/20 text-campo-carbon-800 text-sm whitespace-nowrap border border-campo-beige-200 transition-all duration-300
                    ${activeMarker === marker.id ? 'opacity-100 translate-y-0 visible scale-100' : 'opacity-0 translate-y-2 invisible scale-95'}
                  `}>
                                    <div className="font-bold text-campo-green-800 text-base mb-1 flex items-center gap-1.5">
                                        <Navigation size={14} className="text-campo-beige-500" />
                                        Círculo {marker.id}
                                    </div>
                                    <div className="text-campo-beige-600 flex flex-col gap-0.5">
                                        <span>• Área activa</span>
                                        <span>• Ver detalles del lote</span>
                                    </div>
                                    <div className="mt-2 w-full h-1 bg-campo-beige-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-campo-green-500 w-3/4"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Título y leyenda integrada en la imagen */}
                    <div className="absolute bottom-6 left-6 z-0 text-white pointer-events-none drop-shadow-md hidden md:block">
                        <h2 className="text-3xl font-bold tracking-tight text-campo-beige-100">Bodega El Retiro</h2>
                        <p className="text-campo-beige-300 flex items-center gap-2 mt-1">
                            <MapIcon size={16} />
                            La Salada de Cuyo
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Mapa;
