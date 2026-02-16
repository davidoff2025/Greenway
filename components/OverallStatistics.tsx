
import React, { useState } from 'react';
import { Lesson, Language, StudyData, UserProfile } from '../types';
import { CheckCircle2, Clock, ChevronRight, Eye, Info, BookOpen, BarChart3, Timer, Pencil } from 'lucide-react';
import { UI_STRINGS, BOOK_NAMES_ZH, BOOK_NAMES_ZH_HANT } from '../constants';

interface Props {
  lang: Language;
  lessons: Lesson[];
  allData: Record<number, Partial<StudyData>>;
  user: UserProfile | null;
  onReview: (lessonId: number) => void;
  onGoToLesson: (lesson: Lesson) => void;
}

const OverallStatistics: React.FC<Props> = ({ lang, lessons, allData, user, onReview, onGoToLesson }) => {
  const isZh = lang.startsWith('zh');
  const t = UI_STRINGS[lang];
  const [expandedVerseId, setExpandedVerseId] = useState<number | null>(null);

  const getPassageRangeText = (p: any) => {
    if (!p) return "";
    const bookName = lang === 'zh-hans' ? BOOK_NAMES_ZH[p.book] : (lang === 'zh-hant' ? BOOK_NAMES_ZH_HANT[p.book] : p.book);
    const startPart = `${p.chapterStart}${p.verseStart ? `:${p.verseStart}` : ''}`;
    const endPart = `${p.chapterEnd}${p.verseEnd ? `:${p.verseEnd}` : ''}`;
    return `${bookName} ${startPart} – ${endPart}`;
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (isZh) {
      return `${hrs > 0 ? hrs + '小时 ' : ''}${mins > 0 ? mins + '分 ' : ''}${secs}秒`;
    }
    return `${hrs > 0 ? hrs + 'h ' : ''}${mins > 0 ? mins + 'm ' : ''}${secs}s`;
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-[#1A2B3C] tracking-tighter mb-2">
            {isZh ? '课程完成进度' : 'Curriculum Progress'}
          </h2>
          <div className="w-20 h-2 bg-blue-500 rounded-full" />
        </div>
        
        <div className="flex gap-4">
          {user && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                <BarChart3 size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isZh ? '累计访问次数' : 'Total Access Count'}</div>
                <div className="text-2xl font-black text-[#1A2B3C]">{user.accessCount || 0}</div>
              </div>
            </div>
          )}

          {user && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                <Timer size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isZh ? '累计使用时长' : 'Total Duration'}</div>
                <div className="text-2xl font-black text-[#1A2B3C]">{formatDuration(user.totalUsageDuration || 0)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest">{isZh ? '课次' : 'Lesson'}</th>
                <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest">{isZh ? '课程详情' : 'Lesson Details'}</th>
                <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest">{isZh ? '状态' : 'Status'}</th>
                <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-right">{isZh ? '操作' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lessons.map((lesson) => {
                const data = allData[lesson.id];
                const isCompleted = !!data?.submittedAt;
                const isInProgress = !isCompleted && data && (
                  (data.step1 && data.step1.length > 0) || 
                  (data.step3 && data.step3.trim().length > 0) ||
                  (data.step4 && data.step4.trim().length > 0)
                );
                
                const doctrine = isZh ? lesson.doctrineZh : lesson.doctrineEn;

                return (
                  <tr key={lesson.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6 align-top">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[16px] transition-all ${isCompleted ? 'bg-green-100 text-green-600' : isInProgress ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-[#1A2B3C] group-hover:bg-blue-600 group-hover:text-white'}`}>
                        {lesson.id}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1 max-w-xl">
                        <span className="font-bold text-[#1A2B3C] text-[17px]">
                          {isZh ? lesson.titleZh : lesson.titleEn}
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          {doctrine && (
                            <div className="flex items-center gap-1.5 text-blue-500 text-[12px] font-black uppercase tracking-wider">
                              <Info size={14} />
                              {doctrine}
                            </div>
                          )}
                          <div className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">
                            {getPassageRangeText(lesson.passage)}
                          </div>
                        </div>

                        {lesson.highlightedVerseZh && (
                          <div className="mt-4">
                            <button 
                              onClick={() => setExpandedVerseId(expandedVerseId === lesson.id ? null : lesson.id)}
                              className="flex items-center gap-2 text-[11px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors"
                            >
                              <BookOpen size={14} />
                              {isZh ? '重点经文' : 'Highlighted Scripture'}
                            </button>
                            {expandedVerseId === lesson.id && (
                              <div className="mt-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[14px] text-amber-900 leading-relaxed italic animate-in fade-in zoom-in-95 duration-200">
                                {lesson.highlightedVerseZh}
                                <div className="mt-2 text-[11px] font-black opacity-60">
                                  {getPassageRangeText(lesson.highlightedPassage)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {isCompleted && (
                          <span className="text-[11px] text-gray-400 mt-2 uppercase font-bold tracking-wider">
                            {isZh ? '提交于' : 'Submitted at'} {new Date(data!.submittedAt!).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 align-top">
                      {isCompleted ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 font-bold text-[13px]">
                          <CheckCircle2 size={14} />
                          {isZh ? '已完成' : 'Completed'}
                        </div>
                      ) : isInProgress ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 font-bold text-[13px]">
                          <Pencil size={14} />
                          {isZh ? '进行中' : 'In Progress'}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 font-bold text-[13px]">
                          <Clock size={14} />
                          {isZh ? '未开始' : 'Not Started'}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right align-top">
                      <div className="flex items-center justify-end gap-3">
                        {(isCompleted || isInProgress) ? (
                          <>
                            <button 
                              onClick={() => onReview(lesson.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-100 text-blue-600 rounded-xl font-bold text-[14px] hover:bg-blue-50 transition-all shadow-sm"
                            >
                              <Eye size={16} />
                              {isZh ? '回顾' : 'Review'}
                            </button>
                            {!isCompleted && (
                              <button 
                                onClick={() => onGoToLesson(lesson)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1A2B3C] text-white rounded-xl font-bold text-[14px] hover:bg-black transition-all shadow-md group-hover:translate-x-1"
                              >
                                {isZh ? '继续' : 'Continue'}
                                <ChevronRight size={16} />
                              </button>
                            )}
                          </>
                        ) : (
                          <button 
                            onClick={() => onGoToLesson(lesson)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1A2B3C] text-white rounded-xl font-bold text-[14px] hover:bg-black transition-all shadow-md group-hover:translate-x-1"
                          >
                            {isZh ? '去学习' : 'Go to Lesson'}
                            <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverallStatistics;
