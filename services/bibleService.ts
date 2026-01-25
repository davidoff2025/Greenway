
import { BiblePassage, Language, BibleVerse } from '../types';
import { BOOK_IDS } from '../constants';

/**
 * Bolls.life Translation Codes:
 * CUVS - Chinese Union Version Simplified
 * CUV  - Chinese Union Version Traditional
 */

async function fetchFromBolls(translation: string, bookId: number, chapter: number): Promise<BibleVerse[]> {
  const url = `https://bolls.life/get-chapter/${translation}/${bookId}/${chapter}/`;
  console.log(`[BibleService] Requesting Bolls: ${translation} Book:${bookId} Ch:${chapter}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[BibleService] Bolls ${translation} returned ${response.status}`);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn(`[BibleService] Bolls ${translation} unexpected response format`);
      return [];
    }
    return data.map((v: any) => ({
      chapter,
      verse: v.verse,
      text: v.text.replace(/<[^>]*>?/gm, '').trim()
    }));
  } catch (e) {
    console.error(`[BibleService] Bolls ${translation} fetch error:`, e);
    return [];
  }
}

async function fetchFromBibleApi(book: string, range: string, translation: string): Promise<BibleVerse[]> {
  const url = `https://bible-api.com/${encodeURIComponent(book + ' ' + range)}?translation=${translation}`;
  console.log(`[BibleService] Falling back to Bible-API: ${translation} Range:${range}`);
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.verses || []).map((v: any) => ({
      chapter: v.chapter,
      verse: v.verse,
      text: v.text.trim().replace(/\n/g, ' ')
    }));
  } catch (e) {
    console.error(`[BibleService] Bible-API error:`, e);
    return [];
  }
}

export async function fetchBibleText(passage: BiblePassage, lang: Language): Promise<BibleVerse[]> {
  const { book, chapterStart, chapterEnd, verseStart, verseEnd } = passage;
  const bookId = BOOK_IDS[book];
  
  console.log(`[BibleService] Starting fetch for UI Language: ${lang}`);

  const rangeStr = chapterStart === chapterEnd 
    ? `${chapterStart}${verseStart ? `:${verseStart}-${verseEnd}` : ''}`
    : `${chapterStart}${verseStart ? `:${verseStart}` : ''}-${chapterEnd}${verseEnd ? `:${verseEnd}` : ''}`;

  if (lang.startsWith('zh')) {
    // Determine translation order based on specific Chinese variant
    // zh-hans (Simplified) -> CUVS primary
    // zh-hant (Traditional) -> CUV primary
    const primaryTrans = lang === 'zh-hans' ? 'CUVS' : 'CUV';
    const secondaryTrans = lang === 'zh-hans' ? 'CUV' : 'CUVS';

    console.log(`[BibleService] Chinese Mode: Primary=${primaryTrans}, Secondary=${secondaryTrans}`);

    for (const trans of [primaryTrans, secondaryTrans]) {
      let results: BibleVerse[] = [];
      let allChaptersSuccess = true;

      for (let ch = chapterStart; ch <= chapterEnd; ch++) {
        const verses = await fetchFromBolls(trans, bookId, ch);
        if (verses.length === 0) {
          allChaptersSuccess = false;
          break;
        }
        
        let filtered = verses;
        if (ch === chapterStart && verseStart) {
          filtered = filtered.filter(v => v.verse >= verseStart);
        }
        if (ch === chapterEnd && verseEnd) {
          filtered = filtered.filter(v => v.verse <= verseEnd);
        }
        results.push(...filtered);
      }

      if (allChaptersSuccess && results.length > 0) {
        console.log(`[BibleService] Success: Loaded ${results.length} verses from Bolls (${trans})`);
        return results;
      }
    }

    // Bible-API "cuv" is usually Traditional. 
    // If we are here, Bolls failed (likely CORS or downtime).
    console.warn(`[BibleService] Bolls failed for both Chinese versions. Final fallback to Bible-API.`);
    return await fetchFromBibleApi(book, rangeStr, 'cuv');
  }

  // English Flow
  console.log(`[BibleService] English Mode: Requesting ESV`);
  const esvResult = await fetchFromBibleApi(book, rangeStr, 'esv');
  if (esvResult.length > 0) {
    console.log(`[BibleService] Success: Loaded from ESV`);
    return esvResult;
  }
  
  console.log(`[BibleService] ESV Failed. Fallback to WEB`);
  return await fetchFromBibleApi(book, rangeStr, 'web');
}
