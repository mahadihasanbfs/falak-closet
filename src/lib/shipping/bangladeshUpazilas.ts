/**
 * bangladeshUpazilas.ts — Complete mapping of Upazilas / Thanas (উপজেলা / থানা)
 * across all 64 districts in Bangladesh with English & Bengali names and aliases.
 */

export interface BangladeshUpazila {
  id: string;
  nameEn: string;
  nameBn: string;
  districtId: string;
  aliases: string[];
}

export const BANGLADESH_UPAZILAS: BangladeshUpazila[] = [
  // ─── Lakshmipur (লক্ষ্মীপুর) ───
  { id: 'lakshmipur-sadar', nameEn: 'Lakshmipur Sadar', nameBn: 'লক্ষ্মীপুর সদর', districtId: 'lakshmipur', aliases: ['lakshmipur sadar', 'লক্ষ্মীপুর সদর', 'লক্ষিপুর সদর'] },
  { id: 'raipur', nameEn: 'Raipur', nameBn: 'রায়পুর', districtId: 'lakshmipur', aliases: ['raipur', 'raypur', 'রায়পুর', 'রায়পুর', 'রাযপুর'] },
  { id: 'ramganj', nameEn: 'Ramganj', nameBn: 'রামগঞ্জ', districtId: 'lakshmipur', aliases: ['ramganj', 'ramgonj', 'রামগঞ্জ', 'রামগন্জ'] },
  { id: 'ramgati', nameEn: 'Ramgati', nameBn: 'রামগতি', districtId: 'lakshmipur', aliases: ['ramgati', 'রামগতি'] },
  { id: 'kamalnagar', nameEn: 'Kamalnagar', nameBn: 'কমলনগর', districtId: 'lakshmipur', aliases: ['kamalnagar', 'কমলনগর'] },

  // ─── Noakhali (নোয়াখালী) ───
  { id: 'noakhali-sadar', nameEn: 'Noakhali Sadar', nameBn: 'নোয়াখালী সদর', districtId: 'noakhali', aliases: ['noakhali sadar', 'নোয়াখালী সদর', 'sudharam', 'সুধারাম', 'মাইজদী', 'maijdi', 'maijdee'] },
  { id: 'begumganj', nameEn: 'Begumganj', nameBn: 'বেগমগঞ্জ', districtId: 'noakhali', aliases: ['begumganj', 'begumgonj', 'বেগমগঞ্জ', 'বেগমগন্জ', 'choumuhani', 'চৌমুহনী', 'চৌমুহনি'] },
  { id: 'chatkhil', nameEn: 'Chatkhil', nameBn: 'চাটখিল', districtId: 'noakhali', aliases: ['chatkhil', 'চাটখিল'] },
  { id: 'companiganj-noa', nameEn: 'Companiganj', nameBn: 'কোম্পানীগঞ্জ', districtId: 'noakhali', aliases: ['companiganj', 'companigonj', 'কোম্পানীগঞ্জ', 'কোম্পানিগঞ্জ', 'basurhat', 'বসুরহাট'] },
  { id: 'hatiya', nameEn: 'Hatiya', nameBn: 'হাতিয়া', districtId: 'noakhali', aliases: ['hatiya', 'hatia', 'হাতিয়া', 'হাতিয়া'] },
  { id: 'senbagh', nameEn: 'Senbagh', nameBn: 'সেনবাগ', districtId: 'noakhali', aliases: ['senbagh', 'senbag', 'সেনবাগ'] },
  { id: 'sonaimuri', nameEn: 'Sonaimuri', nameBn: 'সোনাইমুড়ী', districtId: 'noakhali', aliases: ['sonaimuri', 'সোনাইমুড়ী', 'সোনাইমুড়ি'] },
  { id: 'subarnachar', nameEn: 'Subarnachar', nameBn: 'সুবর্ণচর', districtId: 'noakhali', aliases: ['subarnachar', 'সুবর্ণচর'] },
  { id: 'kabirhat', nameEn: 'Kabirhat', nameBn: 'কবিরহাট', districtId: 'noakhali', aliases: ['kabirhat', 'কবিরহাট'] },

  // ─── Feni (ফেনী) ───
  { id: 'feni-sadar', nameEn: 'Feni Sadar', nameBn: 'ফেনী সদর', districtId: 'feni', aliases: ['feni sadar', 'ফেনী সদর', 'ফেনি সদর'] },
  { id: 'daganbhuiyan', nameEn: 'Daganbhuiyan', nameBn: 'দাগনভূঞা', districtId: 'feni', aliases: ['daganbhuiyan', 'daganbhuiya', 'দাগনভূঞা', 'দাগনভুইয়া'] },
  { id: 'chhagalnaiya', nameEn: 'Chhagalnaiya', nameBn: 'ছাগলনাইয়া', districtId: 'feni', aliases: ['chhagalnaiya', 'ছাগলনাইয়া', 'ছাগলনাইয়া'] },
  { id: 'sonagazi', nameEn: 'Sonagazi', nameBn: 'সোনাগাজী', districtId: 'feni', aliases: ['sonagazi', 'সোনাগাজী', 'সোনাগাজি'] },
  { id: 'parshuram', nameEn: 'Parshuram', nameBn: 'পরশুরাম', districtId: 'feni', aliases: ['parshuram', 'পরশুরাম'] },
  { id: 'fulgazi', nameEn: 'Fulgazi', nameBn: 'ফুলগাজী', districtId: 'feni', aliases: ['fulgazi', 'ফুলগাজী', 'ফুলগাজি'] },

  // ─── Cumilla (কুমিল্লা) ───
  { id: 'cumilla-sadar', nameEn: 'Cumilla Sadar', nameBn: 'কুমিল্লা সদর', districtId: 'cumilla', aliases: ['cumilla sadar', 'comilla sadar', 'কুমিল্লা সদর', 'শাসনগাছা', 'shasongachha'] },
  { id: 'barura', nameEn: 'Barura', nameBn: 'বরুড়া', districtId: 'cumilla', aliases: ['barura', 'বরুড়া', 'বরুড়া'] },
  { id: 'brahmanpara', nameEn: 'Brahmanpara', nameBn: 'ব্রাহ্মণপাড়া', districtId: 'cumilla', aliases: ['brahmanpara', 'ব্রাহ্মণপাড়া', 'ব্রাহ্মনপাড়া'] },
  { id: 'burichang', nameEn: 'Burichang', nameBn: 'বুড়িচং', districtId: 'cumilla', aliases: ['burichang', 'বুড়িচং', 'বুড়িচং'] },
  { id: 'chandina', nameEn: 'Chandina', nameBn: 'চান্দিনা', districtId: 'cumilla', aliases: ['chandina', 'চান্দিনা'] },
  { id: 'chauddagram', nameEn: 'Chauddagram', nameBn: 'চৌদ্দগ্রাম', districtId: 'cumilla', aliases: ['chauddagram', 'chouddagram', 'চৌদ্দগ্রাম'] },
  { id: 'daudkandi', nameEn: 'Daudkandi', nameBn: 'দাউদকান্দি', districtId: 'cumilla', aliases: ['daudkandi', 'দাউদকান্দি'] },
  { id: 'debidwar', nameEn: 'Debidwar', nameBn: 'দেবিদ্বার', districtId: 'cumilla', aliases: ['debidwar', 'দেবিদ্বার', 'দেবীদ্বার'] },
  { id: 'homna', nameEn: 'Homna', nameBn: 'হোমনা', districtId: 'cumilla', aliases: ['homna', 'হোমনা'] },
  { id: 'laksam', nameEn: 'Laksam', nameBn: 'লাকসাম', districtId: 'cumilla', aliases: ['laksam', 'লাকসাম'] },
  { id: 'muradnagar', nameEn: 'Muradnagar', nameBn: 'মুরাদনগর', districtId: 'cumilla', aliases: ['muradnagar', 'মুরাদনগর'] },
  { id: 'nangalkot', nameEn: 'Nangalkot', nameBn: 'নাঙ্গলকোট', districtId: 'cumilla', aliases: ['nangalkot', 'নাঙ্গলকোট'] },
  { id: 'meghna', nameEn: 'Meghna', nameBn: 'মেঘনা', districtId: 'cumilla', aliases: ['meghna', 'মেঘনা'] },
  { id: 'titas', nameEn: 'Titas', nameBn: 'তিতাস', districtId: 'cumilla', aliases: ['titas', 'তিতাস'] },
  { id: 'monohargonj', nameEn: 'Monohargonj', nameBn: 'মনোহরগঞ্জ', districtId: 'cumilla', aliases: ['monohargonj', 'monoharganj', 'মনোহরগঞ্জ'] },
  { id: 'lalmai', nameEn: 'Lalmai', nameBn: 'লালমাই', districtId: 'cumilla', aliases: ['lalmai', 'লালমাই'] },

  // ─── Chandpur (চাঁদপুর) ───
  { id: 'chandpur-sadar', nameEn: 'Chandpur Sadar', nameBn: 'চাঁদপুর সদর', districtId: 'chandpur', aliases: ['chandpur sadar', 'চাঁদপুর সদর'] },
  { id: 'faridganj', nameEn: 'Faridganj', nameBn: 'ফরিদগঞ্জ', districtId: 'chandpur', aliases: ['faridganj', 'faridgonj', 'ফরিদগঞ্জ'] },
  { id: 'haimchar', nameEn: 'Haimchar', nameBn: 'হাইমচর', districtId: 'chandpur', aliases: ['haimchar', 'হাইমচর'] },
  { id: 'hajiganj', nameEn: 'Hajiganj', nameBn: 'হাজীগঞ্জ', districtId: 'chandpur', aliases: ['hajiganj', 'hajigonj', 'হাজীগঞ্জ', 'হাজিগঞ্জ'] },
  { id: 'kachua-cha', nameEn: 'Kachua', nameBn: 'কচুয়া', districtId: 'chandpur', aliases: ['kachua', 'কচুয়া', 'কচুয়া'] },
  { id: 'matlab-dakshin', nameEn: 'Matlab Dakshin', nameBn: 'মতলব দক্ষিণ', districtId: 'chandpur', aliases: ['matlab dakshin', 'মতলব দক্ষিণ', 'matlab'] },
  { id: 'matlab-uttar', nameEn: 'Matlab Uttar', nameBn: 'মতলব উত্তর', districtId: 'chandpur', aliases: ['matlab uttar', 'মতলব উত্তর'] },
  { id: 'shahrasti', nameEn: 'Shahrasti', nameBn: 'শাহরাস্তি', districtId: 'chandpur', aliases: ['shahrasti', 'শাহরাস্তি'] },

  // ─── Brahmanbaria (ব্রাহ্মণবাড়িয়া) ───
  { id: 'brahmanbaria-sadar', nameEn: 'Brahmanbaria Sadar', nameBn: 'ব্রাহ্মণবাড়িয়া সদর', districtId: 'brahmanbaria', aliases: ['brahmanbaria sadar', 'ব্রাহ্মণবাড়িয়া সদর'] },
  { id: 'ashuganj', nameEn: 'Ashuganj', nameBn: 'আশুগঞ্জ', districtId: 'brahmanbaria', aliases: ['ashuganj', 'ashugonj', 'আশুগঞ্জ', 'আশুগন্জ'] },
  { id: 'bancharampur', nameEn: 'Bancharampur', nameBn: 'বাঞ্ছারামপুর', districtId: 'brahmanbaria', aliases: ['bancharampur', 'বাঞ্ছারামপুর'] },
  { id: 'kasba', nameEn: 'Kasba', nameBn: 'কসবা', districtId: 'brahmanbaria', aliases: ['kasba', 'কসবা'] },
  { id: 'nabinagar', nameEn: 'Nabinagar', nameBn: 'নবীনগর', districtId: 'brahmanbaria', aliases: ['nabinagar', 'নবীনগর'] },
  { id: 'nasirnagar', nameEn: 'Nasirnagar', nameBn: 'নাসিরনগর', districtId: 'brahmanbaria', aliases: ['nasirnagar', 'নাসিরনগর'] },
  { id: 'sarail', nameEn: 'Sarail', nameBn: 'সরাইল', districtId: 'brahmanbaria', aliases: ['sarail', 'সরাইল'] },
  { id: 'akhaura', nameEn: 'Akhaura', nameBn: 'আখাউড়া', districtId: 'brahmanbaria', aliases: ['akhaura', 'আখাউড়া', 'আখাউড়া'] },
  { id: 'bijoynagar', nameEn: 'Bijoynagar', nameBn: 'বিজয়নগর', districtId: 'brahmanbaria', aliases: ['bijoynagar', 'বিজয়নগর', 'বিজয় নগর'] },

  // ─── Chattogram (চট্টগ্রাম) ───
  { id: 'anwara', nameEn: 'Anwara', nameBn: 'আনোয়ারা', districtId: 'chattogram', aliases: ['anwara', 'আনোয়ারা', 'আনোয়ারা'] },
  { id: 'banshkhali', nameEn: 'Banshkhali', nameBn: 'বাঁশখালী', districtId: 'chattogram', aliases: ['banshkhali', 'বাঁশখালী', 'বাশখালী'] },
  { id: 'boalkhali', nameEn: 'Boalkhali', nameBn: 'বোয়ালখালী', districtId: 'chattogram', aliases: ['boalkhali', 'বোয়ালখালী', 'বোয়ালখালী'] },
  { id: 'chandanaish', nameEn: 'Chandanaish', nameBn: 'চন্দনাইশ', districtId: 'chattogram', aliases: ['chandanaish', 'চন্দনাইশ'] },
  { id: 'fatikchhari', nameEn: 'Fatikchhari', nameBn: 'ফটিকছড়ি', districtId: 'chattogram', aliases: ['fatikchhari', 'ফটিকছড়ি', 'ফটিকছড়ি'] },
  { id: 'hathazari', nameEn: 'Hathazari', nameBn: 'হাটহাজারী', districtId: 'chattogram', aliases: ['hathazari', 'হাটহাজারী', 'হাটহাজারি'] },
  { id: 'lohagara-ctg', nameEn: 'Lohagara', nameBn: 'লোহাগাড়া', districtId: 'chattogram', aliases: ['lohagara', 'লোহাগাড়া', 'লোহাগাড়া'] },
  { id: 'mirsharai', nameEn: 'Mirsharai', nameBn: 'মীরসরাই', districtId: 'chattogram', aliases: ['mirsharai', 'mirsarai', 'মীরসরাই', 'মিরসরাই'] },
  { id: 'patiya', nameEn: 'Patiya', nameBn: 'পটিয়া', districtId: 'chattogram', aliases: ['patiya', 'পটিয়া', 'পটিয়া'] },
  { id: 'rangunia', nameEn: 'Rangunia', nameBn: 'রাঙ্গুনিয়া', districtId: 'chattogram', aliases: ['rangunia', 'রাঙ্গুনিয়া', 'রাঙ্গুনিয়া'] },
  { id: 'raozan', nameEn: 'Raozan', nameBn: 'রাউজান', districtId: 'chattogram', aliases: ['raozan', 'রাউজান'] },
  { id: 'sandwip', nameEn: 'Sandwip', nameBn: 'সন্দ্বীপ', districtId: 'chattogram', aliases: ['sandwip', 'সন্দ্বীপ', 'সন্দ্বিপ'] },
  { id: 'satkania', nameEn: 'Satkania', nameBn: 'সাতকানিয়া', districtId: 'chattogram', aliases: ['satkania', 'সাতকানিয়া', 'সাতকানিয়া'] },
  { id: 'sitakunda', nameEn: 'Sitakunda', nameBn: 'সীতাকুণ্ড', districtId: 'chattogram', aliases: ['sitakunda', 'sitakundu', 'সীতাকুণ্ড', 'সীতাকুন্ড'] },
  { id: 'karnaphuli', nameEn: 'Karnaphuli', nameBn: 'কর্ণফুলী', districtId: 'chattogram', aliases: ['karnaphuli', 'কর্ণফুলী', 'কর্ণফুলি'] },

  // ─── Cox's Bazar (কক্সবাজার) ───
  { id: 'chakaria', nameEn: 'Chakaria', nameBn: 'চকোরিয়া', districtId: 'coxs-bazar', aliases: ['chakaria', 'চকোরিয়া', 'চকরিয়া', 'চকরিয়া'] },
  { id: 'kutubdia', nameEn: 'Kutubdia', nameBn: 'কুতুবদিয়া', districtId: 'coxs-bazar', aliases: ['kutubdia', 'কুতুবদিয়া', 'কুতুবদিয়া'] },
  { id: 'maheshkhali', nameEn: 'Maheshkhali', nameBn: 'মহেশখালী', districtId: 'coxs-bazar', aliases: ['maheshkhali', 'মহেশখালী', 'মহেশখালি'] },
  { id: 'ramu', nameEn: 'Ramu', nameBn: 'রামু', districtId: 'coxs-bazar', aliases: ['ramu', 'রামু'] },
  { id: 'teknaf', nameEn: 'Teknaf', nameBn: 'টেকনাফ', districtId: 'coxs-bazar', aliases: ['teknaf', 'টেকনাফ', 'সেন্টমার্টিন', 'saint martin'] },
  { id: 'ukhia', nameEn: 'Ukhia', nameBn: 'উখিয়া', districtId: 'coxs-bazar', aliases: ['ukhia', 'উখিয়া', 'উখিয়া', 'কুতুপালং'] },
  { id: 'pekua', nameEn: 'Pekua', nameBn: 'পেকুয়া', districtId: 'coxs-bazar', aliases: ['pekua', 'পেকুয়া', 'পেকুয়া'] },
  { id: 'eidgaon', nameEn: 'Eidgaon', nameBn: 'ঈদগাঁও', districtId: 'coxs-bazar', aliases: ['eidgaon', 'ঈদগাঁও', 'ঈদগাহ'] },

  // ─── Pabna (পাবনা) ───
  { id: 'ishwardi', nameEn: 'Ishwardi', nameBn: 'ঈশ্বরদী', districtId: 'pabna', aliases: ['ishwardi', 'iswardi', 'ঈশ্বরদী', 'ঈশ্বরদি', 'রুপপুর', 'rooppur'] },
  { id: 'atgharia', nameEn: 'Atgharia', nameBn: 'আটঘরিয়া', districtId: 'pabna', aliases: ['atgharia', 'আটঘরিয়া', 'আটঘরিয়া'] },
  { id: 'bera', nameEn: 'Bera', nameBn: 'বেড়া', districtId: 'pabna', aliases: ['bera', 'বেড়া', 'বেড়া'] },
  { id: 'bhangura', nameEn: 'Bhangura', nameBn: 'ভাঙ্গুড়া', districtId: 'pabna', aliases: ['bhangura', 'ভাঙ্গুড়া', 'ভাঙ্গুড়া'] },
  { id: 'chatmohar', nameEn: 'Chatmohar', nameBn: 'চাটমোহর', districtId: 'pabna', aliases: ['chatmohar', 'চাটমোহর'] },
  { id: 'santhia', nameEn: 'Santhia', nameBn: 'সাঁথিয়া', districtId: 'pabna', aliases: ['santhia', 'সাঁথিয়া', 'সাথিয়া'] },
  { id: 'sujanagar', nameEn: 'Sujanagar', nameBn: 'সুজানগর', districtId: 'pabna', aliases: ['sujanagar', 'সুজানগর'] },

  // ─── Bogura (বগুড়া) ───
  { id: 'adamdighi', nameEn: 'Adamdighi', nameBn: 'আদমদিঘী', districtId: 'bogura', aliases: ['adamdighi', 'আদমদিঘী', 'santahar', 'সান্তাহার'] },
  { id: 'dhunat', nameEn: 'Dhunat', nameBn: 'ধুনট', districtId: 'bogura', aliases: ['dhunat', 'ধুনট'] },
  { id: 'dhupchanchia', nameEn: 'Dhupchanchia', nameBn: 'দুপচাঁচিয়া', districtId: 'bogura', aliases: ['dhupchanchia', 'dupchanchia', 'দুপচাঁচিয়া', 'দুপচাচিয়া'] },
  { id: 'gabtali', nameEn: 'Gabtali', nameBn: 'গাবতলী', districtId: 'bogura', aliases: ['gabtali', 'গাবতলী', 'গাবতলি'] },
  { id: 'kahaloo', nameEn: 'Kahaloo', nameBn: 'কাহালু', districtId: 'bogura', aliases: ['kahaloo', 'kahalu', 'কাহালু'] },
  { id: 'nandigram', nameEn: 'Nandigram', nameBn: 'নন্দীগ্রাম', districtId: 'bogura', aliases: ['nandigram', 'নন্দীগ্রাম', 'নন্দিগ্রাম'] },
  { id: 'sariakandi', nameEn: 'Sariakandi', nameBn: 'সারিয়াকান্দি', districtId: 'bogura', aliases: ['sariakandi', 'সারিয়াকান্দি', 'সারিযাকান্দি'] },
  { id: 'shajahanpur', nameEn: 'Shajahanpur', nameBn: 'শাজাহানপুর', districtId: 'bogura', aliases: ['shajahanpur', 'শাজাহানপুর'] },
  { id: 'sherpur-bog', nameEn: 'Sherpur', nameBn: 'শেরপুর', districtId: 'bogura', aliases: ['sherpur bogura', 'শেরপুর বগুড়া'] },
  { id: 'shibganj-bog', nameEn: 'Shibganj', nameBn: 'শিবগঞ্জ', districtId: 'bogura', aliases: ['shibganj bogura', 'শিবগঞ্জ বগুড়া', 'মহাস্থানগড়', 'mahasthangarh'] },
  { id: 'sonatola', nameEn: 'Sonatola', nameBn: 'সোনাতলা', districtId: 'bogura', aliases: ['sonatola', 'সোনাতলা'] },

  // ─── Kushtia (কুষ্টিয়া) ───
  { id: 'bheramara', nameEn: 'Bheramara', nameBn: 'ভেড়ামারা', districtId: 'kushtia', aliases: ['bheramara', 'ভেড়ামারা', 'ভেড়ামারা'] },
  { id: 'daulatpur-kus', nameEn: 'Daulatpur', nameBn: 'দৌলতপুর', districtId: 'kushtia', aliases: ['daulatpur kushtia', 'দৌলতপুর কুষ্টিয়া'] },
  { id: 'khoksa', nameEn: 'Khoksa', nameBn: 'খোকসা', districtId: 'kushtia', aliases: ['khoksa', 'খোকসা'] },
  { id: 'kumarkhali', nameEn: 'Kumarkhali', nameBn: 'কুমারখালী', districtId: 'kushtia', aliases: ['kumarkhali', 'কুমারখালী', 'কুমারখালি', 'শিলাইদহ', 'shilaidaha'] },
  { id: 'mirpur-kus', nameEn: 'Mirpur Kushtia', nameBn: 'মিরপুর কুষ্টিয়া', districtId: 'kushtia', aliases: ['mirpur kushtia', 'মিরপুর কুষ্টিয়া', 'পোড়াদহ', 'poradah'] },

  // ─── Jashore (যশোর) ───
  { id: 'abhaynagar', nameEn: 'Abhaynagar', nameBn: 'অভয়নগর', districtId: 'jashore', aliases: ['abhaynagar', 'অভয়নগর', 'নওয়াপাড়া', 'noapara'] },
  { id: 'bagherpara', nameEn: 'Bagherpara', nameBn: 'বাঘারপাড়া', districtId: 'jashore', aliases: ['bagherpara', 'বাঘারপাড়া'] },
  { id: 'chaugachha', nameEn: 'Chaugachha', nameBn: 'চৌগাছা', districtId: 'jashore', aliases: ['chaugachha', 'চৌগাছা'] },
  { id: 'jhikargachha', nameEn: 'Jhikargachha', nameBn: 'ঝিকরগাছা', districtId: 'jashore', aliases: ['jhikargachha', 'ঝিকরগাছা'] },
  { id: 'keshabpur', nameEn: 'Keshabpur', nameBn: 'কেশবপুর', districtId: 'jashore', aliases: ['keshabpur', 'কেশবপুর'] },
  { id: 'manirampur', nameEn: 'Manirampur', nameBn: 'মণিরামপুর', districtId: 'jashore', aliases: ['manirampur', 'মণিরামপুর', 'মনিরামপুর'] },
  { id: 'sharsha', nameEn: 'Sharsha', nameBn: 'শার্শা', districtId: 'jashore', aliases: ['sharsha', 'শার্শা', 'বেনাপোল', 'benapole'] },

  // ─── Sylhet (সিলেট) ───
  { id: 'balaganj', nameEn: 'Balaganj', nameBn: 'বালাগঞ্জ', districtId: 'sylhet', aliases: ['balaganj', 'বালাগঞ্জ'] },
  { id: 'beanibazar', nameEn: 'Beanibazar', nameBn: 'বিয়ানীবাজার', districtId: 'sylhet', aliases: ['beanibazar', 'বিয়ানীবাজার', 'বিয়ানীবাজার'] },
  { id: 'bishwanath', nameEn: 'Bishwanath', nameBn: 'বিশ্বনাথ', districtId: 'sylhet', aliases: ['bishwanath', 'বিশ্বনাথ'] },
  { id: 'fenchuganj', nameEn: 'Fenchuganj', nameBn: 'ফেঞ্চুগঞ্জ', districtId: 'sylhet', aliases: ['fenchuganj', 'ফেঞ্চুগঞ্জ'] },
  { id: 'golapganj', nameEn: 'Golapganj', nameBn: 'গোলাপগঞ্জ', districtId: 'sylhet', aliases: ['golapganj', 'গোলাপগঞ্জ'] },
  { id: 'gowainghat', nameEn: 'Gowainghat', nameBn: 'গোয়াইনঘাট', districtId: 'sylhet', aliases: ['gowainghat', 'গোয়াইনঘাট', 'জাফলং', 'jaflong'] },
  { id: 'jaintiapur', nameEn: 'Jaintiapur', nameBn: 'জৈন্তাপুর', districtId: 'sylhet', aliases: ['jaintiapur', 'জৈন্তাপুর'] },
  { id: 'kanaighat', nameEn: 'Kanaighat', nameBn: 'কানাইঘাট', districtId: 'sylhet', aliases: ['kanaighat', 'কানাইঘাট'] },
  { id: 'zakiganj', nameEn: 'Zakiganj', nameBn: 'জকিগঞ্জ', districtId: 'sylhet', aliases: ['zakiganj', 'জকিগঞ্জ'] },
  { id: 'dakshin-surma', nameEn: 'Dakshin Surma', nameBn: 'দক্ষিণ সুরমা', districtId: 'sylhet', aliases: ['dakshin surma', 'দক্ষিণ সুরমা', 'কদমতলী'] },
  { id: 'osmani-nagar', nameEn: 'Osmani Nagar', nameBn: 'ওসমানী নগর', districtId: 'sylhet', aliases: ['osmani nagar', 'ওসমানী নগর'] },

  // ─── Moulvibazar (মৌলভীবাজার) ───
  { id: 'barlekha', nameEn: 'Barlekha', nameBn: 'বড়লেখা', districtId: 'moulvibazar', aliases: ['barlekha', 'বড়লেখা'] },
  { id: 'kamalganj', nameEn: 'Kamalganj', nameBn: 'কমলগঞ্জ', districtId: 'moulvibazar', aliases: ['kamalganj', 'কমলগঞ্জ'] },
  { id: 'kulaura', nameEn: 'Kulaura', nameBn: 'কুলাউড়া', districtId: 'moulvibazar', aliases: ['kulaura', 'কুলাউড়া', 'কুলাউড়া'] },
  { id: 'sreemangal', nameEn: 'Sreemangal', nameBn: 'শ্রীমঙ্গল', districtId: 'moulvibazar', aliases: ['sreemangal', 'srimangal', 'শ্রীমঙ্গল'] },
  { id: 'rajnagar', nameEn: 'Rajnagar', nameBn: 'রাজনগর', districtId: 'moulvibazar', aliases: ['rajnagar', 'রাজনগর'] },
  { id: 'juri', nameEn: 'Juri', nameBn: 'জুড়ী', districtId: 'moulvibazar', aliases: ['juri', 'জুড়ী', 'জুড়ী'] },

  // ─── Sunamganj (সুনামগঞ্জ) ───
  { id: 'chhatak', nameEn: 'Chhatak', nameBn: 'ছাতক', districtId: 'sunamganj', aliases: ['chhatak', 'ছাতক'] },
  { id: 'derai', nameEn: 'Derai', nameBn: 'দিরাই', districtId: 'sunamganj', aliases: ['derai', 'দিরাই'] },
  { id: 'jagannathpur', nameEn: 'Jagannathpur', nameBn: 'জগন্নাথপুর', districtId: 'sunamganj', aliases: ['jagannathpur', 'জগন্নাথপুর'] },
  { id: 'tahirpur', nameEn: 'Tahirpur', nameBn: 'তাহিরপুর', districtId: 'sunamganj', aliases: ['tahirpur', 'তাহিরপুর', 'টাঙ্গুয়ার হাওর', 'tanguar haor'] },

  // ─── Dinajpur (দিনাজপুর) ───
  { id: 'parbatipur', nameEn: 'Parbatipur', nameBn: 'পার্বতীপুর', districtId: 'dinajpur', aliases: ['parbatipur', 'পার্বতীপুর'] },
  { id: 'birampur', nameEn: 'Birampur', nameBn: 'বিরামপুর', districtId: 'dinajpur', aliases: ['birampur', 'বিরামপুর'] },
  { id: 'phulbari-din', nameEn: 'Phulbari', nameBn: 'ফুলবাড়ী', districtId: 'dinajpur', aliases: ['phulbari dinajpur', 'ফুলবাড়ী দিনাজপুর'] },
  { id: 'hili', nameEn: 'Hakimpur Hili', nameBn: 'হাকিমপুর হিলি', districtId: 'dinajpur', aliases: ['hili', 'হিলি', 'হাকিমপুর'] },

  // ─── Nilphamari (নীলফামারী) ───
  { id: 'saidpur', nameEn: 'Saidpur', nameBn: 'সৈয়দপুর', districtId: 'nilphamari', aliases: ['saidpur', 'sayedpur', 'সৈয়দপুর', 'সৈয়দপুর'] },
  { id: 'domar', nameEn: 'Domar', nameBn: 'ডোমার', districtId: 'nilphamari', aliases: ['domar', 'ডোমার'] },
  { id: 'dimla', nameEn: 'Dimla', nameBn: 'ডিমলা', districtId: 'nilphamari', aliases: ['dimla', 'ডিমলা'] },
  { id: 'jaldhaka', nameEn: 'Jaldhaka', nameBn: 'জলঢাকা', districtId: 'nilphamari', aliases: ['jaldhaka', 'জলঢাকা'] },

  // ─── Narsingdi (নরসিংদী) ───
  { id: 'raipura', nameEn: 'Raipura', nameBn: 'রায়পুরা', districtId: 'narsingdi', aliases: ['raipura', 'রায়পুরা', 'রায়পুরা'] },
  { id: 'shibpur-nar', nameEn: 'Shibpur', nameBn: 'শিবপুর', districtId: 'narsingdi', aliases: ['shibpur', 'শিবপুর'] },
  { id: 'palash', nameEn: 'Palash', nameBn: 'পলাশ', districtId: 'narsingdi', aliases: ['palash', 'পলাশ', 'ঘোড়াশাল', 'ghorashal'] },
  { id: 'monohardi', nameEn: 'Monohardi', nameBn: 'মনোহরদী', districtId: 'narsingdi', aliases: ['monohardi', 'মনোহরদী'] },
  { id: 'belabo', nameEn: 'Belabo', nameBn: 'বেলাবো', districtId: 'narsingdi', aliases: ['belabo', 'বেলাবো'] },

  // ─── Tangail (টাঙ্গাইল) ───
  { id: 'mirzapur', nameEn: 'Mirzapur', nameBn: 'মির্জাপুর', districtId: 'tangail', aliases: ['mirzapur', 'মির্জাপুর'] },
  { id: 'madhupur', nameEn: 'Madhupur', nameBn: 'মধুপুর', districtId: 'tangail', aliases: ['madhupur', 'মধুপুর'] },
  { id: 'ghatail', nameEn: 'Ghatail', nameBn: 'ঘাটাইল', districtId: 'tangail', aliases: ['ghatail', 'ঘাটাইল'] },
  { id: 'kalihati', nameEn: 'Kalihati', nameBn: 'কালিহাতী', districtId: 'tangail', aliases: ['kalihati', 'কালিহাতী'] },
  { id: 'sakhipur', nameEn: 'Sakhipur', nameBn: 'সখিপুর', districtId: 'tangail', aliases: ['sakhipur', 'সখিপুর'] },
  { id: 'bhuapur', nameEn: 'Bhuapur', nameBn: 'ভূঞাপুর', districtId: 'tangail', aliases: ['bhuapur', 'ভূঞাপুর', 'ভুয়াপুর'] },

  // ─── Sirajganj (সিরাজগঞ্জ) ───
  { id: 'shahjadpur', nameEn: 'Shahjadpur', nameBn: 'শাহজাদপুর', districtId: 'sirajganj', aliases: ['shahjadpur', 'শাহজাদপুর'] },
  { id: 'ullahpara', nameEn: 'Ullahpara', nameBn: 'উল্লাপাড়া', districtId: 'sirajganj', aliases: ['ullahpara', 'উল্লাপাড়া', 'উল্লাপাড়া'] },
  { id: 'belkuchi', nameEn: 'Belkuchi', nameBn: 'বেলকুচি', districtId: 'sirajganj', aliases: ['belkuchi', 'বেলকুচি'] },
  { id: 'kazipur', nameEn: 'Kazipur', nameBn: 'কাজীপুর', districtId: 'sirajganj', aliases: ['kazipur', 'কাজীপুর'] },

  // ─── Natore (নাটোর) ───
  { id: 'singra', nameEn: 'Singra', nameBn: 'সিংড়া', districtId: 'natore', aliases: ['singra', 'সিংড়া', 'সিংড়া', 'চলনবিল', 'chalan beel'] },
  { id: 'gurudaspur', nameEn: 'Gurudaspur', nameBn: 'গুরুদাসপুর', districtId: 'natore', aliases: ['gurudaspur', 'গুরুদাসপুর'] },
  { id: 'baraigram', nameEn: 'Baraigram', nameBn: 'বড়াইগ্রাম', districtId: 'natore', aliases: ['baraigram', 'বড়াইগ্রাম', 'বনপাড়া', 'bonpara'] },

  // ─── Faridpur (ফরিদপুর) ───
  { id: 'bhanga', nameEn: 'Bhanga', nameBn: 'ভাঙ্গা', districtId: 'faridpur', aliases: ['bhanga', 'ভাঙ্গা'] },
  { id: 'boalmari', nameEn: 'Boalmari', nameBn: 'বোয়ালমারী', districtId: 'faridpur', aliases: ['boalmari', 'বোয়ালমারী'] },
  { id: 'madhukhali', nameEn: 'Madhukhali', nameBn: 'মধুখালী', districtId: 'faridpur', aliases: ['madhukhali', 'মধুখালী'] },

  // ─── Gopalganj (গোপালগঞ্জ) ───
  { id: 'tungipara', nameEn: 'Tungipara', nameBn: 'টুঙ্গিপাড়া', districtId: 'gopalganj', aliases: ['tungipara', 'টুঙ্গিপাড়া', 'টুঙ্গিপাড়া'] },
  { id: 'kotalipara', nameEn: 'Kotalipara', nameBn: 'কোটালীপাড়া', districtId: 'gopalganj', aliases: ['kotalipara', 'কোটালীপাড়া'] },
  { id: 'kashiani', nameEn: 'Kashiani', nameBn: 'কাশিয়ানী', districtId: 'gopalganj', aliases: ['kashiani', 'কাশিয়ানী'] },

  // ─── Kishoreganj (কিশোরগঞ্জ) ───
  { id: 'bhairab', nameEn: 'Bhairab', nameBn: 'ভৈরব', districtId: 'kishoreganj', aliases: ['bhairab', 'ভৈরব', 'ভৈরব বাজার'] },
  { id: 'bajitpur', nameEn: 'Bajitpur', nameBn: 'বাজিতপুর', districtId: 'kishoreganj', aliases: ['bajitpur', 'বাজিতপুর'] },
  { id: 'mithamain', nameEn: 'Mithamain', nameBn: 'মিঠামইন', districtId: 'kishoreganj', aliases: ['mithamain', 'মিঠামইন'] },
  { id: 'nikli', nameEn: 'Nikli', nameBn: 'নিকলী', districtId: 'kishoreganj', aliases: ['nikli', 'নিকলী', 'নিকলি'] },

  // ─── Madaripur (মাদারীপুর) ───
  { id: 'shibchar', nameEn: 'Shibchar', nameBn: 'শিবচর', districtId: 'madaripur', aliases: ['shibchar', 'শিবচর', 'পদ্মা সেতু'] },
  { id: 'rajoir', nameEn: 'Rajoir', nameBn: 'রাজৈর', districtId: 'madaripur', aliases: ['rajoir', 'রাজৈর'] },
  { id: 'kalkini', nameEn: 'Kalkini', nameBn: 'কালকিনি', districtId: 'madaripur', aliases: ['kalkini', 'কালকিনি'] },

  // ─── Shariatpur (শরীয়তপুর) ───
  { id: 'zanjira', nameEn: 'Zanjira', nameBn: 'জাজিরা', districtId: 'shariatpur', aliases: ['zanjira', 'janjira', 'জাজিরা'] },
  { id: 'naria', nameEn: 'Naria', nameBn: 'নড়িয়া', districtId: 'shariatpur', aliases: ['naria', 'নড়িয়া', 'নড়িয়া'] },
  { id: 'bhedarganj', nameEn: 'Bhedarganj', nameBn: 'ভেদরগঞ্জ', districtId: 'shariatpur', aliases: ['bhedarganj', 'ভেদরগঞ্জ', 'ভেদারগঞ্জ'] },

  // ─── Patuakhali (পটুয়াখালী) ───
  { id: 'kalapara', nameEn: 'Kalapara', nameBn: 'কলাপাড়া', districtId: 'patuakhali', aliases: ['kalapara', 'কলাপাড়া', 'কুয়াকাটা', 'kuakata', 'পায়রা বন্দর', 'payra'] },
  { id: 'bauphal', nameEn: 'Bauphal', nameBn: 'বাউফল', districtId: 'patuakhali', aliases: ['bauphal', 'বাউফল'] },
  { id: 'galachipa', nameEn: 'Galachipa', nameBn: 'গলাচিপা', districtId: 'patuakhali', aliases: ['galachipa', 'গলাচিপা'] },

  // ─── Bhola (ভোলা) ───
  { id: 'char-fasson', nameEn: 'Char Fasson', nameBn: 'চরফ্যাশন', districtId: 'bhola', aliases: ['char fasson', 'charfasson', 'চরফ্যাশন', 'চরফ্যাসন'] },
  { id: 'burhanuddin', nameEn: 'Burhanuddin', nameBn: 'বোরহানউদ্দিন', districtId: 'bhola', aliases: ['burhanuddin', 'বোরহানউদ্দিন'] },
  { id: 'lalmohan', nameEn: 'Lalmohan', nameBn: 'লালমোহন', districtId: 'bhola', aliases: ['lalmohan', 'লালমোহন'] },

  // ─── Kurigram (কুড়িগ্রাম) ───
  { id: 'chilmari', nameEn: 'Chilmari', nameBn: 'চিলমারী', districtId: 'kurigram', aliases: ['chilmari', 'চিলমারী', 'চিলমারি'] },
  { id: 'nageshwari', nameEn: 'Nageshwari', nameBn: 'নাগেশ্বরী', districtId: 'kurigram', aliases: ['nageshwari', 'নাগেশ্বরী'] },
  { id: 'ulipur', nameEn: 'Ulipur', nameBn: 'উলিপুর', districtId: 'kurigram', aliases: ['ulipur', 'উলিপুর'] },
  { id: 'raomari', nameEn: 'Raomari', nameBn: 'রৌমারী', districtId: 'kurigram', aliases: ['raomari', 'রৌমারী'] },

  // ─── Panchagarh (পঞ্চগড়) ───
  { id: 'tetulia', nameEn: 'Tetulia', nameBn: 'তেঁতুলিয়া', districtId: 'panchagarh', aliases: ['tetulia', 'তেঁতুলিয়া', 'তেতুলিয়া', 'বাংলাবান্ধা', 'banglabandha'] },
  { id: 'boda', nameEn: 'Boda', nameBn: 'বোদা', districtId: 'panchagarh', aliases: ['boda', 'বোদা'] },
];
