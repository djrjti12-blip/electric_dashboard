import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { RealTimeSupplyResponse } from '../types/smp';

interface ApiErrorPayload {
  error: string;
  code?: string;
  endpoint?: string;
}

export function RealTimePowerSupplySection() {
  const [data, setData] = useState<RealTimeSupplyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorInfo, setErrorInfo] = useState<ApiErrorPayload | null>(null);

  const fetchSupply = useCallback(async () => {
    setLoading(true);
    setErrorInfo(null);

    try {
      const res = await fetch('/api/power-supply');
      const payload = (await res.json()) as
        | RealTimeSupplyResponse
        | ApiErrorPayload;

      if (!res.ok || 'error' in payload) {
        const errPayload = payload as ApiErrorPayload;
        setData(null);
        setErrorInfo({
          error:
            errPayload.error ||
            `요청이 실패했습니다. (HTTP ${res.status})`,
          code: errPayload.code,
          endpoint: errPayload.endpoint,
        });
        return;
      }

      setData(payload as RealTimeSupplyResponse);
    } catch (err) {
      setData(null);
      setErrorInfo({
        error:
          err instanceof Error
            ? `네트워크 오류가 발생했습니다: ${err.message}`
            : '실시간 전력 수급 데이터를 불러오지 못했습니다.',
        code: 'NETWORK_ERROR',
        endpoint:
          'https://apis.data.go.kr/B552115/SmpWithForecastDemand/getSmpWithForecastDemand',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupply();
  }, [fetchSupply]);

  const summary = useMemo(() => {
    if (!data || data.items.length === 0) return null;
    const loads = data.items
      .map((i) => i.forecastLoad)
      .filter((v): v is number => v !== null);
    const smps = data.items
      .map((i) => i.smp)
      .filter((v): v is number => v !== null);

    const maxLoad = loads.length > 0 ? Math.max(...loads) : null;
    const avgLoad =
      loads.length > 0
        ? loads.reduce((acc, v) => acc + v, 0) / loads.length
        : null;
    const avgSmp =
      smps.length > 0
        ? smps.reduce((acc, v) => acc + v, 0) / smps.length
        : null;

    const latestItem = data.items[data.items.length - 1];
    return { maxLoad, avgLoad, avgSmp, latestItem };
  }, [data]);

  return (
    <section
      aria-label="실시간 전력 수급"
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            실시간 전력 수급
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            공공데이터포털 한국전력거래소 API(SmpWithForecastDemand)와 실시간으로 연동된 수요예측 및 시세 정보입니다.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSupply}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : 'text-slate-500'}`}
            aria-hidden="true"
          />
          <span>{loading ? '불러오는 중...' : '새로고침'}</span>
        </button>
      </div>

      {/* Body */}
      <div className="pt-5">
        {loading ? (
          <div className="space-y-4" aria-live="polite">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            </div>
            <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : errorInfo ? (
          <div
            role="alert"
            className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-3"
          >
            <div className="flex items-start gap-2.5 text-red-900">
              <AlertCircle
                className="w-5 h-5 text-red-600 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  실시간 전력 수급 API 연동에 실패했습니다
                </p>
                <p className="text-sm text-red-800 leading-relaxed">
                  {errorInfo.error}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-red-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-red-700">
              <span className="font-mono-num break-all">
                요청 주소: {errorInfo.endpoint ?? 'https://apis.data.go.kr/B552115/SmpWithForecastDemand'}
                {errorInfo.code ? ` · 오류 코드: ${errorInfo.code}` : ''}
              </span>
              <button
                type="button"
                onClick={fetchSupply}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 font-medium hover:bg-red-100/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              조회 기준일(<span className="font-mono-num font-medium">{data.queryDate}</span>)에 해당하는 API 응답 항목이 비어 있습니다.
            </span>
            <span className="font-mono-num text-xs text-slate-400">
              갱신: {data.fetchedAt}
            </span>
          </div>
        ) : data && summary ? (
          <div className="space-y-6">
            {/* Key Supply & Demand Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-5 border-b border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  최대 예측 전력수요
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono-num text-2xl sm:text-3xl font-bold text-slate-900">
                    {summary.maxLoad !== null
                      ? summary.maxLoad.toLocaleString('ko-KR', {
                          maximumFractionDigits: 0,
                        })
                      : '—'}
                  </span>
                  <span className="text-xs font-semibold text-orange-600">
                    MW
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  평균 예측 전력수요
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono-num text-2xl sm:text-3xl font-bold text-slate-900">
                    {summary.avgLoad !== null
                      ? summary.avgLoad.toLocaleString('ko-KR', {
                          maximumFractionDigits: 0,
                        })
                      : '—'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">MW</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  API 기준 평균 SMP
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono-num text-2xl sm:text-3xl font-bold text-slate-900">
                    {summary.avgSmp !== null ? summary.avgSmp.toFixed(2) : '—'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    원/kWh
                  </span>
                </div>
              </div>
            </div>

            {/* Hourly Supply & SMP Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 pr-4 font-medium">권역</th>
                    <th className="py-2.5 px-4 font-medium">거래일자</th>
                    <th className="py-2.5 px-4 font-medium text-right">시간대</th>
                    <th className="py-2.5 px-4 font-medium text-right">
                      예측 전력수요 (MW)
                    </th>
                    <th className="py-2.5 pl-4 font-medium text-right">
                      SMP (원/kWh)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.slice(0, 24).map((item, idx) => (
                    <tr
                      key={`${item.areaName}-${item.tradeDay}-${item.tradeHour}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 pr-4 font-medium text-slate-800">
                        {item.areaName}
                      </td>
                      <td className="py-2.5 px-4 font-mono-num text-slate-600">
                        {item.tradeDay}
                      </td>
                      <td className="py-2.5 px-4 font-mono-num text-right text-slate-700">
                        {item.tradeHour}시
                      </td>
                      <td className="py-2.5 px-4 font-mono-num text-right font-medium text-slate-900">
                        {item.forecastLoad !== null
                          ? item.forecastLoad.toLocaleString('ko-KR', {
                              maximumFractionDigits: 1,
                            })
                          : '—'}
                      </td>
                      <td className="py-2.5 pl-4 font-mono-num text-right font-semibold text-orange-700">
                        {item.smp !== null ? item.smp.toFixed(2) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-400">
              <span className="font-mono-num">
                연동 주소: {data.endpoint}
              </span>
              <span className="font-mono-num">
                기준일: {data.queryDate} · 최종 조회: {data.fetchedAt}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
