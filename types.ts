
export type Language = 'en' | 'zh-hans' | 'zh-hant';

export interface BiblePassage {
  book: string;
  chapterStart: number;
  verseStart?: number;
  chapterEnd: number;
  verseEnd?: number;
}

export interface Lesson {
  id: number;
  titleEn: string;
  titleZh: string;
  passage?: BiblePassage;
  isOptional?: boolean;
  doctrineEn?: string;
  doctrineZh?: string;
  highlightedPassage?: BiblePassage;
  highlightedVerseZh?: string;
  weekStart?: string; // ISO date format YYYY-MM-DD
}

export interface ObservationItem {
  id: string;
  text: string;
}

export interface Segment {
  id: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  summary: string;
}

export interface StudyData {
  lessonId: number;
  step1: ObservationItem[]; // Observation List
  step2: Segment[];         // Segmentation with full refs
  step3: string;            // Topic Sentence
  step4: string;            // Main Idea / Aim
  step5: Record<string, string>; // Life Application (mapped by segment ID)
  submittedAt?: string;     // ISO timestamp of submission
  lastUpdated: string;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  accessCount?: number;
  totalUsageDuration?: number; // In seconds
}

export interface LogEntry {
  timestamp: string;
  name: string;
  lessonId: number;
  ip: string;
  userAgent: string;
}

export interface BibleVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleResponse {
  verses: BibleVerse[];
  translation_name: string;
}
