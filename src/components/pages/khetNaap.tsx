import { useState, useEffect } from 'react';
import { MapPin, Plus, Calculator, Trash2, RotateCcw, Navigation } from 'lucide-react';

interface Point {
    id: number;
    lat: number;
    lng: number;
    label: string;
}

const SQ_METER_TO_BIGHA = 0.000619; // 1 bigha ≈ 1614 sqm

function calcPolygonArea(points: Point[]): number {
    if (points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].lat * points[j].lng;
        area -= points[j].lat * points[i].lng;
    }
    const latToMeter = 111320;
    const lngToMeter = 111320 * Math.cos((points[0].lat * Math.PI) / 180);
    const scaledArea =
        Math.abs(area) *
        0.5 *
        latToMeter *
        lngToMeter;
    return scaledArea;
}

export default function KhetNaap() {
    const [points, setPoints] = useState<Point[]>([]);
    const [result, setResult] = useState<{ sqm: number; bigha: number } | null>(null);
    const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const defaultPosition = { lat: 26.394837, lng: 80.404412 };

    const useDemoLocation = () => {
        setCurrentPosition(defaultPosition);
        setError(null);
    };

    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setCurrentPosition({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setError(null);
                },
                (err) => {
                    setError('GPS अनुमति दें या सही स्थान पर हों');
                    console.error('Geolocation error:', err);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        } else {
            setError('आपका ब्राउज़र GPS सपोर्ट नहीं करता');
        }
    }, []);

    const addPoint = () => {
        if (!currentPosition) {
            alert('GPS स्थान मिल नहीं रहा। कृपया GPS चालू करें और बाहर जाएं।');
            return;
        }
        const newPoint: Point = {
            id: Date.now(),
            lat: currentPosition.lat,
            lng: currentPosition.lng,
            label: `बिंदु ${points.length + 1}`,
        };
        setPoints((prev) => [...prev, newPoint]);
        setResult(null);
    };

    const removePoint = (id: number) => {
        setPoints((prev) => prev.filter((p) => p.id !== id));
        setResult(null);
    };

    const calculate = () => {
        if (points.length < 3) {
            alert('कम से कम 3 बिंदु जोड़ें');
            return;
        }
        const sqm = calcPolygonArea(points);
        const bigha = sqm * SQ_METER_TO_BIGHA;
        setResult({ sqm, bigha });
    };

    const reset = () => {
        setPoints([]);
        setResult(null);
    };

    const mapCenter = currentPosition || defaultPosition;
    const satelliteMapUrl = `https://maps.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&z=18&t=k&output=embed`;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-green-700 px-4 pt-10 pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <MapPin size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold">खेत नापो</h1>
                        <p className="text-green-200 text-xs">अपने खेत का क्षेत्रफल मापें</p>
                        {currentPosition && (
                            <p className="text-green-300 text-xs mt-1">
                                📍 GPS: {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                            </p>
                        )}
                        {!currentPosition && !error && (
                            <p className="text-yellow-200 text-xs mt-1">📡 GPS खोज रहे हैं... कृपया लोकेशन अनुमति दें।</p>
                        )}
                        {error && (
                            <div className="space-y-1">
                                <p className="text-red-300 text-xs mt-1">⚠️ {error}</p>
                                <button
                                    onClick={useDemoLocation}
                                    className="mt-2 inline-flex items-center justify-center px-3 py-2 bg-white text-green-700 rounded-xl text-xs font-semibold border border-green-200 shadow-sm"
                                >
                                    डेमो लोकेशन खोलें
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4">
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="bg-green-50 border-b border-green-100 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-800">नक्शा / Map</span>
                        <span className="text-xs text-gray-400">{points.length} बिंदु जोड़े गए</span>
                    </div>
                    <div className="relative overflow-hidden rounded-3xl">
                        <iframe
                            title="Satellite Map"
                            src={satelliteMapUrl}
                            className="w-full h-[220px] border-0"
                            allowFullScreen
                            loading="lazy"
                        />
                        <div className="absolute left-3 top-3 bg-white/90 text-xs text-gray-700 rounded-full px-3 py-1 shadow-sm">
                            सैटेलाइट दृश्य
                        </div>
                        <div className="absolute right-3 bottom-3 bg-white/90 text-xs text-gray-700 rounded-full px-3 py-1 shadow-sm">
                            {currentPosition ? 'आपका स्थान' : 'डिफ़ॉल्ट स्थान'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={addPoint}
                        disabled={!currentPosition}
                        className="flex items-center justify-center gap-2 bg-green-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-md active:bg-green-700 transition-all text-base"
                    >
                        <Plus size={20} />
                        बिंदु जोड़ो
                    </button>
                    <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-600 font-bold py-4 rounded-2xl shadow-sm active:bg-gray-50 transition-all text-base"
                    >
                        <RotateCcw size={18} />
                        साफ करो
                    </button>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Navigation size={16} className="text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">कैसे इस्तेमाल करें:</span>
                    </div>
                    <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                        <li>खेत के एक कोने पर जाएं और "बिंदु जोड़ो" दबाएं</li>
                        <li>खेत के चारों कोनों पर घूमते हुए बिंदु जोड़ते रहें</li>
                        <li>कम से कम 3 बिंदु जोड़ें</li>
                        <li>"क्षेत्रफल निकालो" दबाएं</li>
                    </ol>
                </div>

                {points.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-3">
                        <p className="text-sm font-semibold text-gray-600 mb-2">जोड़े गए बिंदु:</p>
                        <div className="space-y-2">
                            {points.map((p, i) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">{i + 1}</span>
                                        </div>
                                        <span className="text-sm text-gray-700">{p.label}</span>
                                    </div>
                                    <button
                                        onClick={() => removePoint(p.id)}
                                        className="w-7 h-7 flex items-center justify-center text-red-400 active:text-red-600 rounded-full"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={calculate}
                    className="w-full flex items-center justify-center gap-3 bg-green-700 text-white font-bold py-5 rounded-2xl shadow-lg active:bg-green-800 transition-all text-lg"
                >
                    <Calculator size={22} />
                    क्षेत्रफल निकालो
                </button>

                {result && (
                    <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-green-200">
                        <p className="text-center text-green-700 font-bold text-lg mb-4">
                            आपके खेत का क्षेत्रफल
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 rounded-2xl p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">वर्ग मीटर</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {result.sqm.toFixed(0)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">sq. meter</p>
                            </div>
                            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">बीघा</p>
                                <p className="text-2xl font-bold text-emerald-700">
                                    {result.bigha.toFixed(3)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">bigha</p>
                            </div>
                        </div>
                        <div className="mt-3 bg-blue-50 rounded-xl p-3">
                            <p className="text-xs text-blue-700 text-center">
                                1 बीघा = लगभग 1614 वर्ग मीटर (यू.पी. / बिहार के अनुसार)
                            </p>
                            <p className="text-xs text-blue-600 text-center mt-1">
                                ⚠️ सटीकता GPS और खेत के आकार पर निर्भर करती है
                            </p>
                        </div>
                    </div>
                )}
                <div className="h-4" />
            </div>
        </div>
    );
}
