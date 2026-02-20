
import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Circle, Droplets, DollarSign, Wrench, Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, AlertTriangle } from 'lucide-react';
import { useWeather, getWeatherInfo } from '../hooks/useWeather';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

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

const WeatherIcon = ({ iconName, className }) => {
    switch (iconName) {
        case 'sun': return <Sun className={className} />;
        case 'cloud': return <Cloud className={className} />;
        case 'cloud-rain': return <CloudRain className={className} />;
        case 'cloud-lightning': return <CloudLightning className={className} />;
        case 'snowflake': return <Snowflake className={className} />;
        case 'cloud-fog': return <CloudFog className={className} />;
        default: return <Sun className={className} />;
    }
};

const Dashboard = () => {
    const { weather, loading, error } = useWeather();
    const [recentActivities, setRecentActivities] = useState({});
    const [dashboardStats, setDashboardStats] = useState({
        readyToCut: 0,
        urgentToCut: 0,
        pastDue: 0
    });


    // Fetch activities from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "circles"), (snapshot) => {
            let allActivities = [];
            let currentStats = {
                readyToCut: 0,
                urgentToCut: 0,
                pastDue: 0
            };

            snapshot.forEach(doc => {
                const data = doc.data();

                // Calculate stats based on latest history
                if (!data.deleted && data.history && Array.isArray(data.history) && data.history.length > 0) {
                    const latestEntry = data.history[data.history.length - 1]; // Assuming appended chronologically
                    const alert = latestEntry.alert;
                    if (alert === 'Listo para cortar') currentStats.readyToCut++;
                    if (alert === 'Cortar urgente') currentStats.urgentToCut++;
                    if (alert === 'Pasado') currentStats.pastDue++;
                }


                if (data.history && Array.isArray(data.history)) {
                    data.history.forEach(activity => {
                        allActivities.push({
                            ...activity,
                            circleName: doc.id
                        });
                    });
                }
            });

            setDashboardStats(currentStats);

            // Sort by startDate descending
            allActivities.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

            // Group by day
            const grouped = allActivities.reduce((acc, activity) => {
                const date = new Date(activity.startDate);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                let dateKey = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                if (date.toDateString() === today.toDateString()) {
                    dateKey = 'Hoy';
                } else if (date.toDateString() === yesterday.toDateString()) {
                    dateKey = 'Ayer';
                }

                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(activity);
                return acc;
            }, {});

            setRecentActivities(grouped);
        }, (error) => {
            console.error("Error fetching activities:", error);
        });

        return () => unsubscribe();
    }, []);

    // Helper to format time
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDay = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('es-AR', { weekday: 'short' });
    };

    const getActivityColor = (activity) => {
        switch (activity) {
            case 'Corte': return 'bg-amber-500';
            case 'Rastrillado': return 'bg-orange-500';
            case 'Enfardado': return 'bg-purple-500';
            default: return 'bg-campo-beige-500';
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Panel General</h1>
                <p className="text-muted-foreground mt-2">Bienvenido al sistema de administración de campo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Listos para cortar"
                    value={dashboardStats.readyToCut}
                    change={0}
                    icon={Circle}
                    colorClass="bg-emerald-600"
                />
                <StatCard
                    title="Cortar urgente"
                    value={dashboardStats.urgentToCut}
                    change={0}
                    icon={AlertTriangle}
                    colorClass="bg-amber-500"
                />
                <StatCard
                    title="Pasados"
                    value={dashboardStats.pastDue}
                    change={0}
                    icon={AlertTriangle}
                    colorClass="bg-rose-600"
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
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[500px] overflow-y-auto pr-2">
                        <div className="space-y-6">
                            {Object.entries(recentActivities).map(([date, activities]) => (
                                <div key={date}>
                                    <h3 className="text-sm font-semibold text-campo-beige-600 mb-3 sticky top-0 bg-campo-beige-100 py-1">{date}</h3>
                                    <div className="space-y-3 pl-2 border-l-2 border-campo-beige-200 ml-1">
                                        {activities.map((activity) => (
                                            <div key={activity.id} className="relative pl-4 pb-1 group">
                                                <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${getActivityColor(activity.activity)}`}></div>
                                                <div className="flex justify-between items-start hover:bg-campo-beige-50 p-2 rounded-lg transition-colors -ml-2 -mt-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            <span className="font-bold text-campo-carbon-700">{activity.circleName}</span>
                                                            <span className="mx-2 text-campo-beige-400">|</span>
                                                            <span className={activity.activity ? 'text-campo-carbon-800' : 'text-campo-beige-600 italic'}>
                                                                {activity.activity || "Actualización de estado"}
                                                            </span>
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs px-2 py-0.5 bg-campo-beige-200 text-campo-carbon-600 rounded-full border border-campo-beige-300">
                                                                {activity.situation}
                                                            </span>
                                                            {activity.alert && (
                                                                <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    {activity.alert}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                        {formatTime(activity.startDate)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(recentActivities).length === 0 && (
                                <p className="text-center text-campo-beige-500 py-8">No hay actividades recientes.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-md h-full">
                    {loading ? (
                        <div className="h-full flex items-center justify-center p-6 bg-campo-beige-200 rounded-xl">
                            <p className="text-muted-foreground">Cargando clima...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center p-6 bg-red-50 rounded-xl">
                            <p className="text-red-500">Error al cargar clima</p>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-campo-green-500 to-campo-green-800 h-full p-6 text-white relative min-h-[300px]">
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <h2 className="text-lg font-bold mb-1">Santa Rosa, Mendoza</h2>
                                    <p className="text-lg font-semibold opacity-90 capitalize">
                                        {getWeatherInfo(weather.current.code).label}
                                    </p>
                                    <p className="text-5xl font-bold mt-4">{Math.round(weather.current.temp)}°C</p>
                                </div>
                                <div className="absolute -right-4 -top-4 opacity-20">
                                    <WeatherIcon iconName={getWeatherInfo(weather.current.code).icon} className="w-32 h-32" />
                                </div>
                                <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm z-10">
                                    <WeatherIcon iconName={getWeatherInfo(weather.current.code).icon} className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-black/10 rounded-lg p-3 backdrop-blur-sm">
                                    <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Humedad</p>
                                    <p className="text-xl font-semibold">{weather.current.humidity}%</p>
                                </div>
                                <div className="bg-black/10 rounded-lg p-3 backdrop-blur-sm">
                                    <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Viento</p>
                                    <p className="text-xl font-semibold">{weather.current.wind} km/h</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Weather Timeline Section */}
            {!loading && !error && weather && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pronóstico y Historial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto pb-4">
                            <div className="flex space-x-4 min-w-max">
                                {weather.timeline.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`flex flex-col items-center p-3 rounded-lg min-w-[80px] ${item.isCurrent
                                            ? 'bg-campo-green-100 border-2 border-campo-green-500'
                                            : item.isPast
                                                ? 'bg-campo-beige-50 opacity-70'
                                                : 'bg-campo-beige-100 border border-campo-beige-200'
                                            }`}
                                    >
                                        <p className="text-xs font-semibold text-campo-beige-600 mb-1">
                                            {formatDay(item.time)}
                                        </p>
                                        <p className="text-sm font-bold mb-2">
                                            {formatTime(item.time)}
                                        </p>
                                        <WeatherIcon
                                            iconName={getWeatherInfo(item.code).icon}
                                            className={`w-6 h-6 mb-2 ${item.isCurrent ? 'text-campo-green-600' : 'text-campo-carbon-600'}`}
                                        />
                                        <p className="text-lg font-bold">{Math.round(item.temp)}°</p>
                                        <div className="flex items-center mt-1 space-x-1 text-xs text-campo-beige-600">
                                            <Droplets className="w-3 h-3" />
                                            <span>{item.humidity}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Dashboard;
