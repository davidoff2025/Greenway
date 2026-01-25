
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CURRICULUM, UI_STRINGS, BOOK_NAMES_ZH, BOOK_NAMES_ZH_HANT, VALIDATION_RULES } from './constants';
import { StudyData, Language, UserProfile, Lesson, BibleVerse, ObservationItem } from './types';
import { driveService } from './services/googleDriveService';
import { fetchBibleText } from './services/bibleService';
import StepWizard from './components/StepWizard';
import OverallStatistics from './components/OverallStatistics';
import ReviewSummary from './components/ReviewSummary';
import WeeklyHighlight from './components/WeeklyHighlight';
import { Cloud, Globe, ChevronDown, Loader2, Check, BarChart2, Plus, AlertCircle, X, ChevronRight, Home as HomeIcon, User as UserIcon, Mail } from 'lucide-react';

const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com";

type ViewMode = 'study' | 'stats' | 'review';

/**
 * Calculates the current weekly lesson ID based on a Monday-rotation logic.
 */
function getCurrentClassNumber(): number {
  const FALLBACK = 16;
  try {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const y = currentMonday.getFullYear();
    const m = String(currentMonday.getMonth() + 1).padStart(2, '0');
    const d = String(currentMonday.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const match = CURRICULUM.find(l => l.weekStart === dateStr);
    if (match) return match.id;

    const baselineMonday = new Date(2026, 0, 12); 
    baselineMonday.setHours(0, 0, 0, 0);
    const msPerWeek = 604800000;
    const diffInMs = currentMonday.getTime() - baselineMonday.getTime();
    const diffInWeeks = Math.floor((diffInMs + 43200000) / msPerWeek);
    
    if (isNaN(diffInWeeks)) return FALLBACK;
    let lessonId = 16 + diffInWeeks;
    if (lessonId > 29) return 29;
    if (lessonId < 1) return 1;
    return lessonId;
  } catch (e) {
    return FALLBACK;
  }
}

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh-hans');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [tempProfile, setTempProfile] = useState({ name: '', email: '' });
  
  const defaultWeeklyLesson = useMemo(() => {
    const id = getCurrentClassNumber();
    const lesson = CURRICULUM.find(l => l.id === id);
    return lesson || CURRICULUM[15]; 
  }, []);

  const [currentLesson, setCurrentLesson] = useState<Lesson>(defaultWeeklyLesson);
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [bibleVerses, setBibleVerses] = useState<BibleVerse[]>([]);
  const [isLoadingBible, setIsLoadingBible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [step, setStep] = useState(0); 
  
  const [viewMode, setViewMode] = useState<ViewMode>('study');
  const [reviewSource, setReviewSource] = useState<'study' | 'stats'>('study');
  const [reviewData, setReviewData] = useState<StudyData | null>(null);
  const [allLessonsData, setAllLessonsData] = useState<Record<number, Partial<StudyData>>>({});
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const bibleContainerRef = useRef<HTMLDivElement>(null);
  const t = UI_STRINGS[lang];

  // Identity logic
  useEffect(() => {
    const saved = localStorage.getItem('bsf_user_profile');
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      setShowIdentityModal(true);
    }
  }, []);

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProfile.name || !tempProfile.email) return;
    const profile: UserProfile = {
      name: tempProfile.name,
      email: tempProfile.email,
      picture: '' // Placeholder
    };
    localStorage.setItem('bsf_user_profile', JSON.stringify(profile));
    setUser(profile);
    setShowIdentityModal(false);
  };

  const chaptersMap = useMemo(() => {
    const map: Record<number, number[]> = {};
    bibleVerses.forEach(v => {
      if (!map[v.chapter]) map[v.chapter] = [];
      map[v.chapter].push(v.verse);
    });
    return map;
  }, [bibleVerses]);

  const sortedChapters = useMemo(() => Object.keys(chaptersMap).map(Number).sort((a, b) => a - b), [chaptersMap]);

  useEffect(() => {
    const handleScrollEvent = (e: any) => {
      const { chapter, verse } = e.detail;
      const verseId = `v-${chapter}-${verse}`;
      const element = document.getElementById(verseId);
      const container = bibleContainerRef.current;
      if (element && container) {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const isVisible = (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom);
        if (!isVisible) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    window.addEventListener('scroll-to-bible-verse', handleScrollEvent);
    return () => window.removeEventListener('scroll-to-bible-verse', handleScrollEvent);
  }, []);

  const highlightVerse = useCallback((text: string) => {
    if (!studyData?.step1 || studyData.step1.length === 0) return text;
    
    // Extract non-empty observation text, ignore very short strings (like single letters) for sanity
    const keywords = studyData.step1
      .map(item => item.text.trim())
      .filter(t => t.length > 1)
      .sort((a, b) => b.length - a.length); // Match longer phrases first

    if (keywords.length === 0) return text;

    try {
      // Escape special characters for regex
      const pattern = keywords
        .map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      
      const regex = new RegExp(`(${pattern})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="bg-yellow-200 px-0.5 rounded font-bold text-[#1A2B3C] shadow-sm">
            {part}
          </span>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  }, [studyData?.step1]);

  const getPassageLabel = useCallback(() => {
    if (!currentLesson.passage) return "";
    const p = currentLesson.passage;
    let bookName = p.book;
    if (lang === 'zh-hans') bookName = BOOK_NAMES_ZH[p.book] || p.book;
    if (lang === 'zh-hant') bookName = BOOK_NAMES_ZH_HANT[p.book] || p.book;
    if (lang.startsWith('zh')) {
      if (p.chapterStart === p.chapterEnd) {
        return `${bookName} 第 ${p.chapterStart} 章${p.verseStart ? ` ${p.verseStart}-${p.verseEnd}` : ""}`;
      }
      return `${bookName} 第 ${p.chapterStart} 章 至 第 ${p.chapterEnd} 章`;
    } else {
      if (p.chapterStart === p.chapterEnd) {
        return `${bookName} ${p.chapterStart}${p.verseStart ? `:${p.verseStart}-${p.verseEnd}` : ""}`;
      }
      return `${bookName} Chapters ${p.chapterStart}-${p.chapterEnd}`;
    }
  }, [currentLesson, lang]);

  const initStudyData = useCallback((lessonId: number): StudyData => {
    return {
      lessonId,
      step1: [],
      step2: [],
      step3: "",
      step4: "",
      step5: {},
      lastUpdated: new Date().toISOString(),
    };
  }, []);

  useEffect(() => {
    if (currentLesson.passage) {
      setIsLoadingBible(true);
      setBibleVerses([]);
      fetchBibleText(currentLesson.passage, lang).then(verses => {
        setBibleVerses(verses);
        setIsLoadingBible(false);
      }).catch(err => {
        setIsLoadingBible(false);
      });
    } else {
      setBibleVerses([]);
    }
  }, [currentLesson, lang]);

  useEffect(() => {
    const remoteLoad = async () => {
      if (driveService && user) {
        try {
          const remoteData = await driveService.loadStudyData(currentLesson.id);
          if (remoteData) {
            setStudyData(remoteData);
            if (remoteData.submittedAt) {
              setAllLessonsData(prev => ({ ...prev, [currentLesson.id]: { submittedAt: remoteData.submittedAt } }));
            }
          } else {
            setStudyData(initStudyData(currentLesson.id));
          }
        } catch (e) {
          setStudyData(initStudyData(currentLesson.id));
        }
      }
    };
    if (user) remoteLoad();
    else {
      const local = localStorage.getItem(`study_${currentLesson.id}`);
      setStudyData(local ? JSON.parse(local) : initStudyData(currentLesson.id));
    }
  }, [currentLesson, user, initStudyData]);

  const handleDataChange = async (newData: StudyData): Promise<void> => {
    setStudyData(newData);
    localStorage.setItem(`study_${currentLesson.id}`, JSON.stringify(newData));
    if (newData.submittedAt) {
      setAllLessonsData(prev => ({ ...prev, [newData.lessonId]: { submittedAt: newData.submittedAt } }));
      if (viewMode === 'review') {
        setReviewData(newData);
      }
    }
    if (user && driveService.hasToken()) {
      setIsSaving(true);
      try {
        await driveService.saveStudyData(newData);
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    }
    return Promise.resolve();
  };

  const recalculateObservationRefs = useCallback((items: ObservationItem[]): ObservationItem[] => {
    if (bibleVerses.length === 0) return items;
    const itemsWithMeta = items.map(item => {
      const parts = (item as any).ref.split(' – ');
      const endPart = parts[1] || parts[0]; 
      const [ch, v] = endPart.split(':').map(Number);
      const endIdx = bibleVerses.findIndex(bv => bv.chapter === ch && bv.verse === v);
      return { item, endIdx, endPart };
    });
    itemsWithMeta.sort((a, b) => a.endIdx - b.endIdx);
    return itemsWithMeta.map((meta, i) => {
      let startVerse = bibleVerses[0];
      if (i > 0) {
        const prevEndIdx = itemsWithMeta[i - 1].endIdx;
        if (prevEndIdx !== -1 && prevEndIdx < bibleVerses.length - 1) {
          startVerse = bibleVerses[prevEndIdx + 1];
        } else {
          startVerse = bibleVerses[prevEndIdx] || bibleVerses[0];
        }
      }
      const newRef = `${startVerse.chapter}:${startVerse.verse} – ${meta.endPart}`;
      return { ...meta.item, ref: newRef };
    });
  }, [bibleVerses]);

  const addItemAtVerse = (chapter: number, verse: number) => {
    if (!studyData) return;
    if (studyData.step1.length >= 20) {
      alert(lang.startsWith('zh') ? "最多只能添加 20 项内容。" : "You can add up to 20 content items.");
      return;
    }
    const newItem: ObservationItem = { id: Math.random().toString(), text: "" };
    (newItem as any).ref = `? – ${chapter}:${verse}`;
    const newList = [...studyData.step1, newItem];
    const updatedList = recalculateObservationRefs(newList);
    handleDataChange({ ...studyData, step1: updatedList });
    setTimeout(() => {
      const inputs = document.querySelectorAll('.inline-content-input');
      const lastInput = inputs[inputs.length - 1] as HTMLTextAreaElement;
      if (lastInput) lastInput.focus();
    }, 50);
  };

  const deleteItem = (id: string) => {
    if (!studyData) return;
    const filtered = studyData.step1.filter(x => x.id !== id);
    const updated = recalculateObservationRefs(filtered);
    handleDataChange({ ...studyData, step1: updated });
  };

  const handlePreview = useCallback(() => {
    if (!studyData) return;
    setReviewData(studyData);
    setReviewSource('study');
    setViewMode('review');
  }, [studyData]);

  const handleReviewLesson = async (lessonId: number) => {
    setIsReviewLoading(true);
    try {
      let data: StudyData | null = null;
      if (user && driveService.hasToken()) data = await driveService.loadStudyData(lessonId);
      if (!data) {
        const local = localStorage.getItem(`study_${lessonId}`);
        if (local) data = JSON.parse(local);
      }
      if (data) {
        setReviewData(data);
        setReviewSource('stats');
        setViewMode('review');
      } else {
        alert(lang.startsWith('zh') ? `未找到第 ${lessonId} 课的已保存作业。` : `No saved homework found for Lesson ${lessonId}.`);
      }
    } catch (err) {
      alert(lang.startsWith('zh') ? "加载作业失败，请稍后重试。" : "Failed to load homework. Please try again.");
    } finally {
      setIsReviewLoading(false);
    }
  };

  const renderBibleContent = () => {
    if (isLoadingBible) return <div className="py-32 text-center text-gray-400">Loading...</div>;
    if (bibleVerses.length === 0) return <div className="py-32 text-center text-gray-400">No Passage.</div>;
    const groupedVerses = bibleVerses.reduce((acc, v) => {
      if (!acc[v.chapter]) acc[v.chapter] = [];
      acc[v.chapter].push(v);
      return acc;
    }, {} as Record<number, BibleVerse[]>);
    const chapters = Object.keys(groupedVerses).map(Number).sort((a, b) => a - b);
    return (
      <div className="space-y-12 pb-24">
        {chapters.map((ch) => (
          <div key={ch}>
            <div className="mb-6 flex items-center gap-4">
              <span className="text-sm font-black text-[#FDB913] uppercase tracking-[0.2em] whitespace-nowrap">
                {lang.startsWith('zh') ? `第 ${ch} 章` : `Chapter ${ch}`}
              </span>
              <div className="h-px bg-gray-100 w-full" />
            </div>
            <div className="space-y-6">
              {groupedVerses[ch].map((v, i) => {
                const associatedItems = studyData?.step1.filter(item => (item as any).ref?.endsWith(`${ch}:${v.verse}`)) || [];
                return (
                  <div key={i} id={`v-${v.chapter}-${v.verse}`} className="relative group">
                    <div className="flex items-start gap-3">
                      <sup className="mt-2 shrink-0 font-bold text-[#FDB913] text-[12px] opacity-80">{v.verse}</sup>
                      <span className="flex-1 text-[17px] leading-relaxed text-gray-800 italic">
                        {highlightVerse(v.text)}
                      </span>
                      {step === 1 && (
                        <button 
                          onClick={() => addItemAtVerse(v.chapter, v.verse)}
                          className="mt-1 shrink-0 p-1.5 rounded-lg bg-blue-50 text-blue-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-100 shadow-sm"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                    {associatedItems.length > 0 && (
                      <div className="mt-5 ml-8 space-y-5">
                        {associatedItems.map(item => (
                          <div key={item.id} className="p-5 bg-blue-50/60 border border-blue-200 rounded-2xl shadow-sm border-l-4 border-l-blue-400 space-y-3">
                             <div className="flex justify-between items-center">
                               <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] px-3 py-1 bg-white border border-blue-100 rounded-full">
                                 {(item as any).ref}
                               </span>
                               <button onClick={() => deleteItem(item.id)} className="text-blue-300 hover:text-red-500 p-1 rounded-lg">
                                 <X size={14} />
                               </button>
                             </div>
                             <textarea
                               className="inline-content-input w-full p-2 bg-transparent outline-none border-none text-[16px] resize-none text-gray-800 leading-relaxed placeholder:text-blue-300 focus:ring-0"
                               rows={2}
                               value={item.text}
                               onChange={(e) => {
                                 const newList = studyData!.step1.map(x => x.id === item.id ? {...x, text: e.target.value} : x);
                                 handleDataChange({...studyData!, step1: newList});
                               }}
                               placeholder={lang.startsWith('zh') ? "在这里记录观察到的事实..." : "Record the observed facts here..."}
                             />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {step === 1 && (
          <div className="mt-16 pt-8 border-t flex justify-between items-center bg-white sticky bottom-0 z-40 p-6 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`px-4 py-2 rounded-full font-black text-[12px] border ${studyData!.step1.length > 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-white text-gray-400 border-gray-100'}`}>
                {studyData!.step1.length} / {VALIDATION_RULES.step1.max}
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t.steps[0]}</span>
            </div>
            <button 
              onClick={() => setStep(2)} 
              className="px-10 py-4 bg-[#1A2B3C] text-white rounded-2xl font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              {t.next} <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isReviewLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <p className="text-gray-500 font-bold">{lang.startsWith('zh') ? "正在加载作业内容..." : "Loading homework data..."}</p>
        </div>
      );
    }
    switch (viewMode) {
      case 'stats':
        return (
          <OverallStatistics 
            lang={lang} 
            lessons={CURRICULUM} 
            allData={allLessonsData} 
            onReview={handleReviewLesson} 
            onGoToLesson={(l) => { 
              setCurrentLesson(l); 
              setStep(0); 
              setViewMode('study'); 
            }} 
          />
        );
      case 'review':
        if (!reviewData) {
          setViewMode('stats');
          return null;
        }
        return (
          <ReviewSummary 
            data={reviewData} 
            lang={lang} 
            onBack={() => setViewMode(reviewSource)} 
            onSubmit={handleDataChange}
            onComplete={() => setViewMode('stats')}
            user={user} 
          />
        );
      case 'study':
      default:
        if (step === 0) {
          return (
            <div className="max-w-4xl mx-auto py-8 lg:py-16 animate-in fade-in duration-700">
               <WeeklyHighlight lesson={currentLesson} lang={lang} onStart={() => setStep(1)} />
            </div>
          );
        }
        const BibleSidebar = (
          <aside className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">
              <div className="px-8 py-6 border-b bg-gray-50 flex flex-col gap-2">
                <h2 className="font-bold flex items-center gap-2 text-gray-500 text-[12px] uppercase tracking-[0.2em]">
                  <div className="w-1.5 h-4 bg-[#FDB913] rounded-full" /> {t.bible}
                </h2>
                <div className="text-2xl font-extrabold text-[#1A2B3C] tracking-tight">{getPassageLabel()}</div>
              </div>
              <div ref={bibleContainerRef} className="flex-1 px-8 py-10 overflow-y-auto bg-white max-h-[80vh]">
                <div className="max-w-[900px] mx-auto scripture-content">
                  {renderBibleContent()}
                </div>
              </div>
            </div>
          </aside>
        );
        if (step === 1) {
          return <div className="max-w-5xl mx-auto h-full animate-in fade-in duration-500">{BibleSidebar}</div>;
        }
        return (
          <div className="study-grid h-full transition-all duration-500">
            {BibleSidebar}
            <section className="h-fit lg:sticky lg:top-24">
              {studyData && (
                <StepWizard 
                  data={studyData} onChange={handleDataChange} lang={lang} lesson={currentLesson}
                  bibleVerses={bibleVerses} user={user} step={step - 1} setStep={(s) => setStep(s + 1)} onPreview={handlePreview}
                />
              )}
            </section>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm h-16 md:h-20">
        <div className="max-w-[1600px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setViewMode('study'); setStep(0); setCurrentLesson(defaultWeeklyLesson); }} className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-[#1A2B3C]">
              <HomeIcon size={24} />
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2" />
             <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                  <span className="font-bold text-[14px] md:text-[16px] text-[#1A2B3C] truncate max-w-[120px] lg:max-w-[400px]">
                    {lang.startsWith('zh') ? `第 ${currentLesson.id} 课: ${currentLesson.titleZh}` : `Lesson ${currentLesson.id}: ${currentLesson.titleEn}`}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                <div className="absolute left-0 top-full mt-1 w-80 max-h-[450px] overflow-y-auto bg-white border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                  {CURRICULUM.map(l => (
                    <button key={l.id} onClick={() => { setCurrentLesson(l); setStep(0); setViewMode('study'); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0">{lang.startsWith('zh') ? `第 ${l.id} 课: ${l.titleZh}` : `Lesson ${l.id}: ${l.titleEn}`}</button>
                  ))}
                </div>
              </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[14px] border transition-colors ${viewMode === 'stats' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>
              <BarChart2 size={18} /> <span className="hidden lg:inline">{lang.startsWith('zh') ? '总计统计' : 'Overall Statistics'}</span>
            </button>
            <div className="relative group">
                <button onClick={() => setIsLangOpen(!isLangOpen)} className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-600 flex items-center gap-2 px-3 border border-gray-100">
                  <Globe size={18} /> <span className="text-[12px] font-bold uppercase tracking-wider hidden sm:inline">{t.langName}</span>
                </button>
                {isLangOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-xl z-[70] py-2 overflow-hidden">
                    {[{key:'en', name:'English'},{key:'zh-hans', name:'简体中文'},{key:'zh-hant', name:'繁體中文'}].map(l => (
                      <button key={l.key} onClick={() => { setLang(l.key as Language); setIsLangOpen(false); }} className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${lang === l.key ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}>{l.name}</button>
                    ))}
                  </div>
                )}
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-gray-600">{user.name}</span>
              </div>
            ) : (
              <div id="google-signin-btn"></div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:px-12">{renderContent()}</main>

      {showIdentityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-300">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-[#1A2B3C] tracking-tight mb-2">
                {lang.startsWith('zh') ? "欢迎学习" : "Welcome"}
              </h2>
              <p className="text-gray-500 font-medium">
                {lang.startsWith('zh') ? "请输入您的信息以开始记录作业。" : "Please enter your details to start recording homework."}
              </p>
            </div>
            <form onSubmit={handleSaveIdentity} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <UserIcon size={12} /> {lang.startsWith('zh') ? "您的姓名" : "Full Name"}
                </label>
                <input 
                  type="text" required value={tempProfile.name} 
                  onChange={e => setTempProfile(p => ({...p, name: e.target.value}))}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  placeholder={lang.startsWith('zh') ? "例如：张三" : "e.g. John Doe"}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Mail size={12} /> {lang.startsWith('zh') ? "电子邮箱" : "Email Address"}
                </label>
                <input 
                  type="email" required value={tempProfile.email} 
                  onChange={e => setTempProfile(p => ({...p, email: e.target.value}))}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  placeholder="john@example.com"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-[#1A2B3C] text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                {lang.startsWith('zh') ? "进入系统" : "Get Started"} <ChevronRight size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
