import { ReactNode, useEffect, useState } from 'react';
import { Ruler, Leaf, Bug, Cloud, TrendingUp, MapPin, Droplets, Wind } from 'lucide-react';
import type { Page } from '../../App';
import { apiUrl } from '../../api';

interface Props {
    setPage: (page: Page) => void;
}

interface MandiPrice {
    unit: ReactNode;
    state: string;
    district?: string;
    market: string;
    commodity: string;
    arrival_date: string;
    min_price: number;
    max_price: number;
    modal_price: number;
}

interface Weather {
    temp: string;
    condition: string;
    max: string;
    min: string;
    humidity: string;
    wind: string;
    location?: string;
    feelsLike: string;
    pressure: string;
    clouds: string;
    visibility: string;
    sunrise: string;
    sunset: string;
    isDaytime?: boolean;
}

const defaultWeather: Weather = {
    temp: '32°C',
    condition: 'साफ आसमान',
    max: '35°',
    min: '24°',
    humidity: '65%',
    wind: '12 km/h',
    feelsLike: '32°C',
    pressure: '1013 hPa',
    clouds: '0% बादल',
    visibility: '10 km',
    sunrise: '05:50',
    sunset: '18:30',
    isDaytime: true
};

export default function HomePage({ setPage }: Props) {
    const [mandiPrices, setMandiPrices] = useState<MandiPrice[]>([]);
    const [mandiLoading, setMandiLoading] = useState(true);
    const [mandiError, setMandiError] = useState('');
    const [weather, setWeather] = useState<Weather>(defaultWeather);
    const [selectedCity, setSelectedCity] = useState<string>('Delhi');

    // Function to check if it's daytime using sunrise/sunset if available
    const isDaytime = (weather: Weather) => {
        const now = new Date();
        const nowUnix = Math.floor(now.getTime() / 1000);

        // Parse sunrise/sunset if provided as HH:MM
        if (weather.sunrise && weather.sunset) {
            const [srH, srM] = weather.sunrise.split(':').map(Number);
            const [ssH, ssM] = weather.sunset.split(':').map(Number);
            const sunriseUnix = now.setHours(srH, srM, 0, 0) / 1000;
            const sunsetUnix = now.setHours(ssH, ssM, 0, 0) / 1000;
            return nowUnix >= sunriseUnix && nowUnix <= sunsetUnix;
        }

        // Fallback to local time
        const hour = now.getHours();
        return hour >= 6 && hour < 18;
    };


    // Function to get emoji based on weather condition and time of day
    const getWeatherEmoji = (w: Weather) => {
        const condition = (w.condition ?? '').toLowerCase();
        const isDay = isDaytime(w);

        // Clear sky
        if (condition.includes('साफ') || condition.includes('clear')) {
            return isDay ? '☀️' : '🌙';
        }
        // Clouds
        if (condition.includes('बादल') || condition.includes('clouds')) {
            return isDay ? '☁️' : '🌙';
        }
        // Rain conditions
        if (condition.includes('बारिश') || condition.includes('rain')) return '🌧️';
        if (condition.includes('हल्की') || condition.includes('drizzle')) return '🌦️';
        // Storms
        if (condition.includes('आंधी') || condition.includes('thunderstorm')) return '⛈️';
        // Snow
        if (condition.includes('बर्फ') || condition.includes('snow')) return '❄️';
        // Fog/Haze
        if (condition.includes('कोहरा') || condition.includes('धुंध') || condition.includes('haze') || condition.includes('fog')) return '🌫️';
        // Dust/Wind
        if (condition.includes('धूल') || condition.includes('dust') || condition.includes('तूफान') || condition.includes('squall')) return '🌪️';
        if (condition.includes('बवंडर') || condition.includes('tornado')) return '🌪️';
        // Fallback
        return isDay ? '🌤️' : '🌙';
    };

    // Function to get farming suggestion based on weather
    const getWeatherSuggestion = (w: Weather) => {
        const condition = (w.condition ?? '').toLowerCase();
        const isDay = isDaytime(w);
        const humidityNum = parseInt(w.humidity || '0');
        const tempNum = parseInt(w.temp || '0');

        if (condition.includes('बारिश') || condition.includes('rain') || condition.includes('drizzle')) {
            return '💧 बारिश हो रही है। खेत में पानी जमा न होने दें। फसल को नुकसान से बचाएं।';
        }
        if (condition.includes('आंधी') || condition.includes('thunderstorm')) {
            return '⚠️ तूफान की संभावना। पेड़-पौधों को बांधें, खेत से दूर रहें।';
        }
        if (condition.includes('बर्फ') || condition.includes('snow') || tempNum < 10) {
            return '❄️ ठंड है। संवेदनशील फसलों को ढकें।';
        }
        if (condition.includes('धुंध') || condition.includes('कोहरा') || condition.includes('haze') || condition.includes('fog')) {
            return '🌫️ धुंध है। दवा छिड़काव टालें, दृश्यता कम।';
        }
        if (condition.includes('बादल') || condition.includes('clouds')) {
            return isDay ? '☁️ बादल हैं। हल्की सिंचाई करें।' : '☁️ रात बादलयुक्त। सुबह जांचें।';
        }
        // Irrigation advice based on humidity/temp
        if (humidityNum < 40) {
            return '💧 नमी कम (40% से कम)। सिंचाई करें, फसल को पानी दें।';
        }
        if (humidityNum > 70) {
            return '🌱 नमी अधिक। अतिरिक्त सिंचाई न करें, जड़ सड़न का खतरा।';
        }
        if (tempNum > 35) {
            return '🔥 तेज गर्मी। शाम को सिंचाई करें, पत्तियां झुलस सकती हैं।';
        }
        if (isDay) {
            return '✅ मौसम अनुकूल। खेत के काम के लिए अच्छा समय।';
        } else {
            return '🌙 रात समय। सुबह जल्दी खेत की जांच करें।';
        }
    };

    const parsePlaceName = async (lat: string, lon: string) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1`;
            const response = await fetch(url);
            const data = await response.json();
            const address = data?.address || {};
            const placeName =
                address.suburb ||
                address.neighbourhood ||
                address.village ||
                address.hamlet ||
                address.city_block ||
                address.residential ||
                address.road ||
                address.town ||
                address.city ||
                address.county ||
                address.state ||
                address.country;
            const cityOrTown =
                address.city ||
                address.town ||
                address.municipality ||
                address.city_district ||
                address.state_district ||
                address.county ||
                address.state;
            const state =
                address.state ||
                address.state_district ||
                address.region ||
                address.county;
            const country = address.country;
            const parts = [placeName, cityOrTown, state, country]
                .filter((value, index, self) => value && self.indexOf(value) === index);
            if (parts.length > 1) {
                return parts.join(', ');
            }
            if (data?.display_name) {
                return data.display_name.split(',').map((part: string) => part.trim()).slice(-4).join(', ');
            }
            return placeName || 'Current Location';
        } catch (error) {
            return 'Current Location';
        }
    };

    const today = new Date().toLocaleDateString('hi-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    useEffect(() => {
        setMandiLoading(true);
        setMandiError('');

        fetch(apiUrl('/api/mandi'))
            .then((response) => response.json())
            .then((data) => {
                if (!Array.isArray(data.records)) {
                    throw new Error('Invalid mandi response: records not found');
                }

                const records = data.records.slice(0, 5).map((item: any) => ({
                    state: item?.state ?? 'Unknown',
                    district: item?.district ?? '',
                    market: item?.market ?? 'Unknown Market',
                    commodity: item?.commodity ?? 'Unknown',
                    arrival_date: item?.arrival_date ?? '',
                    min_price: item?.min_price ?? 0,
                    max_price: item?.max_price ?? 0,
                    modal_price: item?.modal_price ?? 0,
                }));

                setMandiPrices(records);
            })
            .catch((error) => {
                console.error('Mandi fetch failed:', error);
                setMandiError('मंडी डेटा लोड करने में समस्या।');
            })
            .finally(() => {
                setMandiLoading(false);
            });
    }, []);

    useEffect(() => {
        // Auto-detect location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(4);
                    const lon = position.coords.longitude.toFixed(4);
                    fetch(apiUrl(`/api/weather?lat=${lat}&lon=${lon}`))
                        .then(async (response) => {
                            const data = await response.json();
                            if (!response.ok || !data || !data.temp || !data.condition) {
                                throw new Error('Invalid weather response');
                            }
                            const locationName = await parsePlaceName(lat, lon);
                            setWeather({ ...defaultWeather, ...data, location: locationName });
                            console.log(data, locationName);
                            setSelectedCity(locationName || 'Current Location');
                        })
                        .catch((err) => {
                            console.error('Geolocation weather failed:', err);
                            setWeather(defaultWeather);
                        });
                },
                (_error) => {
                    console.log('Geolocation denied, using default city');
                    fetchDefaultCityWeather();
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        } else {
            fetchDefaultCityWeather();
        }

        function fetchDefaultCityWeather() {
            fetch(apiUrl(`/api/weather?city=${encodeURIComponent(selectedCity)}`))
                .then(async (response) => {
                    const data = await response.json();
                    if (!response.ok || !data || !data.temp || !data.condition) {
                        throw new Error('Invalid weather response');
                    }
                    setWeather({ ...defaultWeather, ...data });
                })
                .catch((err) => {
                    console.error('Default city weather failed:', err);
                    setWeather(defaultWeather);
                });
        }
    }, []);


    return (
        <div className="min-h-screen bg-gray-50">
            <div
                className="bg-green-700 px-4 pt-10 pb-16"
                style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)' }}
            >
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Leaf size={18} className="text-green-700" />
                    </div>
                    <span className="text-green-100 text-sm font-medium">Smart Kisan</span>
                </div>
                <h1 className="text-white text-2xl font-bold leading-tight mt-2">
                    Smart Kisan
                </h1>
                <p className="text-green-200 text-sm mt-1">आपका खेती सहायक</p>
                <div className="flex items-center gap-1 mt-2">
                    <MapPin size={13} className="text-green-300" />
                    <span className="text-green-300 text-xs">{today}</span>
                </div>
            </div>

            <div className="px-4 -mt-8">
                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Cloud size={18} className="text-blue-500" />
                        <span className="font-bold text-gray-800 text-base">आज का मौसम</span>
                    </div>
                    <div className="mb-4 rounded-2xl border border-green-100 bg-green-50/80 p-3 text-center text-gray-700 shadow-sm">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-green-700 shadow-sm">
                            <MapPin size={14} /> आपका स्थान
                        </div>
                        {weather?.location ? (
                            weather.location.split(',').map((part, idx) => (
                                <div
                                    key={idx}
                                    className={idx === 0 ? 'mt-3 text-base font-semibold text-gray-900' : 'text-sm text-gray-600'}
                                >
                                    {part.trim()}
                                </div>
                            ))
                        ) : (
                            <div className="mt-3 text-sm text-gray-600">आपका स्थान खोज रहे हैं...</div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="text-4xl">{getWeatherEmoji(weather)}</div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800">{weather.temp}</p>
                                <p className="text-gray-500 text-sm">{weather.condition}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">अधिकतम / न्यूनतम</p>
                            <p className="text-base font-semibold text-gray-700">{weather.max} / {weather.min}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                        <div className="flex flex-col items-center gap-1">
                            <Droplets size={16} className="text-blue-400" />
                            <span className="text-xs text-gray-500">नमी</span>
                            <span className="text-sm font-semibold text-gray-700">{weather.humidity}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Wind size={16} className="text-gray-400" />
                            <span className="text-xs text-gray-500">हवा</span>
                            <span className="text-sm font-semibold text-gray-700">{weather.wind}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Cloud size={16} className="text-gray-400" />
                            <span className="text-xs text-gray-500">बारिश</span>
                            <span className="text-sm font-semibold text-gray-700">0 mm</span>
                        </div>
                    </div>
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-2">
                        <p className="text-xs text-yellow-800 font-medium">
                            {getWeatherSuggestion(weather)}
                        </p>
                    </div>
                </div>

                <p className="text-lg font-bold text-gray-800 mb-3 px-1">क्या करना है?</p>
                <div className="grid grid-cols-1 gap-3 mb-4">
                    <button
                        onClick={() => setPage('khet')}
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-5 border-2 border-green-100 active:border-green-400 active:bg-green-50 transition-all"
                    >
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Ruler size={28} className="text-green-700" />
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-bold text-gray-800">📏 खेत नापो</p>
                            <p className="text-sm text-gray-500 mt-0.5">अपने खेत का क्षेत्रफल जानो</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setPage('fasal')}
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-5 border-2 border-green-100 active:border-green-400 active:bg-green-50 transition-all"
                    >
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Leaf size={28} className="text-emerald-700" />
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-bold text-gray-800">🌱 फसल सुझाव</p>
                            <p className="text-sm text-gray-500 mt-0.5">कौन सी फसल लगाएं जानो</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setPage('rog')}
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-5 border-2 border-green-100 active:border-green-400 active:bg-green-50 transition-all"
                    >
                        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Bug size={28} className="text-orange-600" />
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-bold text-gray-800">🐛 रोग पहचान</p>
                            <p className="text-sm text-gray-500 mt-0.5">फसल की बीमारी पहचानो</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setPage('mandi')}
                        className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-5 border-2 border-green-100 active:border-green-400 active:bg-green-50 transition-all"
                    >
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <TrendingUp size={28} className="text-emerald-700" />
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-bold text-gray-800">📈 मंडी भाव</p>
                            <p className="text-sm text-gray-500 mt-0.5">ताज़ा मंडी जानकारी देखें</p>
                        </div>
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={18} className="text-green-600" />
                            <span className="font-bold text-gray-800 text-base">आज का मंडी भाव</span>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">लाइव</span>
                    </div>
                    <div className="space-y-2">
                        {mandiLoading ? (
                            <div className="py-4 text-sm text-gray-500">मंडी डेटा लोड हो रहा है...</div>
                        ) : mandiError ? (
                            <div className="py-4 text-sm text-red-600">{mandiError}</div>
                        ) : mandiPrices.length === 0 ? (
                            <div className="py-4 text-sm text-gray-500">मंडी डेटा उपलब्ध नहीं है।</div>
                        ) : (
                            mandiPrices.map((item) => (
                                <div
                                    key={`${item.commodity}-${item.market}-${item.arrival_date}`}
                                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-700">{item.commodity}</div>
                                            <div className="text-xs text-gray-400">{item.market} · {item.state}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-gray-800">₹{item.modal_price}</span>
                                        <span className="text-xs text-gray-400">{item.unit}</span>
                                        <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full text-gray-600 bg-gray-100">
                                            {item.arrival_date || '—'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">* भाव रुपये में हैं</p>
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setPage('mandi')}
                            className="inline-flex items-center gap-2 rounded-2xl bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-800"
                        >
                            <TrendingUp size={16} /> पूरा मंडी डैशबोर्ड देखें
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
