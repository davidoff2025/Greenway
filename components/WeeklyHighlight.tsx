
import React, { useState, useEffect } from 'react';
import { Lesson, Language } from '../types';
import { UI_STRINGS, BOOK_NAMES_ZH, BOOK_NAMES_ZH_HANT } from '../constants';
// Added Loader2 to the list of imports from lucide-react
import { BookOpen, ChevronRight, Info, Loader2 } from 'lucide-react';
import { fetchBibleText } from '../services/bibleService';

interface Props {
  lesson: Lesson;
  lang: Language;
  onStart: () => void;
}

const WeeklyHighlight: React.FC<Props> = ({ lesson, lang, onStart }) => {
  const [englishVerse, setEnglishVerse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const isZh = lang.startsWith('zh');
  const t = UI_STRINGS[lang];

  useEffect(() => {
    if (lesson.highlightedPassage && !isZh) {
      setIsLoading(true);
      fetchBibleText(lesson.highlightedPassage, 'en').then(verses => {
        if (verses.length > 0) {
          setEnglishVerse(verses.map(v => v.text).join(" "));
        }
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
  }, [lesson, isZh]);

  const getPassageText = (p: any) => {
    if (!p) return "";
    const book = lang === 'zh-hant' 
      ? BOOK_NAMES_ZH_HANT[p.book] 
      : (lang === 'zh-hans' ? BOOK_NAMES_ZH[p.book] : p.book);
    
    const range = p.chapterStart === p.chapterEnd
      ? `${p.chapterStart}:${p.verseStart || 1}–${p.verseEnd || ''}`
      : `${p.chapterStart}:${p.verseStart || 1}–${p.chapterEnd}:${p.verseEnd || ''}`;
    
    return `${book} ${range}`;
  };

  const doctrine = isZh ? lesson.doctrineZh : lesson.doctrineEn;
  const verseText = isZh ? lesson.highlightedVerseZh : englishVerse;

  return (
    <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-8 md:p-12 space-y-10">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
             <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-black text-[11px] uppercase tracking-widest border border-blue-100 shadow-sm">
                {isZh ? `第 ${lesson.id} 课` : `Class ${lesson.id}`}
             </span>
             {doctrine && (
               <span className="flex items-center gap-1.5 text-blue-400 text-[11px] font-black uppercase tracking-wider">
                  <Info size={14} />
                  {doctrine}
               </span>
             )}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-[#1A2B3C] tracking-tight leading-tight">
            {isZh ? lesson.titleZh : lesson.titleEn}
          </h2>
          <div className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">
            {getPassageText(lesson.passage)}
          </div>
        </header>

        <section className="bg-amber-50/50 rounded-[32px] p-8 md:p-10 border border-amber-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <BookOpen size={120} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 text-amber-600 font-black text-[12px] uppercase tracking-[0.2em] mb-4">
              <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
              {t.highlightedScripture}
            </div>

            {isLoading ? (
              <div className="flex items-center gap-3 text-amber-400 font-bold">
                <Loader2 className="animate-spin" size={20} />
                {t.loading}
              </div>
            ) : (
              <>
                <blockquote className="text-[22px] md:text-[26px] text-[#1A2B3C] font-black italic leading-snug tracking-tight">
                  "{verseText || "..."}"
                </blockquote>
                <div className="text-[12px] font-black text-amber-700 bg-white border border-amber-100 px-5 py-2 rounded-full inline-block shadow-sm">
                  {getPassageText(lesson.highlightedPassage)}
                </div>
              </>
            )}
          </div>
        </section>

        <footer className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
           <p className="text-gray-400 text-sm font-medium">
             {isZh ? "完成本周的 5 步分析作业。" : "Complete this week's 5-step analysis assignment."}
           </p>
           <button 
             onClick={onStart}
             className="w-full sm:w-auto px-10 py-5 bg-[#1A2B3C] text-white rounded-[24px] font-black shadow-xl hover:bg-black hover:scale-105 transition-all flex items-center justify-center gap-3 text-[17px]"
           >
             {isZh ? "开始本周作业" : "Go to this week’s assignment"}
             <ChevronRight size={20} />
           </button>
        </footer>
      </div>
    </div>
  );
};

export default WeeklyHighlight;
