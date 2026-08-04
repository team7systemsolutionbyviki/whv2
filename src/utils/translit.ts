const consonantBase: { [key: string]: string } = {
  'ng': 'ங', 'nj': 'ஞ', 'nh': 'ன', 'zh': 'ழ', 'lh': 'ள', 'rr': 'ற', 'sh': 'ஷ', 'th': 'த', 'dh': 'த', 'ch': 'ச',
  'k': 'க', 'g': 'க', 'c': 'ச', 's': 'ச', 'j': 'ஜ', 't': 'ட', 'd': 'ட', 'n': 'ந', 'p': 'ப', 'b': 'ப',
  'm': 'ம', 'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ', 'z': 'ழ', 'L': 'ள', 'R': 'ற', 'N': 'ண', 'h': 'ஹ'
};

const standaloneVowel: { [key: string]: string } = {
  'aa': 'ஆ', 'ii': 'ஈ', 'uu': 'ஊ', 'ee': 'ஏ', 'ai': 'ஐ', 'oo': 'ஓ', 'au': 'ஔ', 'q': 'ஃ',
  'a': 'அ', 'i': 'இ', 'u': 'உ', 'e': 'எ', 'o': 'ஒ', 'A': 'ஆ', 'I': 'ஈ', 'U': 'ஊ', 'E': 'ஏ', 'O': 'ஓ'
};

const vowelSign: { [key: string]: string } = {
  'aa': 'ா', 'ii': 'ீ', 'uu': 'ூ', 'ee': 'ே', 'ai': 'ை', 'oo': 'ோ', 'au': 'ௌ',
  'a': '', 'i': 'ி', 'u': 'ு', 'e': 'ெ', 'o': 'ொ', 'A': 'ா', 'I': 'ீ', 'U': 'ூ', 'E': 'ே', 'O': 'ோ'
};

export const transliterateToTamil = (text: string): string => {
  let result = '';
  let i = 0;
  while (i < text.length) {
    let c2 = text.substr(i, 2).toLowerCase();
    let c1 = text.substr(i, 1).toLowerCase();
    
    let isConsonant = false;
    let base = '';
    let advCons = 0;

    if (consonantBase[c2]) {
      base = consonantBase[c2];
      advCons = 2;
      isConsonant = true;
    } else if (consonantBase[c1]) {
      base = consonantBase[c1];
      advCons = 1;
      isConsonant = true;
    }

    if (isConsonant) {
      let nextIdx = i + advCons;
      let v2 = text.substr(nextIdx, 2).toLowerCase();
      let v1 = text.substr(nextIdx, 1).toLowerCase();

      if (vowelSign[v2] !== undefined) {
        result += base + vowelSign[v2];
        i += advCons + 2;
      } else if (vowelSign[v1] !== undefined) {
        result += base + vowelSign[v1];
        i += advCons + 1;
      } else {
        result += base + '்';
        i += advCons;
      }
    } else {
      let v2 = text.substr(i, 2).toLowerCase();
      let v1 = text.substr(i, 1).toLowerCase();

      if (standaloneVowel[v2]) {
        result += standaloneVowel[v2];
        i += 2;
      } else if (standaloneVowel[v1]) {
        result += standaloneVowel[v1];
        i += 1;
      } else {
        result += text[i];
        i += 1;
      }
    }
  }
  return result;
};

// Words, codes, and billing terms that should be strictly preserved in English
const preservedWords = new Set([
  // Units
  'kg', 'gm', 'g', 'ml', 'ltr', 'pcs', 'box', 'bag', 'bags', 'ton', 'no', 'nos', 'pkt', 'pkts', 'pack', 'packs', 'units', 'unit', 'boxes', 'set', 'sets', 'pair', 'pairs', 'feet', 'ft', 'inch', 'inches', 'meter', 'm', 'cm', 'mm', 'yard', 'yards', 'doz', 'dozen', 'dozens', 'liter', 'liters', 'litres', 'litre', 'gram', 'grams', 'kilo', 'kilos', 'kilogram', 'kilograms', 'piece', 'pieces',
  // Billing / Invoice / Tax
  'inv', 'invoice', 'gst', 'gstin', 'sku', 'id', 'num', 'code', 'serial', 'sn', 'ref', 'bill', 'po', 'challan', 'receipt', 'hsn', 'sac', 'tax', 'cgst', 'sgst', 'igst', 'cess', 'pan', 'aadhaar',
  // Financial / Payment
  'cash', 'card', 'upi', 'gpay', 'phonepe', 'paytm', 'net', 'total', 'discount', 'dis', 'qty', 'rate', 'price', 'amt', 'amount', 'date', 'time', 'due', 'balance', 'paid', 'payment', 'pay', 'credit', 'debit', 'bank', 'cheque', 'online', 'trans',
  // Technical / Electronics / Specs
  'led', 'lcd', 'usb', 'hdmi', 'ac', 'tv', 'vga', 'ram', 'rom', 'gb', 'tb', 'mb', 'kb', 'cpu', 'gpu', 'pc', 'wifi', 'sim', 'dvd', 'cd', 'fm', 'am', 'dc', 'ah', 'v', 'w', 'hz', 'khz', 'mhz', 'ghz', 'hp', 'watt', 'volt', 'amp', 'ampere', 'battery', 'power', 'model', 'spec', 'specs', 'version', 'ver', 'sys',
  // Company Suffixes
  'co', 'ltd', 'pvt', 'corp', 'inc',
  // Common short English grammar words
  'to', 'from', 'in', 'out', 'and', 'or', 'for', 'by', 'with', 'at', 'on', 'of', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'as'
]);

const wordOverrides: { [key: string]: string } = {
  // Multi-word phrase overrides (processed first, case-insensitive)
  'pollachi main road': 'பொள்ளாச்சி மெயின் ரோடு',
  'thengai ennai': 'தேங்காய் எண்ணெய்',
  'nalaiku delivery': 'நாளைக்கு டெலிவரி',
  'ladys finger': 'வெண்டைக்காய்',
  'curry leaves': 'கறிவேப்பிலை',

  // Customer Names
  'murugan': 'முருகன்',
  'muruga': 'முருகா',
  'karthik': 'கார்த்திக்',
  'karthi': 'கார்த்தி',
  'velan': 'வேலன்',
  'senthil': 'செந்தில்',
  'kumar': 'குமார்',
  'selvam': 'செல்வம்',
  'raja': 'ராஜா',
  'ramesh': 'ரமேஷ்',
  'suresh': 'சுரேஷ்',
  'ganesh': 'கணேஷ்',
  'mani': 'மணி',
  'shankar': 'சங்கர்',
  'saravanan': 'சரவணன்',
  'annadurai': 'அண்ணாதுரை',
  'arumugam': 'ஆறுமுகம்',
  'palani': 'பழனி',
  'lakshmi': 'லக்ஷ்மி',
  'meena': 'மீனா',
  'devi': 'தேவி',
  'radha': 'ராதா',
  'chitra': 'சித்ரா',
  'kala': 'கலா',
  'anitha': 'அனிதா',
  'priya': 'பிரியா',
  'viki': 'விக்கி',
  'vignesh': 'விக்னேஷ்',
  'srinivasan': 'சீனிவாசன்',
  'krishnan': 'கிருஷ்ணன்',
  'balaji': 'பாலாஜி',
  'subramani': 'சுப்பிரமணி',
  'ram': 'ராம்',
  'siva': 'சிவா',
  'shiva': 'சிவா',
  'mari': 'மாரி',

  // Address Components
  'pollachi': 'பொள்ளாச்சி',
  'main': 'மெயின்',
  'road': 'ரோடு',
  'street': 'தெரு',
  'theru': 'தெரு',
  'nagar': 'நகர்',
  'puram': 'புரம்',
  'colony': 'காலனி',
  'layout': 'லேஅவுட்',
  'coimbatore': 'கோயம்புத்தூர்',
  'kovai': 'கோவை',
  'chennai': 'சென்னை',
  'madurai': 'மதுரை',
  'trichy': 'திருச்சி',
  'salem': 'சேலம்',
  'tirupur': 'திருப்பூர்',
  'erode': 'ஈரோடு',
  'karur': 'கரூர்',
  'dindigul': 'திண்டுக்கல்',
  'tanjore': 'தஞ்சாவூர்',
  'vellore': 'வேலூர்',
  'tirunelveli': 'திருநெல்வேலி',
  'tuticorin': 'தூத்துக்குடி',
  'kanyakumari': 'கன்னியாகுமரி',
  'nagercoil': 'நாகர்கோவில்',
  'ooty': 'ஊட்டி',
  'hosur': 'ஓசூர்',
  'cross': 'கிராஸ்',
  'corner': 'கார்னர்',
  'shop': 'கடை',
  'market': 'மார்க்கெட்',
  'office': 'அலுவலகம்',
  'home': 'வீடு',
  'house': 'வீடு',
  'flat': 'பிளாட்',
  'floor': 'தரை',

  // Products & Commodities
  'tomato': 'தக்காளி',
  'tomatoes': 'தக்காளி',
  'thakkali': 'தக்காளி',
  'thakkaali': 'தக்காளி',
  'onion': 'வெங்காயம்',
  'onions': 'வெங்காயம்',
  'vengayam': 'வெங்காயம்',
  'vengaayam': 'வெங்காயம்',
  'potato': 'உருளைக்கிழங்கு',
  'potatoes': 'உருளைக்கிழங்கு',
  'urulaikilangu': 'உருளைக்கிழங்கு',
  'urulaikkilangu': 'உருளைக்கிழங்கு',
  'chilli': 'மிளகாய்',
  'chilly': 'மிளகாய்',
  'chillies': 'மிளகாய்',
  'milagai': 'மிளகாய்',
  'milagaai': 'மிளகாய்',
  'milagay': 'மிளகாய்',
  'ginger': 'இஞ்சி',
  'inji': 'இஞ்சி',
  'garlic': 'பூண்டு',
  'poondu': 'பூண்டு',
  'lemon': 'எலுமிச்சை',
  'lemons': 'எலுமிச்சை',
  'elumichai': 'எலுமிச்சை',
  'elumiccai': 'எலுமிச்சை',
  'coconut': 'தேங்காய்',
  'coconuts': 'தேங்காய்',
  'thengai': 'தேங்காய்',
  'theengaai': 'தேங்காய்',
  'ennai': 'எண்ணெய்',
  'yennaai': 'எண்ணெய்',
  'yennai': 'எண்ணெய்',
  'oil': 'எண்ணெய்',
  'banana': 'வாழைப்பழம்',
  'bananas': 'வாழைப்பழம்',
  'valapalam': 'வாழைப்பழம்',
  'vaalaipalam': 'வாழைப்பழம்',
  'apple': 'ஆப்பிள்',
  'apples': 'ஆப்பிள்',
  'carrot': 'கேரட்',
  'carrots': 'கேரட்',
  'beans': 'பீன்ஸ்',
  'cabbage': 'முட்டைக்கோஸ்',
  'muttaikose': 'முட்டைக்கோஸ்',
  'brinjal': 'கத்தரிக்காய்',
  'kathirikai': 'கத்தரிக்காய்',
  'kathirikkaai': 'கத்தரிக்காய்',
  'drumstick': 'முருங்கைக்காய்',
  'murungaikai': 'முருங்கைக்காய்',
  'murungaikkaai': 'முருங்கைக்காய்',
  'vendakkai': 'வெண்டைக்காய்',
  'vendakkaai': 'வெண்டைக்காய்',
  'beetroot': 'பீட்ரூட்',
  'radish': 'முள்ளங்கி',
  'mullangi': 'முள்ளங்கி',
  'spinach': 'கீரை',
  'keerai': 'கீரை',
  'coriander': 'கொத்தமல்லி',
  'kothamalli': 'கொத்தமல்லி',
  'mint': 'புதினா',
  'pudhina': 'புதினா',
  'rice': 'அரிசி',
  'arisi': 'அரிசி',
  'dhal': 'பருப்பு',
  'paruppu': 'பருப்பு',
  'dal': 'பருப்பு',
  'sugar': 'சர்க்கரை',
  'sakkarai': 'சர்க்கரை',
  'salt': 'உப்பு',
  'uppu': 'உப்பு',
  'milk': 'பால்',
  'paal': 'பால்',
  'tea': 'தேநீர்',
  'coffee': 'காபி',
  'kaabi': 'காபி',
  'water': 'தண்ணீர்',
  'thanneer': 'தண்ணீர்',
  'nei': 'நெய்',
  'ghee': 'நெய்',
  'wheat': 'கோதுமை',
  'godhumai': 'கோதுமை',
  'flour': 'மாவு',
  'maavu': 'மாவு',
  'maida': 'மைதா',
  'rava': 'ரவை',
  'elakkai': 'ஏலக்காய்',
  'cardamom': 'ஏலக்காய்',
  'pepper': 'மிளகு',
  'milagu': 'மிளகு',
  'jeeragam': 'சீரகம்',
  'cumin': 'சீரகம்',
  'kadugu': 'கடுகு',
  'mustard': 'கடுகு',
  'manjal': 'மஞ்சள்',
  'turmeric': 'மஞ்சள்',
  'perungayam': 'பெருங்காயம்',
  'asafoetida': 'பெருங்காயம்',
  'kadalai': 'கடலை',
  'groundnut': 'நிலக்கடலை',
  'peanut': 'வேர்க்கடலை',
  'cashew': 'முந்திரி',
  'munthiri': 'முந்திரி',
  'badam': 'பாதாம்',
  'almond': 'பாதாம்',
  'pista': 'பிஸ்தா',
  'dates': 'பேரிச்சம்பழம்',
  'perichampalam': 'பேரிச்சம்பழம்',
  'grape': 'திராட்சை',
  'grapes': 'திராட்சை',
  'thiratsai': 'திராட்சை',
  'orange': 'ஆரஞ்சு',
  'mango': 'மாம்பழம்',
  'mampalam': 'மாம்பழம்',
  'papaya': 'பப்பாளி',
  'pappali': 'பப்பாளி',
  'guava': 'கொய்யா',
  'koyya': 'கொய்யா',
  'jackfruit': 'பலாப்பழம்',
  'palapalam': 'பலாப்பழம்',
  'pineapple': 'அன்னாசி',
  'annasi': 'அன்னாசி',
  'pomegranate': 'மாதுளை',
  'madhulai': 'மாதுளை',
  'watermelon': 'தர்பூசணி',
  'tharpoosani': 'தர்பூசணி',

  // Remarks, Notes & Verbs
  'nalaiku': 'நாளைக்கு',
  'naalaiku': 'நாளைக்கு',
  'naalai': 'நாளை',
  'inru': 'இன்று',
  'inniku': 'இன்னைக்கு',
  'nethu': 'நேத்து',
  'netru': 'நேற்று',
  'delivery': 'டெலிவரி',
  'delivered': 'டெலிவரி செய்யப்பட்டது',
  'pending': 'நிலுவை',
  'paid': 'செலுத்தப்பட்டது',
  'received': 'பெறப்பட்டது',
  'sent': 'அனுப்பப்பட்டது',
  'gave': 'கொடுத்தது',
  'kuduthen': 'கொடுத்தேன்',
  'kuduthathu': 'கொடுத்தது',
  'vanganen': 'வாங்கினேன்',
  'vangiyathu': 'வாங்கியது',
  'balance': 'மீதி',
  'meethi': 'மீதி',
  'credit': 'வரவு',
  'varavu': 'வரவு',
  'debit': 'பற்று',
  'patru': 'பற்று',
  'discount': 'தள்ளுபடி',
  'thallubadi': 'தள்ளுபடி',
  'free': 'இலவசம்',
  'ilavasam': 'இலவசம்',
  'return': 'ரிட்டர்ன்',
  'damage': 'சேதம்',
  'cheque': 'காசோலை',
  'bank': 'வங்கி',
  'rent': 'வாடகை',
  'vadagai': 'வாடகை',
  'salary': 'சம்பளம்',
  'sambalam': 'சம்பளம்',
  'coolie': 'கூலி',
  'loading': 'லோடிங்',
  'unloading': 'அன்லோடிங்',
  'transport': 'வண்டி வாடகை',
  'vandi': 'வண்டி',
  'vaadagai': 'வாடகை',
  'commission': 'கம்மிஷன்',
  'goods': 'சரக்கு',
  'sarakku': 'சரக்கு',
  'weight': 'எடை',
  'edai': 'எடை',
  'rate': 'விலை',
  'vilai': 'விலை',
  'price': 'விலை',
  'motham': 'மொத்தம்',
  'kootu': 'கூட்டு',
  'bill': 'பில்',
  'baki': 'பாக்கி',
  'baaki': 'பாக்கி'
};

const shouldPreserve = (word: string): boolean => {
  // If it doesn't contain any English letters, there's nothing to transliterate.
  if (!/[a-zA-Z]/.test(word)) {
    return true;
  }

  // If it contains any digit, preserve it (e.g. 2kg, INV-2026-001)
  if (/\d/.test(word)) {
    return true;
  }

  const lowerWord = word.toLowerCase();

  // If it's a known billing unit, code, or technical term, preserve it
  if (preservedWords.has(lowerWord)) {
    return true;
  }

  // If it contains special characters (like hyphens, underscores, slashes, etc.)
  if (/[^a-zA-Z\u0B80-\u0BFF]/.test(word)) {
    return true;
  }

  return false;
};

const processToken = (token: string): string => {
  // Split token into leading punctuation, core word, and trailing punctuation
  const match = token.match(/^([.,!?;:()"'`\[\]{}“’‘”]*)(.*?)([.,!?;:()"'`\[\]{}“’‘”]*)$/);
  if (!match) return token;
  
  const leadingPunct = match[1];
  const coreWord = match[2];
  const trailingPunct = match[3];

  if (!coreWord) return token;

  if (shouldPreserve(coreWord)) {
    return token;
  }

  const lowerWord = coreWord.toLowerCase();
  let translated = '';

  if (wordOverrides[lowerWord]) {
    translated = wordOverrides[lowerWord];
  } else {
    translated = transliterateToTamil(coreWord);
  }

  return leadingPunct + translated + trailingPunct;
};

export const transliterateText = (text: string): string => {
  let processed = text;
  
  // 1. Apply multi-word overrides first (case-insensitive)
  const multiWordKeys = Object.keys(wordOverrides).filter(k => k.includes(' '));
  multiWordKeys.sort((a, b) => b.length - a.length);
  
  for (const key of multiWordKeys) {
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
    processed = processed.replace(regex, wordOverrides[key]);
  }
  
  // 2. Split by whitespace and process each token
  const tokens = processed.split(/(\s+)/);
  const result = tokens.map(token => {
    if (/^\s*$/.test(token)) {
      return token; // return whitespace unmodified
    }
    return processToken(token);
  });
  
  return result.join('');
};

export const getTamilDay = (dateInput?: string | Date | number): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const tamilDays = [
    'ஞாயிற்றுக்கிழமை', // Sunday (0)
    'திங்கட்கிழமை',   // Monday (1)
    'செவ்வாய்க்கிழமை', // Tuesday (2)
    'புதன்கிழமை',     // Wednesday (3)
    'வியாழக்கிழமை',   // Thursday (4)
    'வெள்ளிக்கிழமை',   // Friday (5)
    'சனிக்கிழமை'      // Saturday (6)
  ];
  return tamilDays[d.getDay()];
};

