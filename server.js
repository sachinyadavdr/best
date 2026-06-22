import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   MANDI DATA
========================= */
const mandiPrices = [
    { fasal: 'गेहूं', bhav: '₹2,275', badlav: '+15', unit: '/कुंतल' },
    { fasal: 'धान', bhav: '₹2,183', badlav: '+8', unit: '/कुंतल' },
    { fasal: 'मक्का', bhav: '₹1,950', badlav: '-10', unit: '/कुंतल' },
    { fasal: 'सरसों', bhav: '₹5,200', badlav: '+25', unit: '/कुंतल' },
    { fasal: 'सोयाबीन', bhav: '₹4,100', badlav: '+12', unit: '/कुंतल' },
];

/* =========================
   CITY COORDINATES
========================= */
const cityCoordinates = {
    delhi: { lat: '28.7041', lon: '77.1025' },
    mumbai: { lat: '19.0760', lon: '72.8777' },
    kolkata: { lat: '22.5726', lon: '88.3639' },
    chennai: { lat: '13.0827', lon: '80.2707' },
    bangalore: { lat: '12.9716', lon: '77.5946' },
    varanasi: { lat: '25.3200', lon: '82.9789' }
};

const DATA_GOV_API_KEY = process.env.MANDI_API_KEY || process.env.DATA_GOV_API_KEY;
const DATA_GOV_RESOURCE_ID = process.env.DATA_GOV_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070';
const AGMARKNET_API_URL = process.env.AGMARKNET_API_URL;
const AGMARKNET_API_KEY = process.env.AGMARKNET_API_KEY;
const port = parseInt(process.env.PORT || '5000', 10);
const INTERNAL_BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${port}`;

console.log('Smart Kisan backend starting...');
console.log('MANDI API key loaded:', DATA_GOV_API_KEY ? 'yes' : 'no');
console.log('AGMARKNET API configured:', AGMARKNET_API_URL ? 'yes' : 'no');
console.log('Mandi resource id:', DATA_GOV_RESOURCE_ID);
console.log('Backend URL:', INTERNAL_BACKEND_URL);

/* =========================
   ROUTES
========================= */

app.get('/api/mandi', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '16', 10), 50);

    const apiKeyPresent = Boolean(DATA_GOV_API_KEY || AGMARKNET_API_KEY || AGMARKNET_API_URL);
    const fallbackResponse = {
        source: 'fallback',
        lastUpdated: new Date().toISOString(),
        apiError: apiKeyPresent ? 'मंडी API अनुरोध विफल हुआ' : 'मंडी API कुंजी/URL अनुपलब्ध है',
        records: mandiPrices.map((item) => ({
            state: 'India',
            district: '',
            market: 'Local Mandi',
            commodity: item.fasal,
            arrival_date: new Date().toLocaleDateString('hi-IN'),
            min_price: parseInt(item.bhav.replace(/[^0-9]/g, '')) || 0,
            max_price: parseInt(item.bhav.replace(/[^0-9]/g, '')) || 0,
            modal_price: parseInt(item.bhav.replace(/[^0-9]/g, '')) || 0,
        })),
    };

    if (!apiKeyPresent) {
        return res.json(fallbackResponse);
    }

    try {
        let apiData;
        let sourceLabel = 'data.gov.in';

        // Use data.gov.in API directly (AGMARKNET is hosted there)
        const url = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE_ID}?api-key=${DATA_GOV_API_KEY}&format=json&limit=${limit}&sort=timestamp%20desc`;
        const apiResponse = await fetch(url);
        apiData = await apiResponse.json();
        if (!apiResponse.ok || !Array.isArray(apiData.records)) {
            throw new Error(`API returned status ${apiResponse.status}: ${JSON.stringify(apiData)}`);
        }
        sourceLabel = 'agmarknet';

        const mandiPricesFromApi = apiData.records.map((record) => ({
            commodity: record.commodity || record.commodity_name || 'Unknown',
            variety: record.variety || record.commodity_variety || '',
            market: record.market || record.market_type || record.market_name || 'Unknown Market',
            state: record.state || record.state_name || record.location || 'Unknown',
            min_price: record.min_price != null ? record.min_price : record.min_price_kg != null ? record.min_price_kg : record.modal_price != null ? record.modal_price : '0',
            max_price: record.max_price != null ? record.max_price : record.max_price_kg != null ? record.max_price_kg : record.modal_price != null ? record.modal_price : '0',
            modal_price: record.modal_price != null ? record.modal_price : record.modal_price_kg != null ? record.modal_price_kg : record.min_price != null ? record.min_price : '0',
            unit: record.unit || record.price_unit || '₹',
            last_updated: record.arrival_date || record.timestamp || record.date || apiData.last_updated || new Date().toISOString(),
            trend: record.price_change ? (String(record.price_change).trim().startsWith('-') ? 'down' : 'up') : 'flat',
        }));

        return res.json({
            source: sourceLabel,
            lastUpdated: new Date().toISOString(),
            apiError: '',
            records: mandiPricesFromApi,
        });
    } catch (error) {
        console.error('Mandi API failed:', error.message || error);
        fallbackResponse.apiError = String(error.message || 'Unknown error');
        return res.json(fallbackResponse);
    }
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'Smart Kisan backend running 🚀' });
});
app.get('/api/weather', async (req, res) => {
    try {
        const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
        const lat = req.query.lat || '26.34578';
        const lon = req.query.lon || '80.4507';

        if (!OPENWEATHER_API_KEY) {
            return res.status(400).json({ error: 'OpenWeather API key missing' });
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ error: data.message || 'Weather API failed' });
        }

        return res.json({
            location: data.name || 'Your Location',
            condition: data.weather?.[0]?.description || 'Unknown',
            temp: `${Math.round(data.main.temp)}°C`,
            max: `${Math.round(data.main.temp_max)}°C`,
            min: `${Math.round(data.main.temp_min)}°C`,
            humidity: `${data.main.humidity}%`,
            wind: `${data.wind.speed} m/s`
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
/* =========================
   FARMING KNOWLEDGE BASE
========================= */
const farmingKnowledgeBase = {
    'hi': {
        'कीट': 'फसलों में कीटों से बचाव के लिए:\n1. नीम का तेल छिड़कें\n2. ट्राइकोडर्मा का उपयोग करें\n3. जैव कीटनाशक लगाएं\n4. खेत को साफ रखें',
        'पानी': 'सिंचाई के सुझाव:\n1. गर्मी में 7-10 दिन का अंतराल\n2. सर्दी में 15-20 दिन का अंतराल\n3. बारिश में कम पानी दें\n4. जल निकास जरूरी है',
        'खाद': 'खाद के प्रयोग:\n1. गोबर की खाद 5-10 टन/हेक्टेयर\n2. नीम केक 500 किग्रा/हेक्टेयर\n3. यूरिया 100-150 किग्रा/हेक्टेयर\n4. जैविक खाद बेहतर है',
        'फसल': 'प्रमुख फसलें:\n- गेहूं (अक्टूबर-मार्च)\n- धान (जून-अक्टूबर)\n- मक्का (जून-सितंबर)\n- सोयाबीन (जुलाई-नवंबर)',
    },
    'en': {
        'pest': 'Pest management tips:\n1. Use neem oil spray\n2. Apply Trichoderma\n3. Use bio-pesticides\n4. Keep field clean and weed-free',
        'water': 'Irrigation guide:\n1. Summer: Every 7-10 days\n2. Winter: Every 15-20 days\n3. During rain: Reduce watering\n4. Proper drainage is essential',
        'fertilizer': 'Fertilizer usage:\n1. FYM: 5-10 tons/hectare\n2. Neem cake: 500 kg/hectare\n3. Urea: 100-150 kg/hectare\n4. Organic fertilizers are better',
        'crop': 'Major crops:\n- Wheat (Oct-March)\n- Rice (June-October)\n- Maize (June-September)\n- Soybean (July-November)',
    }
};

const knowledgeKeywords = {
    hi: [
        { keys: ['कीट', 'कीटों', 'कीटपतन', 'कीटों'], answer: farmingKnowledgeBase.hi['कीट'] },
        { keys: ['पानी', 'सिंचाई', 'जल'], answer: farmingKnowledgeBase.hi['पानी'] },
        { keys: ['खाद', 'उर्वरक', 'खाद्य'], answer: farmingKnowledgeBase.hi['खाद'] },
        { keys: ['फसल', 'कृषि', 'अन्न'], answer: farmingKnowledgeBase.hi['फसल'] },
    ],
    en: [
        { keys: ['pest', 'pests'], answer: farmingKnowledgeBase.en['pest'] },
        { keys: ['water', 'irrigation', 'rain', 'humidity'], answer: farmingKnowledgeBase.en['water'] },
        { keys: ['fertilizer', 'fertilizers', 'manure'], answer: farmingKnowledgeBase.en['fertilizer'] },
        { keys: ['crop', 'crops'], answer: farmingKnowledgeBase.en['crop'] },
    ],
};

const weatherKeywords = {
    hi: ['मौसम', 'बारिश', 'धूप', 'तापमान', 'आज का मौसम', 'बादल', 'आँधी', 'तूफान', 'आर्द्रता', 'हवा'],
    en: ['weather', 'wether', 'rain', 'sunny', 'cloudy', 'temperature', 'forecast', 'humidity', 'wind'],
};

function searchKnowledgeBase(message, language) {
    const lower = message.toLowerCase();
    const list = knowledgeKeywords[language] || knowledgeKeywords.en;

    for (let entry of list) {
        if (entry.keys.some((keyword) => lower.includes(keyword))) {
            return entry.answer;
        }
    }
    return null;
}

function isWeatherQuery(message, language) {
    const lower = message.toLowerCase();
    const list = [...weatherKeywords[language] || [], ...weatherKeywords.en];
    return list.some((keyword) => lower.includes(keyword));
}

function formatWeatherReply(weather, language) {
    if (language === 'hi') {
        return `आज ${weather.location} में मौसम ${weather.condition} है। तापमान ${weather.temp} है, अधिकतम ${weather.max}, न्यूनतम ${weather.min}, आर्द्रता ${weather.humidity} और हवा ${weather.wind} है।`;
    }
    return `Today in ${weather.location}, the weather is ${weather.condition}. Temperature is ${weather.temp}, with a high of ${weather.max} and a low of ${weather.min}. Humidity is ${weather.humidity} and wind is ${weather.wind}.`;
}

// Friendly greeting phrases (both Hindi and English)
const greetingPhrases = {
    hi: ['नमस्ते', 'नमस्कार', 'नमस्ते किसान', 'नमस्ते किसान भाई', 'नमस्ते भाई', 'नमस्ते बहनों', 'नमस्ते भई', 'नमस्ते भाईयों', 'हाय', 'हेलो'],
    en: ['hi', 'hii', 'hello', 'hey', 'hiya', 'good morning', 'good afternoon', 'good evening']
};

function isGreeting(message, language) {
    if (!message) return false;
    const text = message.trim().toLowerCase();
    const phrases = greetingPhrases[language] || greetingPhrases['en'];
    return phrases.some((p) => text === p || text.startsWith(p));
}

/* =========================
   CHATBOT API (openrout with Fallback)
========================= */
app.post('/api/chat', async (req, res) => {
    try {
        const { message, language = 'en' } = req.body;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!message || !message.trim()) {
            return res.status(400).json({
                reply: language === 'hi'
                    ? 'कृपया कोई संदेश भेजें।'
                    : 'Please send a message.'
            });
        }

        const detectedLanguage =
            /[\u0900-\u097F]/.test(message) ? 'hi' :
                /(?:kya|kaise|batao|barish|mausam|kisan|fasal|mandi|khad|pani|rog|keet|aaj|kal|bhav|beej|kheti)/i.test(message)
                    ? 'hinglish'
                    : 'en';

        if (isGreeting(message, language)) {
            const greetReply =
                detectedLanguage === 'hi'
                    ? 'नमस्ते किसान भाई! 😊 आप मौसम, बारिश, फसल, मंडी भाव, कीट, खाद, सिंचाई या खेती से जुड़ा कोई भी सवाल पूछ सकते हैं।'
                    : detectedLanguage === 'hinglish'
                        ? 'Namaste kisan bhai! 😊 Aap mausam, barish, fasal, mandi bhav, keet, khad, sinchai ya kheti se juda koi bhi sawal pooch sakte ho.'
                        : 'Hello farmer! 😊 Ask about weather, rain, crops, mandi prices, fertilizers, irrigation, or any farming topic.';

            return res.json({ reply: greetReply });
        }

        if (isWeatherQuery(message, language)) {
            try {
                const weatherResponse = await fetch(`${INTERNAL_BACKEND_URL}/api/weather`);
                const weatherData = await weatherResponse.json();

                if (detectedLanguage === 'hinglish') {
                    return res.json({
                        reply: `Aaj ${weatherData.location} me mausam ${weatherData.condition} hai. Temperature ${weatherData.temp}, maximum ${weatherData.max}, minimum ${weatherData.min}, humidity ${weatherData.humidity} aur hawa ${weatherData.wind} hai.`
                    });
                }

                return res.json({
                    reply: formatWeatherReply(weatherData, detectedLanguage === 'hi' ? 'hi' : 'en')
                });
            } catch (weatherError) {
                return res.json({
                    reply: detectedLanguage === 'hi'
                        ? 'मौसम जानकारी लाने में समस्या हो रही है। कृपया थोड़ी देर बाद फिर प्रयास करें।'
                        : detectedLanguage === 'hinglish'
                            ? 'Mausam ki jankari lane me problem ho rahi hai. Thodi der baad dobara try karo.'
                            : 'Unable to retrieve weather information right now. Please try again later.'
                });
            }
        }

        const kbAnswer = searchKnowledgeBase(message, language);
        if (kbAnswer) {
            return res.json({ reply: kbAnswer });
        }

        if (!OPENROUTER_API_KEY) {
            return res.json({
                reply: detectedLanguage === 'hi'
                    ? 'OPENROUTER API key उपलब्ध नहीं है, इसलिए मैं अभी पूरा AI जवाब नहीं दे पा रहा हूँ।'
                    : detectedLanguage === 'hinglish'
                        ? 'OPENROUTER API key available nahi hai, isliye main abhi full AI jawab nahi de pa raha hoon.'
                        : 'OPENROUTER API key is missing, so I cannot provide a full AI response right now.'
            });
        }

        const systemPrompt = `
You are Smart Kisan AI, a helpful assistant for Indian farmers.

You can answer questions about:
- weather and rain
- crops and farming
- mandi prices
- fertilizers and pesticides
- irrigation and water
- soil and seeds
- crop diseases
- government schemes
- animal farming
- organic farming
- farm tools and tractors
- general farmer problems

Language rule:
- If the user writes in Hindi, reply only in simple Hindi.
- If the user writes in English, reply only in simple English.
- If the user writes Hindi using English letters, reply in simple Hinglish like WhatsApp language.

Answer style:
- Keep answers simple and practical.
- Give farmer-friendly advice.
- Do not say "Please ask about pests, water, fertilizers, or crops."
`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Smart Kisan"
    },
    body: JSON.stringify({
    model: "deepseek/deepseek-chat-v3",
    response_format: { type: "json_object" },
    messages: [
        { role: "user", content: explainPrompt }
    ]
})
});

const rawText = await response.text();

let data;
try {
    data = JSON.parse(rawText);
} catch {
    console.error('PLANT ID RAW ERROR:', rawText);
    return res.status(500).json({
        error: rawText || 'Plant.id returned non-JSON response'
    });
}

console.log("PLANT ID RESPONSE:");
console.log(JSON.stringify(data, null, 2));
if (!response.ok) {
    console.error("OPENROUTER CHAT ERROR:", data);
    return res.json({ reply: 'AI response me problem aa rahi hai.' });
}

const reply = data.choices?.[0]?.message?.content || 'No reply received.';
return res.json({ reply });
    } catch (chatError) {
        console.error('Chat error:', chatError);
        return res.status(500).json({
            reply: 'An error occurred processing your request.'
        });
    }
});
app.post('/api/disease-detect', upload.single('image'), async (req, res) => {
    try {
       const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY;
const problem = req.body.problem || '';

if (!PLANT_ID_API_KEY) {
    return res.status(400).json({ error: 'Plant.id API key missing' });
}

if (!req.file) {
    return res.status(400).json({ error: 'Image required' });
}

const imageBase64 = req.file.buffer.toString('base64');

const response = await fetch('https://plant.id/api/v3/identification', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Api-Key': PLANT_ID_API_KEY
    },
    body: JSON.stringify({
        images: [imageBase64],
        health: 'all',
        classification_level: 'species'
    })
});

const rawText = await response.text();

let data;
try {
    data = JSON.parse(rawText);
} catch {
    console.error('PLANT ID RAW ERROR:', rawText);
    return res.status(500).json({
        error: rawText || 'Plant.id returned non-JSON response'
    });
}

console.log("PLANT ID RESPONSE:");
console.log(JSON.stringify(data, null, 2));

if (!response.ok) {
    console.error('PLANT ID ERROR:', data);
    return res.status(500).json({ error: data.message || 'Plant.id API failed' });
}

const disease =
    data.result?.disease?.suggestions?.[0] ||
    data.result?.classification?.suggestions?.[0] ||
    null;

console.log("DISEASE FOUND:", disease);

const isPlant =
    data.result?.is_plant?.binary === true ||
    data.result?.is_plant?.probability > 0.5;

if (!isPlant) {
    return res.json({
        result: {
            isCrop: false,
            message: 'यह फसल या पौधे की फोटो नहीं है। कृपया पत्ती/फसल की साफ फोटो अपलोड करें।'
        }
    });
}

const scientificName = disease?.name || 'Unknown';
const confidence = disease?.probability
    ? `${Math.round(disease.probability * 100)}%`
    : 'N/A';

const explainPrompt = `
Plant disease/pest scientific name: ${scientificName}
Confidence: ${confidence}
Farmer problem: ${problem || 'No extra problem written'}

Hindi me farmer ke liye simple JSON do:
{
  "hindiName": "रोग/कीट का आसान हिंदी नाम",
  "scientificName": "${scientificName}",
  "confidence": "${confidence}",
  "cause": "यह क्या है और क्यों होता है",
  "symptoms": ["लक्षण 1", "लक्षण 2", "लक्षण 3"],
  "damage": "अगर समय पर इलाज न करें तो क्या नुकसान हो सकता है",
  "treatment": ["तुरंत उपाय 1", "तुरंत उपाय 2", "तुरंत उपाय 3"],
  "medicine": ["दवा नाम + मात्रा", "दवा नाम + मात्रा"],
  "prevention": ["बचाव 1", "बचाव 2", "बचाव 3"]
}
JSON ke alawa kuch mat likhna.
`;

const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Smart Kisan"
    },
    body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3",
        messages: [
            { role: "user", content: explainPrompt }
        ]
    })
});

const aiData = await aiResponse.json();
let aiText = aiData.choices?.[0]?.message?.content || '';

aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
console.log("AI RAW RESPONSE:");
console.log(aiText);
let aiParsed;
try {
    aiParsed = JSON.parse(aiText);
} catch {
    console.error("AI JSON PARSE ERROR:", aiText);
    aiParsed = null;
}

const result = {
    isCrop: true,
    diseaseName: aiParsed?.hindiName || scientificName,
    scientificName: scientificName,
    confidence: confidence,
    cause: aiParsed?.cause || 'फोटो के आधार पर पहचान की गई है।',
    damage: aiParsed?.damage || '',
    symptoms: aiParsed?.symptoms || [],
    treatment: aiParsed?.treatment || [
        'प्रभावित पत्तियां हटाएं',
        'खेत में पानी जमा न होने दें',
        'कृषि विशेषज्ञ से सलाह लें'
    ],
    medicine: aiParsed?.medicine || [
        'Mancozeb 75% WP',
        'Carbendazim 50% WP'
    ],
    prevention: aiParsed?.prevention || [
        'रोग-रोधी किस्में लगाएं',
        'फसल चक्र अपनाएं',
        'बीज उपचार करें'
    ]
};

return res.json({ result });
    } catch (error) {
        console.error('FULL DISEASE ERROR:', error);
        return res.status(500).json({
            error: error.message || 'Disease detection failed'
        });
    }
});
app.listen(port, () => {
    console.log(`Smart Kisan backend listening on port ${port}`);
});
