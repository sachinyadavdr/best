import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, TrendingUp, Loader2, ArrowRight } from 'lucide-react';
import { apiUrl } from '../../api';

interface MandiPrice {
    variety?: string;
    state: string;
    district?: string;
    market: string;
    commodity: string;
    arrival_date: string;
    min_price: number;
    max_price: number;
    modal_price: number;
}

interface MandiApiResponse {
    source: string;
    lastUpdated: string;
    apiError?: string;
    records: MandiPrice[];
}

export default function MandiDashboard() {
    const [records, setRecords] = useState<MandiPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedState, setSelectedState] = useState('All');
    const [selectedCommodity, setSelectedCommodity] = useState('All');
    const [lastUpdated, setLastUpdated] = useState('');
    const [source, setSource] = useState('');
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        const fetchMandi = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(apiUrl('/api/mandi?limit=40'));
                const data: MandiApiResponse = await response.json();
                if (!response.ok) {
                    throw new Error('मंडी डेटा लोड नहीं हो पाया');
                }
                setRecords(data.records || []);
                setLastUpdated(data.lastUpdated || '');
                setSource(data.source || 'fallback');
                setApiError(data.apiError || '');
            } catch (err) {
                console.error(err);
                setError('मंडी डेटा लोड करने में समस्या। कृपया बाद में फिर से प्रयास करें।');
            } finally {
                setLoading(false);
            }
        };

        fetchMandi();
    }, []);

    const states = useMemo(() => {
        const values = Array.from(new Set(records.map((item) => item.state))).filter(Boolean).sort();
        return ['All', ...values];
    }, [records]);

    const commodities = useMemo(() => {
        const values = Array.from(new Set(records.map((item) => item.commodity))).filter(Boolean).sort();
        return ['All', ...values];
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter((item) => {
            const matchesSearch = search
                ? [item.commodity, item.market, item.state, item.variety]
                    .filter(Boolean)
                    .some((value) => value?.toLowerCase().includes(search.toLowerCase()))
                : true;
            const matchesState = selectedState === 'All' || item.state === selectedState;
            const matchesCommodity = selectedCommodity === 'All' || item.commodity === selectedCommodity;
            return matchesSearch && matchesState && matchesCommodity;
        });
    }, [records, search, selectedState, selectedCommodity]);

    const bestDeal = useMemo(() => {
        if (!filteredRecords.length) return null;
        const sorted = [...filteredRecords].sort((a, b) => Number(b.modal_price) - Number(a.modal_price));
        return sorted[0];
    }, [filteredRecords]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-br from-green-700 via-emerald-700 to-emerald-800 px-4 pt-10 pb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <TrendingUp size={18} className="text-green-700" />
                    </div>
                    <span className="text-green-100 text-sm font-medium">Smart Kisan</span>
                </div>
                <h1 className="text-white text-2xl font-bold leading-tight mt-2">मंडी डैशबोर्ड</h1>
                <p className="text-green-200 text-sm mt-1">आज का मंडी भाव और बाजार जानकारी</p>
            </div>

            <div className="px-4 -mt-8 pb-24">
                <div className="bg-white rounded-3xl shadow-lg p-4 mb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-500">आज का मंडी भाव</p>
                            <h2 className="text-xl font-bold text-gray-900 mt-2">सजीव मंडी अपडेट</h2>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                            <span className="text-xs text-gray-400 uppercase tracking-[0.18em]">अपडेट</span>
                            <span className="text-sm font-semibold text-gray-800">{lastUpdated || '---'}</span>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-green-100 bg-green-50 p-4">
                            <p className="text-xs uppercase text-green-700">सोर्स</p>
                            <p className="mt-2 text-base font-semibold text-gray-900">{source === 'fallback' ? 'स्थिर डेटा' : 'data.gov.in'}</p>
                        </div>
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-xs uppercase text-gray-500">प्रस्तावित सर्वोत्तम मंडी</p>
                            <p className="mt-2 text-base font-semibold text-gray-900">{bestDeal ? `${bestDeal.commodity} · ${bestDeal.market}` : 'डेटा उपलब्ध नहीं'}</p>
                        </div>
                    </div>
                    {source === 'fallback' && apiError ? (
                        <div className="mt-4 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                            API समस्या: {apiError}
                        </div>
                    ) : null}
                </div>

                <div className="bg-white rounded-3xl shadow-lg p-4 mb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="खोजें: फसल, मंडी, राज्य..."
                                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                                <Filter size={16} /> फ़िल्टर
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <select
                            value={selectedState}
                            onChange={(event) => setSelectedState(event.target.value)}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-400"
                        >
                            {states.map((state) => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                        <select
                            value={selectedCommodity}
                            onChange={(event) => setSelectedCommodity(event.target.value)}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-400"
                        >
                            {commodities.map((commodity) => (
                                <option key={commodity} value={commodity}>{commodity}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-3xl bg-white p-6 shadow-sm text-center text-gray-600">
                        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-green-600" />
                        मंडी डेटा लोड हो रहा है...
                    </div>
                ) : error ? (
                    <div className="rounded-3xl bg-red-50 p-6 shadow-sm text-center text-red-700">
                        {error}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3">
                            {filteredRecords.slice(0, 12).map((item) => (
                                <div key={`${item.market}-${item.commodity}-${item.arrival_date}`} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-gray-500">{item.commodity}</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{item.market}</p>
                                            <p className="text-xs text-gray-400 mt-1">{item.state}</p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700">
                                            <TrendingUp size={12} />
                                            लाइव
                                        </span>
                                    </div>
                                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                        <div className="rounded-2xl bg-gray-50 p-3 text-center">
                                            <p className="text-xs text-gray-500">मिन. भाव</p>
                                            <p className="mt-2 text-lg font-semibold text-gray-900">₹{item.min_price}</p>
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 p-3 text-center">
                                            <p className="text-xs text-gray-500">मॉडल भाव</p>
                                            <p className="mt-2 text-lg font-semibold text-gray-900">₹{item.modal_price}</p>
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 p-3 text-center">
                                            <p className="text-xs text-gray-500">अधिकतम भाव</p>
                                            <p className="mt-2 text-lg font-semibold text-gray-900">₹{item.max_price}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                        <span>अंतिम अपडेट: {item.arrival_date}</span>
                                        <span className="inline-flex items-center gap-1">देखें <ArrowRight size={12} /></span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredRecords.length === 0 && (
                            <div className="rounded-3xl bg-yellow-50 p-6 shadow-sm text-center text-yellow-700">
                                कोई रिकॉर्ड नहीं मिला। कृपया खोज या फ़िल्टर बदलें।
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
