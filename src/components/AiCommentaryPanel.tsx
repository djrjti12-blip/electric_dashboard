import { Sparkles, RotateCw, AlertCircle } from 'lucide-react';
import type { AiSmpExplanation, SmpDailyReport } from '../types/smp';

interface AiCommentaryPanelProps {
  report: SmpDailyReport | null;
  explanation: AiSmpExplanation | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function AiCommentaryPanel({
  report,
  explanation,
  loading,
  error,
  onGenerate,
}: AiCommentaryPanelProps) {
  return (
    <section
      aria-label="AI 시세 해설"
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7"
    >
      {/* Top Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            AI 시세 해설
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            선택한 날짜의 시간대별 SMP 움직임을 전력시장 입문자 눈높이로 쉽게 설명해 드립니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || !report}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          {loading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>해설 작성 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{explanation ? 'AI 해설 다시 생성' : 'AI 해설'}</span>
            </>
          )}
        </button>
      </div>

      {/* Commentary Area */}
      <div className="pt-5">
        {loading ? (
          <div className="space-y-3 py-2" aria-live="polite">
            <div className="h-5 w-2/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
            <p className="text-xs text-slate-400 pt-1">
              {report?.dateLabel} ({report?.regionLabel}) 시세 데이터를 분석하고 있습니다...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onGenerate}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 font-medium hover:bg-red-100/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        ) : explanation ? (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              {explanation.headline}
            </h3>

            <div className="space-y-3 max-w-4xl">
              {explanation.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[15px] leading-relaxed text-slate-700"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3 text-sm">
              <span className="font-semibold text-orange-700 shrink-0">
                입문자 용어 메모 · {explanation.conceptTitle}
              </span>
              <span className="text-slate-600 leading-relaxed">
                {explanation.conceptBody}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <p className="text-sm text-slate-600 leading-relaxed">
              오른쪽 상단의 <strong className="font-semibold text-orange-600">AI 해설</strong> 버튼을 누르면{' '}
              <span className="font-medium text-slate-900">
                {report ? `${report.dateLabel} (${report.regionLabel})` : '선택한 날짜'}
              </span>
              의 시간별 전기 도매가격이 왜 특정 시간에 오르고 내렸는지, 전력시장 입문자도 이해하기 쉽게 풀어서 알려드립니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
