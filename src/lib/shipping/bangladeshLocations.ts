/**
 * bangladeshLocations.ts
 * Complete database of 8 Divisions and 64 Districts of Bangladesh
 * with bilingual English & Bengali support and Pathao courier mapping.
 */

export interface BangladeshDivision {
  id: string;
  nameEn: string;
  nameBn: string;
  pathaoCityId: number;
}

export interface BangladeshDistrict {
  id: string;
  nameEn: string;
  nameBn: string;
  divisionId: string;
  divisionNameEn: string;
  divisionNameBn: string;
  isDhakaSubArea?: boolean;
}

export const BANGLADESH_DIVISIONS: BangladeshDivision[] = [
  { id: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা', pathaoCityId: 1 },
  { id: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', pathaoCityId: 2 },
  { id: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', pathaoCityId: 5 },
  { id: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা', pathaoCityId: 4 },
  { id: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল', pathaoCityId: 6 },
  { id: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট', pathaoCityId: 3 },
  { id: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর', pathaoCityId: 7 },
  { id: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', pathaoCityId: 8 },
];

export const BANGLADESH_DISTRICTS: BangladeshDistrict[] = [
  // ─── Dhaka Division (13 Districts) ───
  { id: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'gazipur', nameEn: 'Gazipur', nameBn: 'গাজীপুর', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা', isDhakaSubArea: true },
  { id: 'narayanganj', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা', isDhakaSubArea: true },
  { id: 'tangail', nameEn: 'Tangail', nameBn: 'টাঙ্গাইল', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'narsingdi', nameEn: 'Narsingdi', nameBn: 'নরসিংদী', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'faridpur', nameEn: 'Faridpur', nameBn: 'ফরিদপুর', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'gopalganj', nameEn: 'Gopalganj', nameBn: 'গোপালগঞ্জ', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'kishoreganj', nameEn: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'madaripur', nameEn: 'Madaripur', nameBn: 'মাদারীপুর', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'manikganj', nameEn: 'Manikganj', nameBn: 'মানিকগঞ্জ', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'munshiganj', nameEn: 'Munshiganj', nameBn: 'মুন্সিগঞ্জ', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'rajbari', nameEn: 'Rajbari', nameBn: 'রাজবাড়ী', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },
  { id: 'shariatpur', nameEn: 'Shariatpur', nameBn: 'শরীয়তপুর', divisionId: 'dhaka', divisionNameEn: 'Dhaka', divisionNameBn: 'ঢাকা' },

  // ─── Chattogram Division (11 Districts) ───
  { id: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'coxs-bazar', nameEn: "Cox's Bazar", nameBn: 'কক্সবাজার', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'cumilla', nameEn: 'Cumilla', nameBn: 'কুমিল্লা', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'feni', nameEn: 'Feni', nameBn: 'ফেনী', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'brahmanbaria', nameEn: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'chandpur', nameEn: 'Chandpur', nameBn: 'চাঁদপুর', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'noakhali', nameEn: 'Noakhali', nameBn: 'নোয়াখালী', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'lakshmipur', nameEn: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'bandarban', nameEn: 'Bandarban', nameBn: 'বান্দরবান', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'khagrachhari', nameEn: 'Khagrachhari', nameBn: 'খাগড়াছড়ি', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },
  { id: 'rangamati', nameEn: 'Rangamati', nameBn: 'রাঙ্গামাটি', divisionId: 'chattogram', divisionNameEn: 'Chattogram', divisionNameBn: 'চট্টগ্রাম' },

  // ─── Rajshahi Division (8 Districts) ───
  { id: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },
  { id: 'pabna', nameEn: 'Pabna', nameBn: 'পাবনা', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },
  { id: 'bogura', nameEn: 'Bogura', nameBn: 'বগুড়া', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },
  { id: 'sirajganj', nameEn: 'Sirajganj', nameBn: 'সিরাজগঞ্জ', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },
  { id: 'naogaon', nameEn: 'Naogaon', nameBn: 'নওগাঁ', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },
  { id: 'natore', nameEn: 'Natore', nameBn: 'নাটোর', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },
  { id: 'chapainawabganj', nameEn: 'Chapainawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },
  { id: 'joypurhat', nameEn: 'Joypurhat', nameBn: 'জয়পুরহাট', divisionId: 'rajshahi', divisionNameEn: 'Rajshahi', divisionNameBn: 'রাজশাহী' },

  // ─── Khulna Division (10 Districts) ───
  { id: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'bagerhat', nameEn: 'Bagerhat', nameBn: 'বাগেরহাট', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'chuadanga', nameEn: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'jashore', nameEn: 'Jashore', nameBn: 'যশোর', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'jhenaidah', nameEn: 'Jhenaidah', nameBn: 'ঝিনাইদহ', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'kushtia', nameEn: 'Kushtia', nameBn: 'কুষ্টিয়া', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'magura', nameEn: 'Magura', nameBn: 'মাগুরা', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'meherpur', nameEn: 'Meherpur', nameBn: 'মেহেরপুর', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'narail', nameEn: 'Narail', nameBn: 'নড়াইল', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },
  { id: 'satkhira', nameEn: 'Satkhira', nameBn: 'সাতক্ষীরা', divisionId: 'khulna', divisionNameEn: 'Khulna', divisionNameBn: 'খুলনা' },

  // ─── Barishal Division (6 Districts) ───
  { id: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল', divisionId: 'barishal', divisionNameEn: 'Barishal', divisionNameBn: 'বরিশাল' },
  { id: 'barguna', nameEn: 'Barguna', nameBn: 'বরগুনা', divisionId: 'barishal', divisionNameEn: 'Barishal', divisionNameBn: 'বরিশাল' },
  { id: 'bhola', nameEn: 'Bhola', nameBn: 'ভোলা', divisionId: 'barishal', divisionNameEn: 'Barishal', divisionNameBn: 'বরিশাল' },
  { id: 'jhalokathi', nameEn: 'Jhalokathi', nameBn: 'ঝালকাঠি', divisionId: 'barishal', divisionNameEn: 'Barishal', divisionNameBn: 'বরিশাল' },
  { id: 'patuakhali', nameEn: 'Patuakhali', nameBn: 'পটুয়াখালী', divisionId: 'barishal', divisionNameEn: 'Barishal', divisionNameBn: 'বরিশাল' },
  { id: 'pirojpur', nameEn: 'Pirojpur', nameBn: 'পিরোজপুর', divisionId: 'barishal', divisionNameEn: 'Barishal', divisionNameBn: 'বরিশাল' },

  // ─── Sylhet Division (4 Districts) ───
  { id: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট', divisionId: 'sylhet', divisionNameEn: 'Sylhet', divisionNameBn: 'সিলেট' },
  { id: 'habiganj', nameEn: 'Habiganj', nameBn: 'হবিগঞ্জ', divisionId: 'sylhet', divisionNameEn: 'Sylhet', divisionNameBn: 'সিলেট' },
  { id: 'moulvibazar', nameEn: 'Moulvibazar', nameBn: 'মৌলভীবাজার', divisionId: 'sylhet', divisionNameEn: 'Sylhet', divisionNameBn: 'সিলেট' },
  { id: 'sunamganj', nameEn: 'Sunamganj', nameBn: 'সুনামগঞ্জ', divisionId: 'sylhet', divisionNameEn: 'Sylhet', divisionNameBn: 'সিলেট' },

  // ─── Rangpur Division (8 Districts) ───
  { id: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },
  { id: 'dinajpur', nameEn: 'Dinajpur', nameBn: 'দিনাজপুর', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },
  { id: 'gaibandha', nameEn: 'Gaibandha', nameBn: 'গাইবান্ধা', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },
  { id: 'kurigram', nameEn: 'Kurigram', nameBn: 'কুড়িগ্রাম', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },
  { id: 'lalmonirhat', nameEn: 'Lalmonirhat', nameBn: 'লালমনিরহাট', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },
  { id: 'nilphamari', nameEn: 'Nilphamari', nameBn: 'নীলফামারী', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },
  { id: 'panchagarh', nameEn: 'Panchagarh', nameBn: 'পঞ্চগড়', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },
  { id: 'thakurgaon', nameEn: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও', divisionId: 'rangpur', divisionNameEn: 'Rangpur', divisionNameBn: 'রংপুর' },

  // ─── Mymensingh Division (4 Districts) ───
  { id: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', divisionId: 'mymensingh', divisionNameEn: 'Mymensingh', divisionNameBn: 'ময়মনসিংহ' },
  { id: 'jamalpur', nameEn: 'Jamalpur', nameBn: 'জামালপুর', divisionId: 'mymensingh', divisionNameEn: 'Mymensingh', divisionNameBn: 'ময়মনসিংহ' },
  { id: 'netrokona', nameEn: 'Netrokona', nameBn: 'নেত্রকোণা', divisionId: 'mymensingh', divisionNameEn: 'Mymensingh', divisionNameBn: 'ময়মনসিংহ' },
  { id: 'sherpur', nameEn: 'Sherpur', nameBn: 'শেরপুর', divisionId: 'mymensingh', divisionNameEn: 'Mymensingh', divisionNameBn: 'ময়মনসিংহ' },
];

/**
 * Returns all districts belonging to a specific division.
 */
export function getDistrictsByDivision(divisionId?: string | null): BangladeshDistrict[] {
  if (!divisionId) return BANGLADESH_DISTRICTS;
  const clean = divisionId.toLowerCase().trim();
  return BANGLADESH_DISTRICTS.filter(
    (d) => d.divisionId.toLowerCase() === clean || d.divisionNameEn.toLowerCase() === clean
  );
}

/**
 * Finds a division by id or English/Bengali name.
 */
export function findDivision(query?: string | null): BangladeshDivision | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return BANGLADESH_DIVISIONS.find(
    (div) =>
      div.id.toLowerCase() === q ||
      div.nameEn.toLowerCase() === q ||
      div.nameBn === query.trim()
  );
}

/**
 * Finds a district by id or English/Bengali name or partial match.
 */
export function findDistrict(query?: string | null): BangladeshDistrict | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return BANGLADESH_DISTRICTS.find(
    (dist) =>
      dist.id.toLowerCase() === q ||
      dist.nameEn.toLowerCase() === q ||
      dist.nameBn === query.trim() ||
      q.includes(dist.nameEn.toLowerCase()) ||
      query.trim().includes(dist.nameBn)
  );
}
