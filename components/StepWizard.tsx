
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudyData, Language, Lesson, ObservationItem, Segment, BibleVerse, UserProfile } from '../types';
import { UI_STRINGS, VALIDATION_RULES, BOOK_NAMES_ZH, BOOK_NAMES_ZH_HANT } from '../constants';
import { Plus, Trash, CheckCircle2, AlertCircle, Info, ChevronRight, FileText, Send, X, Download, Loader2 } from 'lucide-react';
import { exportToPDF } from '../services/pdfService';

interface Props {
  data: StudyData;
  onChange: (data: StudyData) => void;
  lang: Language;
  lesson: Lesson;
  bibleVerses: BibleVerse[];
  user: UserProfile | null;
  step: number;
  setStep: (s: number) => void;
  onPreview: () => void;
}

const AutoGrowTextArea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, placeholder, className, autoFocus }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`resize-none overflow-hidden block w-full outline-none transition-all ${className}`}
      rows={3}
    />
  );
};

const StepWizard: React.FC<Props> = ({ data, onChange, lang, lesson, bibleVerses, user, step, setStep, onPreview }) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const t = UI_STRINGS[lang];

  const chaptersMap = useMemo(() => {
    const map: Record<number, number[]> = {};
    bibleVerses.forEach(v => {
      if (!map[v.chapter]) map[v.chapter] = [];
      // Push only the verse number to match Record<number, number[]>
      map[v.chapter].push(v.verse);
    });
    return map;
  }, [bibleVerses]);

  const sortedChapters = useMemo(() => Object.keys(chaptersMap).map(Number).sort((a, b) => a - b), [chaptersMap]);

  const subjectCount = useMemo(() => {
    const text = data.step3.trim();
    if (!text) return 0;
    return lang.startsWith('zh') ? text.length : text.split(/\s+/).filter(Boolean).length;
  }, [data.step3, lang]);

  const maxSubjectVal = lang.startsWith('zh') ? VALIDATION_RULES.step3.maxCharsZh : VALIDATION_RULES.step3.maxWordsEn;

  // Early return MUST happen after all hooks (useState, useMemo, etc.) to prevent React error #310
  if (step === 0) return null;

  const triggerVerseScroll = (chapter: number, verse: number) => {
    window.dispatchEvent(new CustomEvent('scroll-to-bible-verse', { detail: { chapter, verse } }));
  };

  const updateData = (updates: Partial<StudyData>) => {
    onChange({ ...data, ...updates, lastUpdated: new Date().toISOString() });
  };

  const validateStep = (s: number): boolean => {
    const errs: string[] = [];
    if (s === 1) {
      if (data.step2.length < VALIDATION_RULES.step2.min || data.step2.length > VALIDATION_RULES.step2.max) errs.push(lang.startsWith('zh') ? `需划分为 ${VALIDATION_RULES.step2.min}-${VALIDATION_RULES.step2.max} 个分段。` : `Require ${VALIDATION_RULES.step2.min}-${VALIDATION_RULES.step2.max} segments.`);
      if (data.step2.some(seg => !seg.summary.trim())) errs.push(lang.startsWith('zh') ? "分段精要不能为空。" : "Segment summary cannot be empty.");
    } else if (s === 2) {
      if (!data.step3.trim()) errs.push(lang.startsWith('zh') ? "主题句不能为空。" : "Subject cannot be empty.");
      else if (subjectCount > maxSubjectVal) errs.push(lang.startsWith('zh') ? `主题句超过 ${maxSubjectVal} 字。` : `Subject exceeds ${maxSubjectVal} words.`);
    } else if (s === 3) {
      if (!data.step4.trim()) errs.push(lang.startsWith('zh') ? "主旨不能为空。" : "Aim cannot be empty.");
    } else if (s === 4) {
      if (!data.step2.every(s => data.step5[s.id]?.trim())) errs.push(lang.startsWith('zh') ? "每个分段都必须有一个应用问题。" : "Each segment must have an application question.");
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <p className="text-[14px] text-gray-500 italic">{t.step2Hint}</p>
      {data.step2.map((seg, idx) => (
        <div key={seg.id} className="p-5 border rounded-2xl bg-white shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[#1A2B3C] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-[12px]">{idx + 1}</span>
              {lang.startsWith('zh') ? '分段' : 'Division'}
            </span>
            <button onClick={() => updateData({ step2: data.step2.filter(s => s.id !== seg.id) })} className="text-gray-300 hover:text-red-500"><Trash size={18} /></button>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Start Reference</span>
              <div className="flex gap-2">
                <select className="w-full p-1.5 border rounded-lg text-[13px]" value={seg.startChapter} onChange={(e) => {
                  const ch = parseInt(e.target.value); const v = chaptersMap[ch]?.[0] || 1;
                  updateData({ step2: data.step2.map(s => s.id === seg.id ? {...s, startChapter: ch, startVerse: v} : s) });
                  triggerVerseScroll(ch, v);
                }}>{sortedChapters.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="w-full p-1.5 border rounded-lg text-[13px]" value={seg.startVerse} onChange={(e) => {
                  const v = parseInt(e.target.value); updateData({ step2: data.step2.map(s => s.id === seg.id ? {...s, startVerse: v} : s) });
                  triggerVerseScroll(seg.startChapter, v);
                }}>{(chaptersMap[seg.startChapter]||[]).map(v => <option key={v} value={v}>{v}</option>)}</select>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">End Reference</span>
              <div className="flex gap-2">
                <select className="w-full p-1.5 border rounded-lg text-[13px]" value={seg.endChapter} onChange={(e) => {
                  const ch = parseInt(e.target.value); const v = chaptersMap[ch]?.[0] || 1;
                  updateData({ step2: data.step2.map(s => s.id === seg.id ? {...s, endChapter: ch, endVerse: v} : s) });
                }}>{sortedChapters.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="w-full p-1.5 border rounded-lg text-[13px]" value={seg.endVerse} onChange={(e) => {
                  const v = parseInt(e.target.value); updateData({ step2: data.step2.map(s => s.id === seg.id ? {...s, endVerse: v} : s) });
                }}>{(chaptersMap[seg.endChapter]||[]).map(v => <option key={v} value={v}>{v}</option>)}</select>
              </div>
            </div>
          </div>
          <AutoGrowTextArea className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl" value={seg.summary} placeholder={lang.startsWith('zh') ? "输入本段精要..." : "Enter division summary..."} onChange={(val) => updateData({ step2: data.step2.map(s => s.id === seg.id ? {...s, summary: val} : s) })} />
        </div>
      ))}
      <button onClick={() => {
        const last = data.step2[data.step2.length - 1]; let startCh = sortedChapters[0] || 1; let startV = chaptersMap[startCh]?.[0] || 1;
        if (last) {
          const vs = chaptersMap[last.endChapter] || []; const idx = vs.indexOf(last.endVerse);
          if (idx < vs.length - 1) { startCh = last.endChapter; startV = vs[idx + 1]; }
          else { const nxtIdx = sortedChapters.indexOf(last.endChapter) + 1; if (nxtIdx < sortedChapters.length) { startCh = sortedChapters[nxtIdx]; startV = chaptersMap[startCh][0]; } else { startCh = last.endChapter; startV = last.endVerse; } }
        }
        updateData({ step2: [...data.step2, { id: Math.random().toString(), startChapter: startCh, startVerse: startV, endChapter: startCh, endVerse: startV, summary: "" }] });
        triggerVerseScroll(startCh, startV);
      }} className="w-full py-3 border border-dashed border-amber-200 rounded-xl text-amber-600 font-bold hover:bg-amber-50 transition-all flex items-center justify-center gap-2"><Plus size={18}/> {lang.startsWith('zh') ? "添加分段" : "Add Division"}</button>
    </div>
  );

  const stepsUI: Record<number, () => React.ReactNode> = {
    1: renderStep2,
    2: () => (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 italic">{t.step3Hint}</p>
        <AutoGrowTextArea className="w-full p-6 border rounded-3xl min-h-[150px] text-[18px] shadow-sm font-medium" value={data.step3} onChange={(val) => updateData({ step3: val })} placeholder={lang.startsWith('zh') ? "输入主题句..." : "Enter subject..."} />
        <div className="flex justify-end"><span className={`text-[12px] px-3 py-1 rounded-full ${subjectCount > maxSubjectVal ? 'text-red-500 bg-red-50' : 'text-gray-400'}`}>{subjectCount} / {maxSubjectVal}</span></div>
      </div>
    ),
    3: () => (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 italic">{t.step4Hint}</p>
        <AutoGrowTextArea className="w-full p-6 border rounded-3xl min-h-[180px] bg-amber-50/20 text-[18px]" value={data.step4} onChange={(val) => updateData({ step4: val })} placeholder={lang.startsWith('zh') ? "输入主旨..." : "Enter aim..."} />
      </div>
    ),
    4: () => (
      <div className="space-y-6">
        {data.step2.map((seg, i) => (
          <div key={seg.id} className="p-6 border rounded-3xl border-l-8 border-l-[#FDB913] space-y-3">
            <div className="flex gap-2 text-[12px] font-black text-gray-400"><span>DIV {i+1}</span><span>{seg.startChapter}:{seg.startVerse}-{seg.endChapter}:{seg.endVerse}</span></div>
            <div className="p-3 bg-gray-50 rounded-xl text-sm italic">{seg.summary}</div>
            <AutoGrowTextArea className="p-4 border rounded-xl min-h-[100px]" value={data.step5[seg.id] || ""} onChange={(v) => updateData({ step5: {...data.step5, [seg.id]: v} })} placeholder={lang.startsWith('zh') ? "输入应用问题..." : "Enter application..."} />
          </div>
        ))}
      </div>
    ),
    5: () => (
       <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-[#1A2B3C]">{lang.startsWith('zh') ? "准备好预览了吗？" : "Ready to preview?"}</h2>
          <p className="text-gray-500 max-w-md">{lang.startsWith('zh') ? "点击下方按钮进入预览页面并导出您的作业。" : "Click the button below to review and export your assignment."}</p>
       </div>
    )
  };

  const renderCurrentStep = () => {
    const component = stepsUI[step];
    if (!component) return <div className="p-10 text-center text-gray-400">Step Not Found</div>;
    return component();
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 md:p-10 bg-white rounded-[40px] shadow-2xl border border-gray-100 min-h-[500px] flex flex-col relative`}>
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4 gap-4 scrollbar-hide">
        <div className="flex gap-2">
          {t.steps.map((_, i) => (
            <div key={i} onClick={() => { if (i >= 0 && (i < step || validateStep(step))) setStep(i); }} className={`h-2 rounded-full cursor-pointer transition-all ${i === step ? 'bg-[#FDB913] w-12' : i < step ? 'bg-green-400 w-6' : 'bg-gray-200 w-6'}`} />
          ))}
        </div>
        <span className="text-[12px] font-black text-blue-500 uppercase tracking-widest">{t.steps[step]}</span>
      </div>

      <div className="flex-1">
        {step < 5 && (
          <div className="mb-8">
            <h2 className="text-3xl font-black text-[#1A2B3C] mb-2">{t.steps[step]}</h2>
            <div className="w-12 h-1.5 bg-blue-500 rounded-full" />
          </div>
        )}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-700 text-sm">
            <AlertCircle className="shrink-0" size={18} /> <span className="font-semibold">{errors[0]}</span>
          </div>
        )}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {renderCurrentStep()}
        </div>
      </div>

      <div className="flex justify-between items-center mt-12 pt-8 border-t">
        <button onClick={() => setStep(step - 1)} className={`font-black text-[15px] px-6 py-3 rounded-xl text-gray-500 hover:bg-gray-50 transition-all`}>{t.back}</button>
        {step < 5 && (
          <button onClick={() => { if (validateStep(step)) setStep(step + 1); }} className="px-10 py-4 bg-[#1A2B3C] text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
            {step === 4 ? t.review : t.next} <ChevronRight size={18} />
          </button>
        )}
        {step === 5 && (
          <button 
            onClick={() => {
              // Final check before previewing: ensure mandatory fields weren't bypassed
              const isDivisionValid = data.step2.length >= VALIDATION_RULES.step2.min && data.step2.length <= VALIDATION_RULES.step2.max;
              const isSubjectValid = data.step3.trim().length > 0 && subjectCount <= maxSubjectVal;
              const isAimValid = data.step4.trim().length > 0;
              const areAppsValid = data.step2.every(s => data.step5[s.id]?.trim());

              if (isDivisionValid && isSubjectValid && isAimValid && areAppsValid) {
                onPreview();
              } else {
                setErrors([lang.startsWith('zh') ? "您的作业尚未完成。请返回前面的步骤检查并填写所有必填项。" : "Your assignment is incomplete. Please go back to check and fill in all required fields."]);
              }
            }} 
            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            {t.preview} <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default StepWizard;
