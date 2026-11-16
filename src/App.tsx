import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  Minus,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { HourlySmpBarChart } from './components/HourlySmpBarChart';
import { AiCommentaryPanel } from './components/AiCommentaryPanel';
import { RealTimePowerSupplySection } from './components/RealTimePowerSupplySection';
import type {
  AiSmpExplanation,
  SmpDailyReport,
  SmpDateOption,
  SmpRegion,
} from './types/smp';

export default function App() {
  const [dateOptions, setDateOptions] = useState<SmpDateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [region, setRegion] = useState<SmpRegion>('land');
  const [report, setReport] = useState<SmpDailyReport | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const [explanation, setExplanation] = useState<AiSmpExplanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDates() {
      try {
        const res = await fetch('/api/smp/dates');
        if (!res.ok) throw new Error('날짜 목록을 불러오지 못했습니다.');
        const data = (await res.json()) as { dates: SmpDateOption[] };
        if (active && data.dates.length > 0) {
          setDateOptions(data.dates);
          setSelectedDate(data.dates[0].date);
        }
      } catch (err) {
        if (active) {
          setReportError(
            err instanceof Error ? err.message : '초기 데이터를 불러오지 못했습니다.'
          );
          setLoadingReport(false);
        }
      }
    }
    loadDates();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    let active = true;
    setLoadingReport(true);
    setReportError(null);
    // Clear previous date's AI explanation so it matches the newly selected date/region
    setExplanation(null);
    setExplanationError(null);

    async function loadReport() {
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          region,
        });
        const res = await fetch(`/api/smp?${params.toString()}`);
        if (!res.ok) throw new Error('시간대별 SMP 시세를 불러오지 못했습니다.');
        const data = (await res.json()) as SmpDailyReport;
        if (active) {
          setReport(data);
        }
      } catch (err) {
        if (active) {
          setReportError(
            err instanceof Error ? err.message : '시세 조회 중 오류가 발생했습니다.'
          );
        }
      } finally {
        if (active) {
          setLoadingReport(false);
        }
      }
    }
    loadReport();
    return () => {
      active = false;
    };
  }, [selectedDate, region]);

  const handleGenerateExplanation = useCallback(async () => {
    if (!report) return;
    setLoadingExplanation(true);
    setExplanationError(null);

    try {
      const res = await fetch('/api/smp/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: report.date,
          region: report.region,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : 'AI 해설을 생성하지 못했습니다.'
        );
      }
      setExplanation(payload as AiSmpExplanation);
    } catch (err) {
      setExplanationError(
        err instanceof Error ? err.message : 'AI 해설 요청 중 오류가 발생했습니다.'
      );
    } finally {
      setLoadingExplanation(false);
    }
  }, [report]);

  const deltaPositive = (report?.deltaFromPrev ?? 0) > 0;
  const deltaNegative = (report?.deltaFromPrev ?? 0) < 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title Zone */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0"
              aria-hidden="true"
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                오늘의 전기 시세
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                전력시장 입문자를 위한 시간대별 계통한계가격(SMP) 대시보드
              </p>
            </div>
          </div>

          {/* Controls Zone: Region Segmented Switch + Date Dropdown */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div
              role="group"
              aria-label="권역 선택"
              className="inline-flex items-center p-1 bg-slate-100 rounded-xl"
            >
              <button
                type="button"
                onClick={() => setRegion('land')}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  region === 'land'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                육지
              </button>
              <button
                type="button"
                onClick={() => setRegion('jeju')}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  region === 'jeju'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                제주
              </button>
            </div>

            <div className="relative">
              <label htmlFor="smp-date-select" className="sr-only">
                날짜 선택
              </label>
              <select
                id="smp-date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={dateOptions.length === 0}
                className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-4 pr-10 py-2.5 min-h-[42px] text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors cursor-pointer"
              >
                {dateOptions.map((option) => (
                  <option key={option.date} value={option.date}>
                    {option.label} · {option.dayType}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {reportError && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
          >
            {reportError}
          </div>
        )}

        {/* Middle Grid: Left Big Average Card + Right 1~24h Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Middle Left: Daily Average SMP Big Number Card */}
          <section
            aria-label="하루 평균 SMP 요약"
            className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">하루 평균 SMP</span>
                {report && (
                  <span className="font-mono-num text-xs text-slate-400">
                    {report.regionLabel} · {report.dayType}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                전력시장에서 1시간 단위로 정산되는 도매 전기 평균 단가
              </p>

              {/* Big Number */}
              {loadingReport || !report ? (
                <div className="mt-8 mb-6 space-y-3">
                  <div className="h-14 w-48 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-5 w-36 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : (
                <div className="mt-7 mb-6">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono-num text-5xl xl:text-[54px] font-bold tracking-tight text-slate-900 leading-none">
                      {report.averageSmp.toFixed(2)}
                    </span>
                    <span className="text-lg font-semibold text-orange-600 whitespace-nowrap">
                      원/kWh
                    </span>
                  </div>

                  {/* Delta vs Yesterday */}
                  <div className="mt-4 flex items-center gap-1.5 text-sm">
                    {deltaPositive ? (
                      <>
                        <TrendingUp
                          className="w-4 h-4 text-orange-600 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-slate-700">
                          어제보다{' '}
                          <strong className="font-mono-num font-semibold text-orange-700">
                            +{report.deltaFromPrev.toFixed(2)}원 (+{report.deltaPercent}%)
                          </strong>{' '}
                          상승
                        </span>
                      </>
                    ) : deltaNegative ? (
                      <>
                        <TrendingDown
                          className="w-4 h-4 text-slate-600 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-slate-700">
                          어제보다{' '}
                          <strong className="font-mono-num font-semibold text-slate-900">
                            {report.deltaFromPrev.toFixed(2)}원 ({report.deltaPercent}%)
                          </strong>{' '}
                          하락
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus
                          className="w-4 h-4 text-slate-500 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-slate-600">어제와 동일한 수준</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clean 3-row Key Stats */}
            <div className="border-t border-slate-100 pt-4 divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">최고가 시간</span>
                {loadingReport || !report ? (
                  <span className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <span className="font-mono-num font-semibold text-orange-700">
                    {report.maxPoint.hour}시 · {report.maxPoint.price.toFixed(2)}원
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">최저가 시간</span>
                {loadingReport || !report ? (
                  <span className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <span className="font-mono-num font-semibold text-slate-800">
                    {report.minPoint.hour}시 · {report.minPoint.price.toFixed(2)}원
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <span className="text-slate-500">일중 가격차</span>
                {loadingReport || !report ? (
                  <span className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <span className="font-mono-num font-medium text-slate-700">
                    {report.spread.toFixed(2)} 원/kWh
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Middle Right: 1시~24시 Bar Chart */}
          <div className="lg:col-span-8">
            <HourlySmpBarChart
              hourly={report?.hourly ?? []}
              averageSmp={report?.averageSmp ?? 0}
              maxPoint={
                report?.maxPoint ?? { hour: 19, price: 0, periodLabel: '저녁' }
              }
              minPoint={
                report?.minPoint ?? { hour: 4, price: 0, periodLabel: '새벽' }
              }
              loading={loadingReport || !report}
            />
          </div>
        </div>

        {/* Bottom: AI Commentary Button & Paragraph Area */}
        <AiCommentaryPanel
          report={report}
          explanation={explanation}
          loading={loadingExplanation}
          error={explanationError}
          onGenerate={handleGenerateExplanation}
        />

        {/* Real-Time Power Supply Section */}
        <RealTimePowerSupplySection />
      </main>

      {/* Footer: Source Attribution */}
      <footer className="border-t border-slate-200/80 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            출처: {report?.sourceName ?? '전력거래소(KPX) 전력통계정보시스템(EPSIS) 계통한계가격(SMP) 기준 참고 데이터'}
          </p>
          <p className="font-mono-num text-slate-400">
            기준 통화·단위: 원/kWh · 입문자 교육용 대시보드
          </p>
        </div>
      </footer>
    </div>
  );
}
