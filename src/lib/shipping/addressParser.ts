/**
 * addressParser.ts — Intelligent, typo-tolerant Bengali & English location parser.
 *
 * Guarantees ZERO MISMATCH between District and Division by binding every detected
 * district strictly to its official parent division.
 *
 * Automatically handles:
 *  - English & Bengali spelling mistakes / typos (e.g. "paban", "পাবন", "বগুরা", "জশোর", "ককসবাজার", "ctg", "narayangonj")
 *  - Phonetic variations (e.g. ড়/ড়/র, ী/ি, ূ/ু, ণ/ন, শ/ষ/স, য/জ, nukta, chandrabindu)
 *  - Sub-area Dhaka detection (Savar, Ashulia, Keraniganj, Gazipur, Tongi, Narayanganj, Dhamrai -> ৳100)
 *  - Inside Dhaka Core detection (Mirpur, Uttara, Dhanmondi, Gulshan, Dhaka etc. -> ৳80)
 *  - Outside Dhaka 62 districts (Pabna, Bogura, Sylhet, Chattogram etc. -> ৳150)
 */

import {
  BANGLADESH_DISTRICTS,
  BANGLADESH_DIVISIONS,
  BangladeshDistrict,
  BangladeshDivision,
} from './bangladeshLocations';

export interface ParsedLocation {
  district: BangladeshDistrict | null;
  division: BangladeshDivision | null;
  districtNameEn: string;
  districtNameBn: string;
  divisionNameEn: string;
  divisionNameBn: string;
  tier: 'dhaka_core' | 'dhaka_subarea' | 'outside_dhaka';
  rate: number;
  matchedName: string;
  badgeLabelBn: string;
  badgeLabelEn: string;
  isRecognized: boolean;
}

/** Standard Levenshtein distance algorithm */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

/** Normalizes English text for matching */
export function cleanEnglish(s: string): string {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Phonetically normalizes Bengali text to neutralize common spelling mistakes:
 * - Unifies Unicode forms
 * - Strips nukta (U+09BC) and zero-width spaces
 * - Normalizes ড়, ঢ় to র
 * - Normalizes ী to ি, ূ to ু
 * - Normalizes ণ to ন
 * - Normalizes শ, ষ to স
 * - Normalizes য to জ
 * - Normalizes ক্ষ to কস
 * - Strips chandrabindu (ঁ)
 */
export function normalizeBengali(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u09BC/g, '') // remove nukta
    .replace(/ক্ষ/g, 'কস')
    .replace(/[ড়ঢ়]/g, 'র')
    .replace(/ী/g, 'ি')
    .replace(/ূ/g, 'ু')
    .replace(/ণ/g, 'ন')
    .replace(/[শষ]/g, 'স')
    .replace(/য/g, 'জ')
    .replace(/ঁ/g, '')
    .trim();
}

/**
 * Known Dhaka Sub-Areas with comprehensive English & Bengali variants & typos.
 * Deliveries to these locations are charged ৳100.
 */
interface SubAreaDefinition {
  id: string;
  nameEn: string;
  nameBn: string;
  districtId: 'dhaka' | 'gazipur' | 'narayanganj';
  aliases: string[];
}

const DHAKA_SUB_AREAS: SubAreaDefinition[] = [
  {
    id: 'savar',
    nameEn: 'Savar',
    nameBn: 'সাভার',
    districtId: 'dhaka',
    aliases: ['savar', 'sawar', 'sabor', 'shavar', 'সাভার', 'সাভার বাজার', 'ছাবার', 'ছاوار', 'savar cantonment'],
  },
  {
    id: 'ashulia',
    nameEn: 'Ashulia',
    nameBn: 'আশুলিয়া',
    districtId: 'dhaka',
    aliases: ['ashulia', 'asulia', 'ashuleya', 'আশুলিয়া', 'আশুলিয়া', 'নবীনগর', 'nabinagar', 'বাইপাইল', 'baipail', 'jirabo', 'জিরাবো', 'জিরানি', 'zirani', 'epz'],
  },
  {
    id: 'keraniganj',
    nameEn: 'Keraniganj',
    nameBn: 'কেরানীগঞ্জ',
    districtId: 'dhaka',
    aliases: ['keraniganj', 'keranigonj', 'keranigunj', 'কেরানীগঞ্জ', 'কেরানিগঞ্জ', 'জিনজিরা', 'jinjira', 'বসুন্ধরা রিভারভিউ'],
  },
  {
    id: 'gazipur',
    nameEn: 'Gazipur',
    nameBn: 'গাজীপুর',
    districtId: 'gazipur',
    aliases: ['gazipur', 'gazepur', 'gazeepur', 'গাজীপুর', 'গাজিপুর', 'গাজিপুড়', 'জয়দেবপুর', 'জয়দেবপুর', 'joydebpur', 'board bazar', 'বোর্ড বাজার', 'chandra', 'চন্দ্রা', 'konabari', 'কোনাবাড়ী', 'কোনাবাড়ী'],
  },
  {
    id: 'narayanganj',
    nameEn: 'Narayanganj',
    nameBn: 'নারায়ণগঞ্জ',
    districtId: 'narayanganj',
    aliases: ['narayanganj', 'narayangonj', 'narayongonj', 'নারায়ণগঞ্জ', 'নারায়ণগঞ্জ', 'নারায়নগঞ্জ', 'নারায়নগন্জ', 'fatullah', 'ফতুল্লা', 'siddhirganj', 'সিদ্ধিরগঞ্জ', 'kachpur', 'কাঁচপুর', 'sonargaon', 'সোনারগাঁও', 'সোনারগাও'],
  },
  {
    id: 'tongi',
    nameEn: 'Tongi',
    nameBn: 'টঙ্গী',
    districtId: 'gazipur',
    aliases: ['tongi', 'tungi', 'tongy', 'টঙ্গী', 'টঙ্গি', 'cherag ali', 'চেরাগ আলী', 'চেরাগ আলি'],
  },
  {
    id: 'dhamrai',
    nameEn: 'Dhamrai',
    nameBn: 'ধামরাই',
    districtId: 'dhaka',
    aliases: ['dhamrai', 'damrai', 'ধামরাই', 'ধামরাঈ'],
  },
  {
    id: 'hemayetpur',
    nameEn: 'Hemayetpur',
    nameBn: 'হেমায়েতপুর',
    districtId: 'dhaka',
    aliases: ['hemayetpur', 'hemayet pore', 'হেমায়েতপুর', 'হেমায়েতপুর', 'হেমায়েত পুর'],
  },
  {
    id: 'kaliakair',
    nameEn: 'Kaliakair',
    nameBn: 'কালিয়াকৈর',
    districtId: 'gazipur',
    aliases: ['kaliakair', 'কালিয়াকৈর', 'কালিয়াকৈর'],
  },
  {
    id: 'kapasia',
    nameEn: 'Kapasia',
    nameBn: 'কাপাসিয়া',
    districtId: 'gazipur',
    aliases: ['kapasia', 'কাপাসিয়া', 'কাপাসিয়া'],
  },
  {
    id: 'sreepur',
    nameEn: 'Sreepur',
    nameBn: 'শ্রীপুর',
    districtId: 'gazipur',
    aliases: ['sreepur', 'শ্রীপুর', 'মাওনা', 'mawna'],
  },
  {
    id: 'tarabo',
    nameEn: 'Tarabo',
    nameBn: 'তারাবো',
    districtId: 'narayanganj',
    aliases: ['tarabo', 'তারাবো'],
  },
  {
    id: 'araihazar',
    nameEn: 'Araihazar',
    nameBn: 'আড়াইহাজার',
    districtId: 'narayanganj',
    aliases: ['araihazar', 'আড়াইহাজার', 'আড়াইহাজার'],
  },
];

/**
 * Inside Dhaka Core Zones. Deliveries here are charged ৳80.
 */
const DHAKA_CORE_AREAS = [
  'mirpur', 'মিরপুর', 'meerpur',
  'dhanmondi', 'ধানমন্ডি', 'ধানমণ্ডি',
  'uttara', 'উত্তরা', 'utora',
  'gulshan', 'গুলশান',
  'banani', 'বনানী', 'বনানি',
  'mohammadpur', 'মোহাম্মদপুর', 'মহাম্মদপুর',
  'bashundhara', 'বসুন্ধরা',
  'badda', 'বাড্ডা',
  'rampura', 'রামপুরা',
  'khilgaon', 'খিলগাঁও', 'খিলগাও',
  'jatrabari', 'যাত্রাবাড়ী', 'যাত্রাবাড়ি', 'যাত্রাবাড়ী',
  'motijheel', 'মতিঝিল', 'motijhil',
  'old dhaka', 'পুরান ঢাকা', 'পুরানো ঢাকা', 'puran dhaka',
  'malibagh', 'মালিবাগ',
  'moghbazar', 'মগবাজার',
  'tejgaon', 'তেজগাঁও', 'তেজগাও',
  'lalmatia', 'লালমাটিয়া', 'লালমাটিয়া',
  'shyamoli', 'শ্যামলী', 'শ্যামলি',
  'kalyanpur', 'কল্যাণপুর', 'কল্যানপুর',
  'nikunja', 'নিকুঞ্জ',
  'farmgate', 'ফার্মগেট',
  'shahbagh', 'শাহবাগ',
  'elephant road', 'এলিফ্যান্ট রোড',
  'bailey road', 'বেইলি রোড',
  'shantinagar', 'শান্তিনগর',
  'wari', 'ওয়ারী', 'ওয়ারী',
  'azimpur', 'আজিমপুর',
  'pallabi', 'পল্লবী',
  'cantonment', 'ক্যান্টনমেন্ট',
  'baridhara', 'বারিধারা',
  'banasree', 'বনশ্রী',
  'khilkhet', 'খিলক্ষেত',
  'agargaon', 'আগারগাঁও', 'আগারগাও',
  'kafrul', 'কাফরুল',
  'hazaribagh', 'হাজারীবাগ', 'হাজারিবাগ',
  'kamrangirchar', 'কামরাঙ্গীরচর', 'কামরাঙ্গিরচর',
  'dhaka', 'dacca', 'ঢাকা', 'dhaka city', 'ঢাকা সিটি', 'dhaka sadar',
];

/**
 * Comprehensive mapping of known district aliases & misspellings.
 */
const DISTRICT_ALIASES: Record<string, string[]> = {
  pabna: ['pabna', 'paban', 'pabnah', 'পাবনা', 'পাবন', 'পাবনা সদর', 'ishwardi', 'ঈশ্বরদী', 'ঈশ্বরদি'],
  bogura: ['bogura', 'bogra', 'bogurah', 'bograh', 'বগুড়া', 'বগুড়া', 'বগুরা', 'বগুড়া সদর'],
  chattogram: ['chattogram', 'chittagong', 'ctg', 'chotogram', 'chittagang', 'চট্টগ্রাম', 'চট্টগ্রম', 'চট্রগ্রাম', 'চিটাগাং', 'চিটাগং'],
  'coxs-bazar': ["cox's bazar", 'coxs bazar', 'coxsbazar', 'coxbazar', 'koxbazar', 'কক্সবাজার', 'ককসবাজার', 'কক্স বাজার'],
  cumilla: ['cumilla', 'comilla', 'kumilla', 'কুমিল্লা', 'কুমিল্লাহ', 'কুমিল্যা'],
  feni: ['feni', 'fany', 'ফেনী', 'ফেনি'],
  brahmanbaria: ['brahmanbaria', 'b.baria', 'b-baria', 'bbaria', 'bramonbaria', 'ব্রাহ্মণবাড়িয়া', 'ব্রাহ্মণবাড়িয়া', 'ব্রাহ্মনবাড়িয়া', 'ব্রাহ্মনবাড়িয়া', 'ব-বাড়িয়া', 'ব-বাড়িয়া', 'ব্রাক্ষণবাড়িয়া'],
  chandpur: ['chandpur', 'চাঁদপুর', 'চাদপুর'],
  noakhali: ['noakhali', 'নোয়াখালী', 'নোয়াখালী', 'নোয়াখali', 'নোয়াখালি', 'মাইজদী', 'maijdee', 'maijdi'],
  lakshmipur: ['lakshmipur', 'laxmipur', 'লক্ষ্মীপুর', 'লক্ষ্মিপুর', 'লক্ষিপুর'],
  bandarban: ['bandarban', 'বান্দরবান'],
  khagrachhari: ['khagrachhari', 'khagrachari', 'খাগড়াছড়ি', 'খাগড়াছড়ি', 'খাগরাছরি'],
  rangamati: ['rangamati', 'রাঙ্গামাটি', 'রাঙামাটি'],
  rajshahi: ['rajshahi', 'rajshai', 'rajsahi', 'রাজশাহী', 'রাজশাহি', 'রাজসাহী'],
  sirajganj: ['sirajganj', 'sirajgonj', 'সিরাজগঞ্জ', 'সিরাজগন্জ'],
  naogaon: ['naogaon', 'nogaon', 'নওগাঁ', 'নওগা', 'নওগাঁহ'],
  natore: ['natore', 'নাটোর', 'নাটোর সদর'],
  chapainawabganj: ['chapainawabganj', 'chapai', 'nawabganj', 'চাঁপাইনবাবগঞ্জ', 'চাপাইনবাবগঞ্জ', 'চাপাই'],
  joypurhat: ['joypurhat', 'জয়পুরহাট', 'জয়পুরহাট'],
  khulna: ['khulna', 'kulna', 'খুলনা'],
  bagerhat: ['bagerhat', 'বাগেরহাট', 'বাগের হাট'],
  chuadanga: ['chuadanga', 'চুয়াডাঙ্গা', 'চুয়াডাঙ্গা', 'চুয়াডাংগা'],
  jashore: ['jashore', 'jessore', 'jashor', 'যশোর', 'জশোর'],
  jhenaidah: ['jhenaidah', 'jhenaidaha', 'ঝিনাইদহ', 'ঝিনাইদাহ'],
  kushtia: ['kushtia', 'kustia', 'কুষ্টিয়া', 'কুষ্টিয়া', 'কুষ্টিয়া সদর'],
  magura: ['magura', 'মাগুরা', 'মাগুড়া'],
  meherpur: ['meherpur', 'মেহেরপুর'],
  narail: ['narail', 'নড়াইল', 'নড়াইল', 'নরাইল'],
  satkhira: ['satkhira', 'সাতক্ষীরা', 'সাতক্ষিরা'],
  barishal: ['barishal', 'barisal', 'বরিশাল', 'বরিসাল'],
  barguna: ['barguna', 'বরগুনা'],
  bhola: ['bhola', 'ভোলা'],
  jhalokathi: ['jhalokathi', 'jhalakati', 'ঝালকাঠি', 'ঝালকাঠী'],
  patuakhali: ['patuakhali', 'পটুয়াখালী', 'পটুয়াখালী', 'পটুয়াখালি', 'পটুয়াখালি'],
  pirojpur: ['pirojpur', 'পিরোজপুর', 'পিরোজ পুর'],
  sylhet: ['sylhet', 'silhet', 'syllet', 'সিলেট'],
  habiganj: ['habiganj', 'hobiganj', 'হবিগঞ্জ', 'হবিগন্জ'],
  moulvibazar: ['moulvibazar', 'moulvibazer', 'maulvibazar', 'মৌলভীবাজার', 'মৌলভাবাজার'],
  sunamganj: ['sunamganj', 'সুনামগঞ্জ', 'সুনামগন্জ'],
  rangpur: ['rangpur', 'rongpur', 'রংপুর'],
  dinajpur: ['dinajpur', 'dinajpore', 'দিনাজপুর'],
  gaibandha: ['gaibandha', 'গাইবান্ধা', 'গাইবান্ধাহ'],
  kurigram: ['kurigram', 'কুড়িগ্রাম', 'কুড়িগ্রাম', 'কুঁড়িগ্রাম', 'কুরিগ্রাম'],
  lalmonirhat: ['lalmonirhat', 'লালমনিরহাট'],
  nilphamari: ['nilphamari', 'নীলফামারী', 'নীলফামারি', 'নিলফামারী', 'sayedpur', 'সৈয়দপুর', 'সৈয়দপুর'],
  panchagarh: ['panchagarh', 'পঞ্চগড়', 'পঞ্চগড়', 'পঞ্চগর'],
  thakurgaon: ['thakurgaon', 'ঠাকুরগাঁও', 'ঠাকুরগাও'],
  mymensingh: ['mymensingh', 'mymensing', 'ময়মনসিংহ', 'ময়মনসিংহ', 'ময়মনসিং'],
  jamalpur: ['jamalpur', 'জামালপুর'],
  netrokona: ['netrokona', 'netrakona', 'নেত্রকোণা', 'নেত্রকোনা'],
  sherpur: ['sherpur', 'শেরপুর'],
  tangail: ['tangail', 'টাঙ্গাইল', 'টাংগাইল', 'tangayil'],
  narsingdi: ['narsingdi', 'নরসিংদী', 'নরসিংদি'],
  faridpur: ['faridpur', 'ফরিদপুর'],
  gopalganj: ['gopalganj', 'গোপালগঞ্জ', 'গোপালগন্জ'],
  kishoreganj: ['kishoreganj', 'কিশোরগঞ্জ', 'কিশোরগন্জ'],
  madaripur: ['madaripur', 'মাদারীপুর', 'মাদারিপুর'],
  manikganj: ['manikganj', 'মানিকগঞ্জ', 'মানিকগন্জ'],
  munshiganj: ['munshiganj', 'মুন্সিগঞ্জ', 'মুন্সীগঞ্জ', 'মুন্সিগন্জ'],
  rajbari: ['rajbari', 'রাজবাড়ী', 'রাজবাড়ি', 'রাজবারি'],
  shariatpur: ['shariatpur', 'শরীয়তপুর', 'শরীয়তপুর', 'শরিয়তপুর'],
};

/** Stopwords and generic suffixes that must never match independently */
const STOPWORDS_BN = new Set([
  'বাজার', 'সদর', 'রোড', 'পাড়া', 'পাড়া', 'গ্রাম', 'থানা', 'জেলা',
  'সিটি', 'গেট', 'মোড়', 'মোড়', 'পোস্ট', 'হাটি', 'বাড়ি', 'বাড়ি',
  'তলা', 'ফ্ল্যাট', 'লেন', 'গলি', 'ব্লক', 'সেক্টর',
]);

const STOPWORDS_EN = new Set([
  'bazar', 'sadar', 'road', 'para', 'gram', 'thana', 'zilla',
  'city', 'gate', 'mor', 'post', 'house', 'flat', 'lane',
  'block', 'sector', 'street', 'town',
]);

/**
 * Checks if candidate matches token with strict fuzzy / Levenshtein tolerance.
 * Ensures generic words (like "বাজার", "সদর") NEVER trigger false positive matches.
 */
function isFuzzyMatch(token: string, candidate: string): boolean {
  if (!token || !candidate) return false;

  const cleanTok = cleanEnglish(token);
  const cleanCand = cleanEnglish(candidate);

  const bnTok = normalizeBengali(token);
  const bnCand = normalizeBengali(candidate);

  // Ignore stop words immediately
  if (STOPWORDS_EN.has(cleanTok) || STOPWORDS_EN.has(cleanCand)) return false;
  if (STOPWORDS_BN.has(bnTok) || STOPWORDS_BN.has(bnCand)) return false;

  // 1. Exact match after English or Bengali cleaning
  if (cleanTok && cleanCand && cleanTok === cleanCand) return true;
  if (bnTok && bnCand && bnTok === bnCand) return true;

  // 2. Inflected word: token starts with candidate (e.g. "পাবনাতে" / "পাবনার" starts with "পাবনা")
  // Candidate must be at least 3 chars for Bengali, 4 chars for English
  if (bnCand.length >= 3 && bnTok.length > bnCand.length && bnTok.startsWith(bnCand)) {
    return true;
  }
  if (cleanCand.length >= 4 && cleanTok.length > cleanCand.length && cleanTok.startsWith(cleanCand)) {
    return true;
  }

  // 3. English Levenshtein distance (only compare single words of similar length)
  if (
    cleanTok &&
    cleanCand &&
    !cleanCand.includes(' ') &&
    Math.abs(cleanTok.length - cleanCand.length) <= 1
  ) {
    if (cleanCand.length >= 4 && cleanCand.length <= 5) {
      if (levenshteinDistance(cleanTok, cleanCand) <= 1) return true;
    } else if (cleanCand.length >= 6) {
      if (levenshteinDistance(cleanTok, cleanCand) <= 2) return true;
    }
  }

  // 4. Bengali Levenshtein distance (only compare single words of similar length)
  if (
    bnTok &&
    bnCand &&
    !bnCand.includes(' ') &&
    bnCand.length >= 3 &&
    Math.abs(bnTok.length - bnCand.length) <= 1
  ) {
    if (levenshteinDistance(bnTok, bnCand) <= 1) return true;
  }

  return false;
}

/**
 * Parses full address text (Bangla or English) to extract District, Division,
 * and calculate standard delivery rates with zero mismatch guarantee.
 */
export function parseAddressLocation(rawAddress: string | null | undefined): ParsedLocation {
  const text = (rawAddress || '').trim();

  // Default fallback (Outside Dhaka standard rate)
  const defaultResult: ParsedLocation = {
    district: null,
    division: null,
    districtNameEn: '',
    districtNameBn: '',
    divisionNameEn: '',
    divisionNameBn: '',
    tier: 'outside_dhaka',
    rate: 150,
    matchedName: '',
    badgeLabelBn: 'ডেলিভারি চার্জ: ৳১৫০ (ঢাকার বাইরে)',
    badgeLabelEn: 'Delivery: ৳150 (Outside Dhaka)',
    isRecognized: false,
  };

  if (!text) return defaultResult;

  const lowerRaw = text.toLowerCase();
  const normBnRaw = normalizeBengali(text);

  // Tokenize text into words and 2-word shingles
  const words = text
    .split(/[\s,.\-—/\\()#+;:!?'"]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const shingles: string[] = [];
  for (let i = 0; i < words.length; i++) {
    shingles.push(words[i]);
    if (i < words.length - 1) {
      shingles.push(`${words[i]} ${words[i + 1]}`);
    }
  }

  // ─── STEP 1: CHECK DHAKA SUB-AREAS FIRST (৳100) ──────────────────────────
  // Sub-areas take priority over general "Dhaka" mentions (e.g. "Savar, Dhaka" -> ৳100)
  for (const sub of DHAKA_SUB_AREAS) {
    // 1. Direct substring check
    const matchedAlias = sub.aliases.find((alias) => {
      const aliasClean = alias.toLowerCase();
      if (lowerRaw.includes(aliasClean)) return true;
      const aliasBnNorm = normalizeBengali(alias);
      if (aliasBnNorm && normBnRaw.includes(aliasBnNorm)) return true;
      return false;
    });

    if (matchedAlias) {
      const matchedDist = BANGLADESH_DISTRICTS.find((d) => d.id === sub.districtId);
      const matchedDiv = BANGLADESH_DIVISIONS.find((d) => d.id === 'dhaka');

      return {
        district: matchedDist || null,
        division: matchedDiv || null,
        districtNameEn: matchedDist?.nameEn || 'Dhaka',
        districtNameBn: matchedDist?.nameBn || 'ঢাকা',
        divisionNameEn: 'Dhaka',
        divisionNameBn: 'ঢাকা',
        tier: 'dhaka_subarea',
        rate: 100,
        matchedName: sub.nameBn,
        badgeLabelBn: `এলাকা: ${sub.nameBn} | বিভাগ: ঢাকা • ডেলিভারি চার্জ: ৳১০০ (সাব-এরিয়া)`,
        badgeLabelEn: `Area: ${sub.nameEn} | Division: Dhaka • Delivery: ৳100 (Sub-area)`,
        isRecognized: true,
      };
    }

    // 2. Fuzzy match across tokens
    for (const token of shingles) {
      const isFuzzy = sub.aliases.some((alias) => isFuzzyMatch(token, alias));
      if (isFuzzy) {
        const matchedDist = BANGLADESH_DISTRICTS.find((d) => d.id === sub.districtId);
        const matchedDiv = BANGLADESH_DIVISIONS.find((d) => d.id === 'dhaka');

        return {
          district: matchedDist || null,
          division: matchedDiv || null,
          districtNameEn: matchedDist?.nameEn || 'Dhaka',
          districtNameBn: matchedDist?.nameBn || 'ঢাকা',
          divisionNameEn: 'Dhaka',
          divisionNameBn: 'ঢাকা',
          tier: 'dhaka_subarea',
          rate: 100,
          matchedName: sub.nameBn,
          badgeLabelBn: `এলাকা: ${sub.nameBn} | বিভাগ: ঢাকা • ডেলিভারি চার্জ: ৳১০০ (সাব-এরিয়া)`,
          badgeLabelEn: `Area: ${sub.nameEn} | Division: Dhaka • Delivery: ৳100 (Sub-area)`,
          isRecognized: true,
        };
      }
    }
  }

  // ─── STEP 2: CHECK ALL 64 BANGLADESH DISTRICTS ───────────────────────────
  // Prioritize specific districts (e.g. Pabna, Bogura, Cumilla) over division-capital districts (e.g. Rajshahi, Chattogram)
  // so that "Pabna, Rajshahi" correctly resolves District: Pabna and Division: Rajshahi.
  const prioritizedDistricts = [
    ...BANGLADESH_DISTRICTS.filter((d) => d.id !== d.divisionId),
    ...BANGLADESH_DISTRICTS.filter((d) => d.id === d.divisionId),
  ];

  for (const dist of prioritizedDistricts) {
    const aliases = DISTRICT_ALIASES[dist.id] || [dist.nameEn.toLowerCase(), dist.nameBn];

    // 1. Direct substring check
    const matchedAlias = aliases.find((alias) => {
      const aliasClean = alias.toLowerCase();
      if (lowerRaw.includes(aliasClean)) return true;
      const aliasBnNorm = normalizeBengali(alias);
      if (aliasBnNorm && normBnRaw.includes(aliasBnNorm)) return true;
      return false;
    });

    if (matchedAlias) {
      const parentDiv = BANGLADESH_DIVISIONS.find((d) => d.id === dist.divisionId);
      const isDhakaDist = dist.id === 'dhaka';
      const isSubAreaDist = dist.isDhakaSubArea;

      const tier = isSubAreaDist
        ? 'dhaka_subarea'
        : isDhakaDist
        ? 'dhaka_core'
        : 'outside_dhaka';

      const rate = tier === 'dhaka_core' ? 80 : tier === 'dhaka_subarea' ? 100 : 150;

      const badgeLabelBn = isDhakaDist
        ? 'জেলা: ঢাকা | বিভাগ: ঢাকা • ডেলিভারি চার্জ: ৳৮০ (ঢাকার ভিতরে)'
        : isSubAreaDist
        ? `জেলা: ${dist.nameBn} | বিভাগ: ঢাকা • ডেলিভারি চার্জ: ৳১০০ (সাব-এরিয়া)`
        : `জেলা: ${dist.nameBn} | বিভাগ: ${dist.divisionNameBn} • ডেলিভারি চার্জ: ৳১৫০ (ঢাকার বাইরে)`;

      const badgeLabelEn = isDhakaDist
        ? 'District: Dhaka | Division: Dhaka • Delivery: ৳80 (Inside Dhaka)'
        : isSubAreaDist
        ? `District: ${dist.nameEn} | Division: Dhaka • Delivery: ৳100 (Sub-area)`
        : `District: ${dist.nameEn} | Division: ${dist.divisionNameEn} • Delivery: ৳150 (Outside Dhaka)`;

      return {
        district: dist,
        division: parentDiv || null,
        districtNameEn: dist.nameEn,
        districtNameBn: dist.nameBn,
        divisionNameEn: dist.divisionNameEn,
        divisionNameBn: dist.divisionNameBn,
        tier,
        rate,
        matchedName: dist.nameBn,
        badgeLabelBn,
        badgeLabelEn,
        isRecognized: true,
      };
    }

    // 2. Fuzzy match across tokens
    for (const token of shingles) {
      const isFuzzy = aliases.some((alias) => isFuzzyMatch(token, alias));
      if (isFuzzy) {
        const parentDiv = BANGLADESH_DIVISIONS.find((d) => d.id === dist.divisionId);
        const isDhakaDist = dist.id === 'dhaka';
        const isSubAreaDist = dist.isDhakaSubArea;

        const tier = isSubAreaDist
          ? 'dhaka_subarea'
          : isDhakaDist
          ? 'dhaka_core'
          : 'outside_dhaka';

        const rate = tier === 'dhaka_core' ? 80 : tier === 'dhaka_subarea' ? 100 : 150;

        const badgeLabelBn = isDhakaDist
          ? 'জেলা: ঢাকা | বিভাগ: ঢাকা • ডেলিভারি চার্জ: ৳৮০ (ঢাকার ভিতরে)'
          : isSubAreaDist
          ? `জেলা: ${dist.nameBn} | বিভাগ: ঢাকা • ডেলিভারি চার্জ: ৳১০০ (সাব-এরিয়া)`
          : `জেলা: ${dist.nameBn} | বিভাগ: ${dist.divisionNameBn} • ডেলিভারি চার্জ: ৳১৫০ (ঢাকার বাইরে)`;

        const badgeLabelEn = isDhakaDist
          ? 'District: Dhaka | Division: Dhaka • Delivery: ৳80 (Inside Dhaka)'
          : isSubAreaDist
          ? `District: ${dist.nameEn} | Division: Dhaka • Delivery: ৳100 (Sub-area)`
          : `District: ${dist.nameEn} | Division: ${dist.divisionNameEn} • Delivery: ৳150 (Outside Dhaka)`;

        return {
          district: dist,
          division: parentDiv || null,
          districtNameEn: dist.nameEn,
          districtNameBn: dist.nameBn,
          divisionNameEn: dist.divisionNameEn,
          divisionNameBn: dist.divisionNameBn,
          tier,
          rate,
          matchedName: dist.nameBn,
          badgeLabelBn,
          badgeLabelEn,
          isRecognized: true,
        };
      }
    }
  }

  // ─── STEP 3: CHECK DHAKA CORE AREAS (৳80) ─────────────────────────────────
  // E.g. Dhanmondi, Mirpur, Uttara, Gulshan, Mohammadpur
  for (const zone of DHAKA_CORE_AREAS) {
    const isDirectMatch =
      lowerRaw.includes(zone.toLowerCase()) ||
      normBnRaw.includes(normalizeBengali(zone));

    if (isDirectMatch) {
      const dhakaDist = BANGLADESH_DISTRICTS.find((d) => d.id === 'dhaka')!;
      const dhakaDiv = BANGLADESH_DIVISIONS.find((d) => d.id === 'dhaka')!;

      return {
        district: dhakaDist,
        division: dhakaDiv,
        districtNameEn: 'Dhaka',
        districtNameBn: 'ঢাকা',
        divisionNameEn: 'Dhaka',
        divisionNameBn: 'ঢাকা',
        tier: 'dhaka_core',
        rate: 80,
        matchedName: zone,
        badgeLabelBn: 'এলাকা: ঢাকা সিটি • ডেলিভারি চার্জ: ৳৮০ (ঢাকার ভিতরে)',
        badgeLabelEn: 'Area: Dhaka City • Delivery: ৳80 (Inside Dhaka)',
        isRecognized: true,
      };
    }

    // Fuzzy check for core zones
    for (const token of shingles) {
      if (isFuzzyMatch(token, zone)) {
        const dhakaDist = BANGLADESH_DISTRICTS.find((d) => d.id === 'dhaka')!;
        const dhakaDiv = BANGLADESH_DIVISIONS.find((d) => d.id === 'dhaka')!;

        return {
          district: dhakaDist,
          division: dhakaDiv,
          districtNameEn: 'Dhaka',
          districtNameBn: 'ঢাকা',
          divisionNameEn: 'Dhaka',
          divisionNameBn: 'ঢাকা',
          tier: 'dhaka_core',
          rate: 80,
          matchedName: zone,
          badgeLabelBn: 'এলাকা: ঢাকা সিটি • ডেলিভারি চার্জ: ৳৮০ (ঢাকার ভিতরে)',
          badgeLabelEn: 'Area: Dhaka City • Delivery: ৳80 (Inside Dhaka)',
          isRecognized: true,
        };
      }
    }
  }

  // ─── STEP 4: CHECK DIVISIONS (Fallback if user typed only Division) ────────
  for (const div of BANGLADESH_DIVISIONS) {
    const divEn = div.nameEn.toLowerCase();
    const divBnNorm = normalizeBengali(div.nameBn);

    const isMatch =
      lowerRaw.includes(divEn) ||
      normBnRaw.includes(divBnNorm) ||
      shingles.some((t) => isFuzzyMatch(t, divEn) || isFuzzyMatch(t, div.nameBn));

    if (isMatch) {
      const correspondingDist = BANGLADESH_DISTRICTS.find((d) => d.id === div.id);
      const isDhaka = div.id === 'dhaka';
      const tier = isDhaka ? 'dhaka_core' : 'outside_dhaka';
      const rate = isDhaka ? 80 : 150;

      return {
        district: correspondingDist || null,
        division: div,
        districtNameEn: correspondingDist?.nameEn || div.nameEn,
        districtNameBn: correspondingDist?.nameBn || div.nameBn,
        divisionNameEn: div.nameEn,
        divisionNameBn: div.nameBn,
        tier,
        rate,
        matchedName: div.nameBn,
        badgeLabelBn: isDhaka
          ? 'বিভাগ: ঢাকা • ডেলিভারি চার্জ: ৳৮০ (ঢাকার ভিতরে)'
          : `বিভাগ: ${div.nameBn} • ডেলিভারি চার্জ: ৳১৫০ (ঢাকার বাইরে)`,
        badgeLabelEn: isDhaka
          ? 'Division: Dhaka • Delivery: ৳80 (Inside Dhaka)'
          : `Division: ${div.nameEn} • Delivery: ৳150 (Outside Dhaka)`,
        isRecognized: true,
      };
    }
  }

  // Not recognized yet (user typed generic address like "House 10, Road 4")
  return defaultResult;
}
