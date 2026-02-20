import { useState, useEffect } from 'react';

// Coordinates for Santa Rosa, Mendoza
const LAT = -33.2542;
const LON = -68.1508;

export const useWeather = () => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Fetch current weather + hourly data (past 1 day, forecast 2 days to cover 24h future)
                // timezone=auto ensures we get local time for Mendoza
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&past_days=1&forecast_days=2&timezone=auto`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch weather data');
                }

                const data = await response.json();

                // Process hourly data to get -24h to +24h from now
                const now = new Date();
                const currentHourIndex = data.hourly.time.findIndex(timeStr => {
                    const time = new Date(timeStr);
                    return time.getHours() === now.getHours() &&
                        time.getDate() === now.getDate() &&
                        time.getMonth() === now.getMonth();
                });

                if (currentHourIndex === -1) {
                    throw new Error('Could not find current time in weather data');
                }

                // Slice 6 hours before and 12 hours after (total 19 points including current hour)
                const startIndex = Math.max(0, currentHourIndex - 6);
                const endIndex = Math.min(data.hourly.time.length, currentHourIndex + 13);

                const timeline = [];
                for (let i = startIndex; i < endIndex; i++) {
                    timeline.push({
                        time: data.hourly.time[i],
                        temp: data.hourly.temperature_2m[i],
                        humidity: data.hourly.relative_humidity_2m[i],
                        wind: data.hourly.wind_speed_10m[i],
                        code: data.hourly.weather_code[i],
                        isPast: i < currentHourIndex,
                        isCurrent: i === currentHourIndex,
                        isFuture: i > currentHourIndex
                    });
                }

                setWeather({
                    current: {
                        temp: data.current.temperature_2m,
                        humidity: data.current.relative_humidity_2m,
                        wind: data.current.wind_speed_10m,
                        code: data.current.weather_code,
                    },
                    timeline
                });
                setLoading(false);
            } catch (err) {
                console.error("Error fetching weather:", err);
                setError(err);
                setLoading(false);
            }
        };

        fetchWeather();

        // Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return { weather, loading, error };
};

// Helper to get weather icon/label based on WMO code
export const getWeatherInfo = (code) => {
    // WMO Weather interpretation codes (WW)
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 71, 73, 75: Snow fall
    // 95, 96, 99: Thunderstorm

    if (code === 0) return { label: 'Despejado', icon: 'sun' };
    if (code >= 1 && code <= 3) return { label: 'Nublado', icon: 'cloud' };
    if (code >= 45 && code <= 48) return { label: 'Niebla', icon: 'cloud-fog' };
    if (code >= 51 && code <= 67) return { label: 'Lluvia', icon: 'cloud-rain' };
    if (code >= 71 && code <= 77) return { label: 'Nieve', icon: 'snowflake' };
    if (code >= 80 && code <= 82) return { label: 'Lluvia Fuerte', icon: 'cloud-rain' };
    if (code >= 95) return { label: 'Tormenta', icon: 'cloud-lightning' };

    return { label: 'Despejado', icon: 'sun' };
};
