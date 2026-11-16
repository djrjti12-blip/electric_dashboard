export type SmpRegion = 'land' | 'jeju';

export interface HourlySmpPoint {
  hour: number; // 1 ~ 24
  price: number; // 원/kWh
  periodLabel: '새벽' | '오전' | '오후' | '저녁';
}

export interface SmpDateOption {
  date: string; // YYYY-MM-DD
  label: string; // e.g., 2026년 11월 15일 (일)
  dayType: '평일' | '주말';
}

export interface SmpDailyReport {
  date: string;
  dateLabel: string;
  dayType: '평일' | '주말';
  region: SmpRegion;
  regionLabel: '육지' | '제주';
  averageSmp: number;
  previousAverageSmp: number;
  deltaFromPrev: number;
  deltaPercent: number;
  maxPoint: HourlySmpPoint;
  minPoint: HourlySmpPoint;
  spread: number;
  hourly: HourlySmpPoint[];
  sourceName: string;
  updatedAt: string;
}

export interface AiSmpExplanation {
  headline: string;
  paragraphs: string[];
  conceptTitle: string;
  conceptBody: string;
}

export interface RealTimeSupplyItem {
  areaName: string;
  tradeDay: string;
  tradeHour: number;
  smp: number | null;
  forecastLoad: number | null;
}

export interface RealTimeSupplyResponse {
  endpoint: string;
  fetchedAt: string;
  queryDate: string;
  totalCount: number;
  items: RealTimeSupplyItem[];
}

