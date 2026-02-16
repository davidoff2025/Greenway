
import React, { useState, useEffect } from 'react';
import { StudyData, Language, UserProfile, Segment, BibleVerse } from '../types';
import { UI_STRINGS, CURRICULUM, BOOK_NAMES_ZH, BOOK_NAMES_ZH_HANT } from '../constants';
import { ChevronLeft, CheckCircle2, Download, Loader2, Send, Edit3, BookOpen, Info } from 'lucide-react';
import { exportToPDF } from '../services/pdfService';
import { fetchBibleText } from '../services/bibleService';

interface Props {
  data: StudyData;
  lang: Language;
  onBack: () => void;
  onSubmit: (finalData: StudyData) => Promise<void> | void;
  onComplete: () => void;
  user: UserProfile | null;
}

const ReviewSummary: React.FC<Props> = ({ data, lang, onBack, onSubmit, onComplete, user }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [highlightedVerseEn, setHighlightedVerseEn] = useState<string>("");
  const t = UI_STRINGS[lang];
  const lesson = CURRICULUM.find(l => l.id === data.lessonId);
  const isZh = lang.startsWith('zh');
  const isSubmitted = !!data.submittedAt;

  // Unified headers regardless of language
  const HEADERS = {
    content: "Content（内容）",
    division: "Division（分段）",
    subject: "Subject Sentence（主题句）",
    aim: "Aim（主旨句）",
    application: "Application（应用）",
    doctrine: "Topic / Doctrine (课题/教义)",
    highlighted: "Highlighted Scripture (重点经文)"
  };

  useEffect(() => {
    if (lesson?.highlightedPassage && !isZh) {
      fetchBibleText(lesson.highlightedPassage, 'en').then(verses => {
        if (verses.length > 0) {
          setHighlightedVerseEn(verses.map(v => v.text).join(" "));
        }
      });
    }
  }, [lesson, isZh]);

  const toRoman = (num: number) => {
    const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
    return map[num] || num.toString();
  };

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

  const getFullDivisionRef = (s: Segment) => {
    if (!lesson?.passage) return "";
    const book = lang === 'zh-hant' 
      ? BOOK_NAMES_ZH_HANT[lesson.passage.book] 
      : (lang === 'zh-hans' ? BOOK_NAMES_ZH[lesson.passage.book] : lesson.passage.book);
    
    const range = s.startChapter === s.endChapter
      ? `${s.startChapter}:${s.startVerse}–${s.endVerse}`
      : `${s.startChapter}:${s.startVerse}–${s.endChapter}:${s.endVerse}`;
    
    return `(${book} ${range})`;
  };

  const handleExport = async () => {
    if (!lesson) return;
    setIsExporting(true);
    try {
      const title = lang.startsWith('zh') ? lesson.titleZh : lesson.titleEn;
      const sanitizedTitle = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-');
      const filename = `Lesson-${lesson.id}_${sanitizedTitle}_Homework.pdf`;
      await exportToPDF('review-export-template', filename);
    } catch (err) {
      alert(isZh ? "导出失败，请重试。" : "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setShowSuccessMessage(false);
    try {
      const finalData = { ...data, submittedAt: new Date().toISOString() };
      await onSubmit(finalData);
      setShowSuccessMessage(true);
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      alert(isZh ? "提交失败，请重试。" : "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSimplifiedExportTemplate = () => {
    const exportedTime = new Date().toLocaleString(lang, { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', hour12: false 
    });

    return (
      <div id="review-export-template" className="hidden-export-container p-12 bg-white text-gray-900 font-sans leading-relaxed" style={{ width: '800px', margin: '0 auto' }}>
        <div className="border-b-2 border-gray-900 pb-6 mb-10 space-y-2">
          <div className="flex gap-2"><span className="font-bold min-w-[120px]">{t.pdfClass}:</span><span>{data.lessonId.toString().padStart(2, '0')}</span></div>
          <div className="flex gap-2"><span className="font-bold min-w-[120px]">{t.pdfTopic}:</span><span>{isZh ? lesson?.titleZh : lesson?.titleEn}</span></div>
          <div className="flex gap-2"><span className="font-bold min-w-[120px]">{t.pdfPassage}:</span><span>{getPassageText(lesson?.passage)}</span></div>
          <div className="flex gap-2"><span className="font-bold min-w-[120px]">{t.pdfExported}:</span><span>{exportedTime}</span></div>
          <div className="flex gap-2"><span className="font-bold min-w-[120px]">{t.pdfUser}:</span><span>{user?.name || "Guest"}</span></div>
        </div>

        <section className="mb-10">
          <h3 className="font-bold border-b border-gray-400 mb-4 pb-1 tracking-wider uppercase">{HEADERS.doctrine}</h3>
          <div className="pl-4">
            <p className="font-bold text-lg">{isZh ? lesson?.doctrineZh : lesson?.doctrineEn}</p>
          </div>
        </section>

        {lesson?.highlightedVerseZh && (
          <section className="mb-10">
            <h3 className="font-bold border-b border-gray-400 mb-4 pb-1 tracking-wider uppercase">{HEADERS.highlighted}</h3>
            <div className="pl-4">
              <p className="italic mb-2">"{isZh ? lesson.highlightedVerseZh : highlightedVerseEn}"</p>
              <p className="text-xs font-bold text-gray-500 uppercase">{getPassageText(lesson.highlightedPassage)}</p>
            </div>
          </section>
        )}

        <section className="mb-10">
          <h3 className="font-bold border-b border-gray-400 mb-4 pb-1 tracking-wider uppercase">{HEADERS.content}</h3>
          <div className="pl-4 space-y-4">
            {data.step1.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="font-bold text-xs">{(item as any).ref}</div>
                <div className="flex gap-3 pl-4">
                  <span className="shrink-0">-</span>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="font-bold border-b border-gray-400 mb-4 pb-1 tracking-wider uppercase">{HEADERS.division}</h3>
          <div className="pl-4 space-y-3">
            {data.step2.map((s, idx) => (
              <div key={s.id} className="flex gap-3">
                <span className="shrink-0 font-bold">{toRoman(idx + 1)}.</span>
                <p>{s.summary} {getFullDivisionRef(s)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="font-bold border-b border-gray-400 mb-4 pb-1 tracking-wider uppercase">{HEADERS.subject}</h3>
          <div className="pl-4"><p className="italic">"{data.step3}"</p></div>
        </section>

        <section className="mb-10">
          <h3 className="font-bold border-b border-gray-400 mb-4 pb-1 tracking-wider uppercase">{HEADERS.aim}</h3>
          <div className="pl-4"><p>{data.step4}</p></div>
        </section>

        <section className="mb-10">
          <h3 className="font-bold border-b border-gray-400 mb-4 pb-1 tracking-wider uppercase">{HEADERS.application}</h3>
          <div className="pl-4 space-y-4">
            {data.step2.map((s, idx) => (
              <div key={s.id} className="flex gap-3">
                <span className="shrink-0">{idx + 1}.</span>
                <div>
                  <span className="text-sm font-bold block mb-1">
                    {isZh ? `应用问题#${idx + 1}` : `Application ${idx + 1}`}
                  </span>
                  <p>{data.step5[s.id]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const bookLabel = lesson?.passage?.book ? (lang === 'zh-hans' ? BOOK_NAMES_ZH[lesson.passage.book] : (lang === 'zh-hant' ? BOOK_NAMES_ZH_HANT[lesson.passage.book] : lesson.passage.book)) : "";
  const rangeLabel = lesson?.passage ? (lang.startsWith('zh') ? ` 第 ${lesson.passage.chapterStart} 章 至 第 ${lesson.passage.chapterEnd} 章` : ` Chapters ${lesson.passage.chapterStart}-${lesson.passage.chapterEnd}`) : "";

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold hover:text-[#1A2B3C] transition-colors">
          <ChevronLeft size={20} />
          {t.back}
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all text-[14px]">
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {t.exportPDF}
          </button>
          {isSubmitted && (
            <div className="flex items-center gap-3 px-6 py-2 bg-green-50 text-green-600 rounded-full border border-green-100 font-black text-[14px]">
              <CheckCircle2 size={18} />
              {t.submitted} {` ${new Date(data.submittedAt!).toLocaleDateString()}`}
            </div>
          )}
        </div>
      </div>

      {showSuccessMessage && (
        <div className="mb-8 p-4 bg-green-100 border border-green-200 text-green-700 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300">
          <CheckCircle2 size={24} />
          <span className="font-bold">{t.submitSuccess}</span>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden mb-12">
        <div className="px-10 py-10 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[12px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">
                {isZh ? `第 ${data.lessonId} 课` : `Lesson ${data.lessonId}`}
              </h2>
              <h1 className="text-4xl font-black text-[#1A2B3C] tracking-tight">
                {isZh ? lesson?.titleZh : lesson?.titleEn}
              </h1>
              <div className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
                {bookLabel}{rangeLabel}
              </div>
            </div>
            {(lesson?.doctrineZh || lesson?.doctrineEn) && (
              <div className="text-right">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{isZh ? '教义' : 'DOCTRINE'}</div>
                <div className="text-xl font-black text-blue-600 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">{isZh ? lesson.doctrineZh : lesson.doctrineEn}</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-10 space-y-16">
          {lesson?.highlightedVerseZh && (
             <section className="p-8 bg-amber-50/50 rounded-[32px] border border-amber-100/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-6 bg-amber-500 rounded-full" />
                <h4 className="text-[14px] uppercase font-black text-[#1A2B3C] tracking-[0.2em]">{HEADERS.highlighted}</h4>
              </div>
              <div className="space-y-4">
                 <p className="text-[20px] text-[#1A2B3C] font-bold leading-relaxed italic">
                   "{isZh ? lesson.highlightedVerseZh : (highlightedVerseEn || "Loading English version...")}"
                 </p>
                 <div className="text-[12px] font-black text-amber-600 uppercase tracking-widest bg-white inline-block px-4 py-1.5 rounded-full border border-amber-100 shadow-sm">
                   {getPassageText(lesson.highlightedPassage)}
                 </div>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-blue-500 rounded-full" />
              <h4 className="text-[14px] uppercase font-black text-[#1A2B3C] tracking-[0.2em]">{HEADERS.content}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.step1.map((item, i) => (
                <div key={item.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-black">{i + 1}</span>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{(item as any).ref}</span>
                  </div>
                  <p className="text-[15px] text-gray-700 leading-relaxed pl-9">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 bg-[#F0F7FF] rounded-[32px] border border-blue-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-blue-500 rounded-full" />
              <h4 className="text-[14px] uppercase font-black text-[#1A2B3C] tracking-[0.2em]">{HEADERS.division}</h4>
            </div>
            <div className="space-y-4">
              {data.step2.map((s, i) => (
                <div key={s.id} className="p-6 bg-white rounded-2xl border border-blue-100/30 shadow-sm">
                  <p className="text-[18px] text-gray-800 font-bold leading-relaxed">
                    <span className="mr-2 text-blue-500">{toRoman(i + 1)}.</span>
                    {s.summary}
                    <span className="ml-2 text-[14px] font-normal text-gray-400 italic">{getFullDivisionRef(s)}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="p-8 bg-[#FFF9EB] rounded-[32px] border border-amber-100/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-6 bg-amber-500 rounded-full" />
                <h4 className="text-[14px] uppercase font-black text-[#1A2B3C] tracking-[0.2em]">{HEADERS.subject}</h4>
              </div>
              <div className="p-6 bg-white/80 rounded-2xl border border-amber-100/30 italic text-[19px] text-[#1A2B3C] font-medium leading-relaxed">
                "{data.step3}"
              </div>
            </section>
            <section className="p-8 bg-[#F0FFF4] rounded-[32px] border border-green-100/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-6 bg-green-500 rounded-full" />
                <h4 className="text-[14px] uppercase font-black text-[#1A2B3C] tracking-[0.2em]">{HEADERS.aim}</h4>
              </div>
              <div className="p-6 bg-white/80 rounded-2xl border border-green-100/30 text-[19px] text-gray-800 leading-relaxed font-medium">
                {data.step4}
              </div>
            </section>
          </div>

          <section className="p-8 bg-[#F5F3FF] rounded-[32px] border border-indigo-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-indigo-500 rounded-full" />
              <h4 className="text-[14px] uppercase font-black text-[#1A2B3C] tracking-[0.2em]">{HEADERS.application}</h4>
            </div>
            <div className="space-y-5">
              {data.step2.map((s, i) => (
                <div key={s.id} className="p-6 bg-white border border-indigo-100/30 rounded-2xl flex gap-6 shadow-sm">
                  <div className="shrink-0">
                    <span className="w-10 h-10 rounded-2xl bg-[#1A2B3C] text-white flex items-center justify-center font-black text-[18px] shadow-lg">{i + 1}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                      {isZh ? `应用问题#${i + 1}` : `Application ${i + 1}`}
                    </div>
                    <p className="text-[18px] text-gray-800 leading-relaxed font-bold italic">"{data.step5[s.id]}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 px-6 py-4 text-gray-500 font-black hover:bg-gray-50 rounded-2xl transition-all">
            <Edit3 size={18} />
            {isZh ? "返回修改" : "Back to Edit"}
          </button>
          <div className="flex gap-4">
            <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black shadow-sm hover:bg-gray-200 transition-all">
              {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              {t.exportPDF}
            </button>
            {isSubmitted ? (
              <div className="flex items-center gap-2 px-10 py-4 bg-green-50 text-green-600 rounded-full border border-green-100 font-black text-[14px]">
                <CheckCircle2 size={18} />
                {isZh ? "作业已提交" : "Completed"}
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {t.submit}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none">
        {renderSimplifiedExportTemplate()}
      </div>
    </div>
  );
};

export default ReviewSummary;
