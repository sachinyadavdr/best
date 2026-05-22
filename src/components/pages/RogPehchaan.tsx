import { useState, useRef, type ChangeEvent } from 'react';
import { Camera, Upload, Send, Leaf, AlertTriangle, CheckCircle, FlaskConical } from 'lucide-react';

interface DiseaseResult {
    rog: string;
    emoji: string;
    karan: string;
    ilaj: string[];
    davai: string[];
    bachav: string[];
}

const diseaseMap: DiseaseResult[] = [
    {
        rog: 'पत्ती झुलसा रोग (Leaf Blight)',
        emoji: '🍂',
        karan: 'यह फफूंद (Fungus) से होता है। ज्यादा नमी और बारिश में यह तेजी से फैलता है।',
        ilaj: [
            'प्रभावित पत्तियां तुरंत हटाएं',
            'खेत में पानी जमा न होने दें',
            'फफूंदनाशक दवा का छिड़काव करें',
        ],
        davai: ['Mancozeb 75% WP – 2.5 ग्राम/लीटर पानी', 'Carbendazim 50% WP – 1 ग्राम/लीटर पानी'],
        bachav: ['रोग-रोधी किस्में लगाएं', 'फसल चक्र अपनाएं', 'बीज उपचार करें'],
    },
    {
        rog: 'पीली पत्ती रोग (Yellow Leaf)',
        emoji: '🟡',
        karan: 'जिंक या नाइट्रोजन की कमी से पत्तियां पीली पड़ती हैं।',
        ilaj: [
            'जिंक सल्फेट का छिड़काव करें',
            'यूरिया की मात्रा बढ़ाएं',
            'मिट्टी की जांच कराएं',
        ],
        davai: ['Zinc Sulphate – 5 किलो/एकड़', 'Urea – 25 किलो/एकड़'],
        bachav: ['मिट्टी परीक्षण कराएं', 'संतुलित खाद डालें', 'समय पर सिंचाई करें'],
    },
];

const suggestionsOnText = (text: string): DiseaseResult => {
    if (
        text.includes('पीला') ||
        text.includes('पीली') ||
        text.includes('yellow') ||
        text.includes('zinc')
    ) {
        return diseaseMap[1];
    }
    return diseaseMap[0];
};

export default function RogPehchaan() {
    const [image, setImage] = useState<string | null>(null);
    const [problem, setProblem] = useState('');
    const [result, setResult] = useState<DiseaseResult | null>(null);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const analyze = () => {
        if (!image && !problem.trim()) {
            alert('कृपया फोटो लगाएं या समस्या लिखें');
            return;
        }
        setLoading(true);

        const formData = new FormData();
        formData.append('problem', problem);
        if (fileRef.current?.files?.[0]) {
            formData.append('image', fileRef.current.files[0]);
        }

        fetch('http://localhost:4000/api/disease', {
            method: 'POST',
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                if (data?.diagnosis) {
                    setResult(data.diagnosis);
                } else {
                    setResult(suggestionsOnText(problem));
                }
            })
            .catch(() => {
                setResult(suggestionsOnText(problem));
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div
                className="bg-green-700 px-4 pt-10 pb-5"
                style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)' }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <FlaskConical size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold">रोग पहचान</h1>
                        <p className="text-green-200 text-xs">फसल की बीमारी पहचानें और इलाज पाएं</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-3">
                <div className="bg-white rounded-2xl shadow-sm p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">फसल की फोटो लगाएं:</p>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileRef}
                        onChange={handleImage}
                        className="hidden"
                    />
                    {image ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-green-200">
                            <img src={image} alt="fasal" className="w-full object-cover max-h-52" />
                            <button
                                onClick={() => setImage(null)}
                                className="absolute top-2 right-2 bg-red-500 text-white text-xs px-3 py-1 rounded-full"
                            >
                                हटाएं
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-2 bg-green-50 border-2 border-dashed border-green-300 rounded-2xl py-6 active:bg-green-100 transition-all"
                            >
                                <Camera size={28} className="text-green-600" />
                                <span className="text-sm font-semibold text-green-700">फोटो खींचो</span>
                            </button>
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-2 bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl py-6 active:bg-blue-100 transition-all"
                            >
                                <Upload size={28} className="text-blue-600" />
                                <span className="text-sm font-semibold text-blue-700">गैलरी से लो</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        अपनी समस्या लिखो:
                    </label>
                    <textarea
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        placeholder="जैसे: मेरे गेहूं की पत्तियां पीली हो रही हैं और सूख रही हैं..."
                        rows={4}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none resize-none"
                    />
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {['पत्ती पीली है', 'पत्ती सूख रही है', 'दाग पड़ रहे हैं', 'कीड़े लग रहे हैं'].map((q) => (
                            <button
                                key={q}
                                onClick={() => setProblem((p) => p ? p + ', ' + q : q)}
                                className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full active:bg-green-100"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={analyze}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-green-700 disabled:bg-green-400 text-white font-bold py-5 rounded-2xl shadow-lg active:bg-green-800 transition-all text-lg"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            जांच हो रही है...
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            रोग पहचानो और इलाज बताओ
                        </>
                    )}
                </button>

                {result && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl shadow-md p-4 border-2 border-orange-200">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={16} className="text-orange-500" />
                                <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">पहचाना गया रोग</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-3xl">{result.emoji}</span>
                                <p className="text-lg font-bold text-gray-800">{result.rog}</p>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{result.karan}</p>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle size={16} className="text-green-600" />
                                <span className="text-sm font-bold text-green-700">तुरंत करें यह काम:</span>
                            </div>
                            {result.ilaj.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2">
                                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <FlaskConical size={16} className="text-blue-600" />
                                <span className="text-sm font-bold text-blue-700">दवाई और खाद:</span>
                            </div>
                            {result.davai.map((d, i) => (
                                <div key={i} className="bg-blue-50 rounded-xl px-3 py-2 mb-2">
                                    <p className="text-sm text-blue-800 font-medium">{d}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Leaf size={16} className="text-emerald-600" />
                                <span className="text-sm font-bold text-emerald-700">भविष्य में बचाव:</span>
                            </div>
                            {result.bachav.map((b, i) => (
                                <div key={i} className="flex items-start gap-2 mb-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-600">{b}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-800">
                                    यह जानकारी सामान्य मार्गदर्शन के लिए है। गंभीर समस्या पर कृषि विशेषज्ञ से मिलें।
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
