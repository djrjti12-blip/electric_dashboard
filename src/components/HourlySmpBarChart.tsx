import { useMemo, useState } from 'react';
import type { HourlySmpPoint } from '../types/smp';

interface HourlySmpBarChartProps {
  hourly: HourlySmpPoint[];
  averageSmp: number;
  maxPoint: HourlySmpPoint;
  minPoint: HourlySmpPoint;
  loading?: boolean;
}

export function HourlySmpBarChart({
  hourly,
  averageSmp,
  maxPoint,
  minPoint,
  loading = false,
}: HourlySmpBarChartProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const activePoint = useMemo(() => {
    if (selectedHour !== null) {
      return hourly.find((p) => p.hour === selectedHour) ?? maxPoint;
    }
    return maxPoint;
  }, [hourly, maxPoint, selectedHour]);

  const { yMin, yMax, ticks } = useMemo(() => {
    if (hourly.length === 0) {
      return { yMin: 0, yMax: 200, ticks: [0, 50, 100, 150, 200] };
    }
    const rawMin = Math.min(...hourly.map((h) => h.price));
    const rawMax = Math.max(...hourly.map((h) => h.price));
    const paddedMin = Math.max(0, Math.floor((rawMin - 15) / 10) * 10);
    const paddedMax = Math.ceil((rawMax + 12) / 10) * 10;
    const span = Math.max(40, paddedMax - paddedMin);
    const step = Math.ceil(span / 4 / 5) * 5;
    const finalMax = paddedMin + step * 4;
    return {
      yMin: paddedMin,
      yMax: finalMax,
      ticks: [
        paddedMin,
        paddedMin + step,
        paddedMin + step * 2,
        paddedMin + step * 3,
        finalMax,
      ],
    };
  }, [hourly]);

  const getHeightPercent = (price: number) => {
    const range = Math.max(1, yMax - yMin);
    const pct = ((price - yMin) / range) * 100;
    return Math.min(100, Math.max(4, pct));
  };

  const avgLinePercent = getHeightPercent(averageSmp);
  const diffFromAvg = Number((activePoint.price - averageSmp).toFixed(2));
  const isMaxHour = activePoint.hour === maxPoint.hour;
  const isMinHour = activePoint.hour === minPoint.hour;

  if (loading) {
    return (
      <section
        aria-label="1시~24시 시간대별 SMP 막대 차트"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
          <div className="h-5 w-44 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-64 flex items-end gap-2 pt-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-100 rounded-t animate-pulse"
              style={{ height: `${35 + ((i * 19) % 55)}%` }}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="1시~24시 시간대별 SMP 막대 차트"
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full"
    >
      {/* Header & Active Readout */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            시간대별 SMP 추이 (1시 ~ 24시)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            막대에 마우스를 올리거나 눌러 시간별 가격을 확인하세요
          </p>
        </div>

        {/* Unboxed inline legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-orange-600 inline-block" aria-hidden="true" />
            최고가·선택
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-orange-300 inline-block" aria-hidden="true" />
            평균 이상
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" aria-hidden="true" />
            평균 이하
          </span>
        </div>
      </div>

      {/* Selected Hour Inspector Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 mb-5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="font-semibold text-slate-900 font-mono-num">
            {activePoint.hour}시
          </span>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span>{activePoint.periodLabel} 시간대</span>
          {isMaxHour && (
            <>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="font-medium text-orange-700">오늘 최고가</span>
            </>
          )}
          {isMinHour && (
            <>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="font-medium text-slate-700">오늘 최저가</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono-num">
          <span className="font-bold text-slate-900">
            {activePoint.price.toFixed(2)} 원/kWh
          </span>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <span
            className={
              diffFromAvg >= 0
                ? 'text-xs font-medium text-orange-700'
                : 'text-xs font-medium text-slate-600'
            }
          >
            평균 대비 {diffFromAvg >= 0 ? '+' : ''}
            {diffFromAvg.toFixed(2)}원
          </span>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative flex gap-3 select-none">
        {/* Y-axis scale */}
        <div className="flex flex-col-reverse justify-between h-60 text-[11px] font-mono-num text-slate-400 pr-1 py-0.5 shrink-0 text-right w-9">
          {ticks.map((tick) => (
            <span key={tick} className="leading-none">
              {tick}
            </span>
          ))}
        </div>

        {/* Plot Canvas */}
        <div className="relative flex-1 h-60 border-b border-slate-200">
          {/* Horizontal gridlines */}
          {ticks.map((tick, idx) => {
            const bottomPct = (idx / (ticks.length - 1)) * 100;
            return (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-slate-100 pointer-events-none"
                style={{ bottom: `${bottomPct}%` }}
              />
            );
          })}

          {/* Daily Average Reference Line */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-slate-500/80 z-10 pointer-events-none"
            style={{ bottom: `${avgLinePercent}%` }}
          >
            <span className="absolute right-0 -top-5 bg-white/95 px-1.5 py-0.5 text-[11px] font-mono-num font-medium text-slate-600 border border-slate-200 rounded">
              평균 {averageSmp.toFixed(1)}
            </span>
          </div>

          {/* 24 Hourly Bars */}
          <div
            className="relative z-20 flex items-end justify-between gap-1 sm:gap-1.5 h-full pt-2"
            onMouseLeave={() => setSelectedHour(null)}
          >
            {hourly.map((point) => {
              const heightPct = getHeightPercent(point.price);
              const isSelected = activePoint.hour === point.hour;
              const isPeak = point.hour === maxPoint.hour;
              const isAboveAvg = point.price >= averageSmp;

              let barColorClass = 'bg-slate-300 hover:bg-slate-400';
              if (isSelected || isPeak) {
                barColorClass = 'bg-orange-600 hover:bg-orange-700';
              } else if (isAboveAvg) {
                barColorClass = 'bg-orange-300 hover:bg-orange-400';
              }

              return (
                <button
                  key={point.hour}
                  type="button"
                  onMouseEnter={() => setSelectedHour(point.hour)}
                  onFocus={() => setSelectedHour(point.hour)}
                  onClick={() =>
                    setSelectedHour((prev) =>
                      prev === point.hour ? null : point.hour
                    )
                  }
                  aria-label={`${point.hour}시 SMP ${point.price.toFixed(2)} 원/kWh`}
                  className="group flex-1 h-full flex flex-col justify-end items-center focus:outline-none cursor-pointer"
                >
                  <span
                    className={`w-full rounded-t-[4px] transition-[background-color,transform] duration-150 ${barColorClass} ${
                      isSelected ? 'ring-2 ring-orange-500/35 ring-offset-1' : ''
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis Hour Labels (1~24시) */}
      <div className="flex gap-3 mt-2">
        <div className="w-9 shrink-0" aria-hidden="true" />
        <div className="flex-1 flex justify-between gap-1 sm:gap-1.5">
          {hourly.map((point) => {
            const isSelected = activePoint.hour === point.hour;
            const showOnMobile =
              point.hour === 1 ||
              point.hour === 6 ||
              point.hour === 12 ||
              point.hour === 18 ||
              point.hour === 24;

            return (
              <span
                key={point.hour}
                className={`flex-1 text-center font-mono-num text-[11px] leading-none ${
                  showOnMobile ? 'inline-block' : 'hidden sm:inline-block'
                } ${
                  isSelected
                    ? 'font-bold text-orange-600'
                    : 'text-slate-400'
                }`}
              >
                {point.hour}
              </span>
            );
          })}
        </div>
      </div>

      {/* Time-of-Day Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span>새벽 1~6시</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>오전 7~12시</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>오후 13~18시</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>저녁 19~24시</span>
        </div>
        <span className="font-mono-num text-slate-400">단위: 원/kWh</span>
      </div>
    </section>
  );
}
