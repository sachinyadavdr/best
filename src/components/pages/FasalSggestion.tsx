import { useState } from 'react';
import { Leaf, MapPin, Maximize, IndianRupee, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiUrl } from '../../api';

interface SuggestionResult {
    fasal: string;
    emoji: string;
    labh: string;
    jokhim: 'कम' | 'मध्यम' | 'ज्यादा';
    vivran: string;
    tips: string[];
}

const fasalData: Record<string, SuggestionResult[]> = {
    default: [
        {
            fasal: 'गेहूं',
            emoji: '🌾',
            labh: '₹45,000 – ₹60,000 / एकड़',
            jokhim: 'कम',
            vivran: 'रबी की सबसे अच्छी फसल। कम पानी और मेहनत में अच्छी उपज।',
            tips: ['अक्टूबर-नवंबर में बोएं', 'HD-2967 बीज अच्छा है', '3-4 सिंचाई काफी है'],
        },
        {
            fasal: 'सरसों',
            emoji: '🌻',
            labh: '₹35,000 – ₹50,000 / एकड़',
            jokhim: 'कम',
            vivran: 'कम लागत में अच्छा मुनाफा। तेल की मांग हमेशा ज्यादा।',
            tips: ['अक्टूबर में बोएं', '2-3 सिंचाई पर्याप्त', 'MSP पर बेच सकते हैं'],
        },
    ],
    vegetable: [
        {
            fasal: 'टमाटर',
            emoji: '🍅',
            labh: '₹80,000 – ₹1,50,000 / एकड़',
            jokhim: 'मध्यम',
            vivran: 'छोटे खेत में भी अच्छा मुनाफा। नजदीकी मंडी जरूरी।',
            tips: ['ड्रिप सिंचाई लगाएं', 'Hybrid बीज लें', 'मंडी से पहले बात करें'],
        },
        {
            fasal: 'आलू',
            emoji: '🥔',
            labh: '₹60,000 – ₹90,000 / एकड़',
            jokhim: 'मध्यम',
            vivran: 'ठंड में बेहतरीन फसल। स्टोरेज की सुविधा हो तो और अच्छा।',
            tips: ['अक्टूबर में बोएं', 'अच्छे बीजाण्ड लें', 'कोल्ड स्टोरेज का उपयोग करें'],
        },
    ],
    summer: [
        {
            fasal: 'मूंग',
            emoji: '🫘',
            labh: '₹30,000 – ₹45,000 / एकड़',
            jokhim: 'कम',
            vivran: 'कम समय में तैयार। जमीन की उर्वरता भी बढ़ाती है।',
            tips: ['गर्मी में मार्च-अप्रैल में बोएं', '60 दिन में तैयार', 'MSP मिलती है'],
        },
        {
            fasal: 'सूरजमुखी',
            emoji: '🌻',
            labh: '₹40,000 – ₹55,000 / एकड़',
            jokhim: 'कम',
            vivran: 'गर्मी में उगाई जाने वाली तिलहनी फसल।',
            tips: ['फरवरी-मार्च में बोएं', 'कम पानी चाहिए', 'बीज बाजार में अच्छे बिकते हैं'],
        },
    ],
};

function getSuggestion(location: string, _size: string, budget: string): SuggestionResult[] {
    const b = parseInt(budget.replace(/\D/g, '')) || 0;
    if (b < 10000) return fasalData.summer;
    if (location.toLowerCase().includes('सब्जी') || location.toLowerCase().includes('sabzi')) {
        return fasalData.vegetable;
    }
    return fasalData.default;
}

export default function FasalSuggestion() {
    const [location, setLocation] = useState('');
    const [size, setSize] = useState('');
    const [budget, setBudget] = useState('');
    const [results, setResults] = useState<SuggestionResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleSubmit = () => {
        if (!location || !size || !budget) {
            alert('कृपया सभी जानकारी भरें');
            return;
        }
        setLoading(true);
        setApiError('');

        fetch(apiUrl('/api/suggestion'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, budget }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data?.suggestion) {
                    setResults([data.suggestion]);
                } else {
                    setApiError('सर्वर से सुझाव नहीं मिला');
                    setResults(getSuggestion(location, size, budget));
                }
            })
            .catch(() => {
                setApiError('प्रस्ताव प्राप्त करने में समस्या हुई।');
                setResults(getSuggestion(location, size, budget));
            })
            .finally(() => setLoading(false));
    };

    const jokhimColor = (j: SuggestionResult['jokhim']) => {
        if (j === 'कम') return 'text-green-700 bg-green-100';
        if (j === 'मध्यम') return 'text-yellow-700 bg-yellow-100';
        return 'text-red-700 bg-red-100';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-green-700 px-4 pt-10 pb-5" style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <Leaf size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold">फसल सुझाव</h1>
                        <p className="text-green-200 text-xs">सबसे अच्छी फसल चुनें</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-3">
                <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                    <p className="text-sm font-semibold text-gray-700">अपनी जानकारी दर्ज करें:</p>

                    <div>
                        <label className="text-sm text-gray-600 font-medium flex items-center gap-1 mb-1">
                            <MapPin size={14} className="text-green-600" />
                            आपकी जगह / Location
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="जैसे: लखनऊ, उत्तर प्रदेश"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-600 font-medium flex items-center gap-1 mb-1">
                            <Maximize size={14} className="text-green-600" />
                            जमीन का आकार
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                                placeholder="जैसे: 2"
                                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none"
                            />
                            <select className="border-2 border-gray-200 rounded-xl px-3 py-3 text-base focus:border-green-500 focus:outline-none bg-white text-gray-700">
                                <option>बीघा</option>
                                <option>एकड़</option>
                                <option>हेक्टेयर</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-600 font-medium flex items-center gap-1 mb-1">
                            <IndianRupee size={14} className="text-green-600" />
                            कुल बजट (रुपये में)
                        </label>
                        <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            placeholder="जैसे: 25000"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-green-700 disabled:bg-green-400 text-white font-bold py-5 rounded-2xl shadow-lg active:bg-green-800 transition-all text-lg"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            सुझाव ढूंढ रहे हैं...
                        </>
                    ) : (
                        <>
                            <Leaf size={22} />
                            सबसे अच्छी फसल बताओ
                        </>
                    )}
                </button>

                {apiError && (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {apiError}
                    </div>
                )}

                {results && (
                    <div className="space-y-3">
                        <p className="text-base font-bold text-gray-800 px-1">आपके लिए सुझाव:</p>
                        {results.map((r, i) => (
                            <div key={r.fasal} className={`bg-white rounded-2xl shadow-md p-4 border-2 ${i === 0 ? 'border-green-300' : 'border-gray-100'}`}>
                                {i === 0 && (
                                    <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-3">
                                        <CheckCircle size={12} />
                                        सबसे अच्छी फसल
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl">{r.emoji}</span>
                                        <span className="text-xl font-bold text-gray-800">{r.fasal}</span>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${jokhimColor(r.jokhim)}`}>
                                        जोखिम: {r.jokhim}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{r.vivran}</p>
                                <div className="bg-green-50 rounded-xl p-3 mb-3 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-green-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">अनुमानित लाभ</p>
                                        <p className="text-sm font-bold text-green-700">{r.labh}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">जरूरी सुझाव:</p>
                                    {r.tips.map((tip, ti) => (
                                        <div key={ti} className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                                            <p className="text-xs text-gray-600">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-800">
                                    ये सुझाव सामान्य जानकारी पर आधारित हैं। अपने क्षेत्र के कृषि अधिकारी से भी सलाह लें।
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="h-4" />
            </div>
        </div>
    );
}
