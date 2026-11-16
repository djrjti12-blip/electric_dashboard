import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  getAvailableDateOptions,
  getSmpDailyReport,
} from './server/smpData.ts';
import type {
  AiSmpExplanation,
  RealTimeSupplyItem,
} from './src/types/smp.ts';

const PORT = 3000;
const app = express();
app.use(express.json());

const aiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

app.get('/api/smp/dates', (_req, res) => {
  res.json({ dates: getAvailableDateOptions() });
});

app.get('/api/smp', (req, res) => {
  const dateParam = typeof req.query.date === 'string' ? req.query.date : undefined;
  const regionParam =
    typeof req.query.region === 'string' ? req.query.region : 'land';
  const report = getSmpDailyReport(dateParam, regionParam);
  res.json(report);
});

const KPX_BASE_URL = 'https://apis.data.go.kr/B552115/SmpWithForecastDemand';
const KPX_OPERATION_URL = `${KPX_BASE_URL}/getSmpWithForecastDemand`;

function readKpxApiKey(): string {
  const candidateFiles = ['.env.local', '.env'];
  for (const filename of candidateFiles) {
    const envPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(envPath)) {
      try {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
        const fileKey =
          parsed.KPX_API_KEY ||
          parsed.DATA_GO_KR_API_KEY ||
          parsed.PUBLIC_DATA_API_KEY ||
          parsed.SERVICE_KEY ||
          parsed.VITE_KPX_API_KEY ||
          '';
        if (fileKey.trim()) {
          return fileKey.trim();
        }
      } catch {
        // Fall through to next source
      }
    }
  }

  return (
    process.env.KPX_API_KEY ||
    process.env.DATA_GO_KR_API_KEY ||
    process.env.PUBLIC_DATA_API_KEY ||
    process.env.SERVICE_KEY ||
    process.env.VITE_KPX_API_KEY ||
    ''
  ).trim();
}

function getKstTodayYyyymmdd(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts.replace(/-/g, '');
}

function extractXmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function toNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

app.get('/api/power-supply', async (req, res) => {
  const apiKey = readKpxApiKey();
  if (!apiKey || apiKey === 'MY_KPX_API_KEY') {
    res.status(400).json({
      code: 'MISSING_API_KEY',
      endpoint: KPX_OPERATION_URL,
      error:
        '인증키가 설정되지 않았습니다. 프로젝트 루트의 .env 파일에 KPX_API_KEY 값을 입력한 뒤 다시 불러오기를 눌러주세요.',
    });
    return;
  }

  const rawDateParam =
    typeof req.query.date === 'string'
      ? req.query.date.replace(/-/g, '').trim()
      : '';
  const queryDate =
    /^\d{8}$/.test(rawDateParam) ? rawDateParam : getKstTodayYyyymmdd();

  const encodedServiceKey = apiKey.includes('%')
    ? apiKey
    : encodeURIComponent(apiKey);

  const queryParams = new URLSearchParams({
    pageNo: '1',
    numOfRows: '48',
    dataType: 'json',
    date: queryDate,
  });

  const requestUrl = `${KPX_OPERATION_URL}?serviceKey=${encodedServiceKey}&${queryParams.toString()}`;

  try {
    const upstream = await fetch(requestUrl, {
      method: 'GET',
      headers: { Accept: 'application/json, application/xml, text/xml' },
      signal: AbortSignal.timeout(10000),
    });

    const rawBody = await upstream.text();

    if (!upstream.ok) {
      res.status(502).json({
        code: `HTTP_${upstream.status}`,
        endpoint: KPX_OPERATION_URL,
        error: `외부 API 서버가 오류 응답(HTTP ${upstream.status})을 반환했습니다. ${rawBody.slice(0, 200)}`.trim(),
      });
      return;
    }

    // Handle XML error responses returned by data.go.kr gateway even when dataType=json
    if (rawBody.trim().startsWith('<')) {
      const errMsg = extractXmlTag(rawBody, 'errMsg');
      const returnAuthMsg = extractXmlTag(rawBody, 'returnAuthMsg');
      const returnReasonCode = extractXmlTag(rawBody, 'returnReasonCode');
      const resultCode = extractXmlTag(rawBody, 'resultCode');
      const resultMsg = extractXmlTag(rawBody, 'resultMsg');

      const detailCode = errMsg || returnReasonCode || resultCode || 'XML_ERROR';
      const detailText =
        returnAuthMsg || resultMsg || errMsg || 'XML 형식의 오류 응답이 반환되었습니다.';

      res.status(502).json({
        code: detailCode,
        endpoint: KPX_OPERATION_URL,
        error: `${detailText} (코드: ${detailCode})`,
      });
      return;
    }

    const parsed = JSON.parse(rawBody) as Record<string, unknown>;

    // Check OpenAPI_ServiceResponse gateway errors in JSON format
    const serviceError = (parsed.OpenAPI_ServiceResponse as Record<string, unknown> | undefined)
      ?.cmmMsgHeader as Record<string, string> | undefined;
    if (serviceError) {
      const code =
        serviceError.errMsg || serviceError.returnReasonCode || 'SERVICE_ERROR';
      const msg =
        serviceError.returnAuthMsg ||
        serviceError.errMsg ||
        '공공데이터포털 API 인증 또는 호출 오류가 발생했습니다.';
      res.status(502).json({
        code,
        endpoint: KPX_OPERATION_URL,
        error: `${msg} (코드: ${code})`,
      });
      return;
    }

    const responseObj = parsed.response as
      | {
          header?: { resultCode?: string; resultMsg?: string };
          body?: {
            totalCount?: number;
            items?: { item?: unknown } | string;
          };
        }
      | undefined;

    const header = responseObj?.header;
    if (header && header.resultCode && header.resultCode !== '00') {
      res.status(502).json({
        code: header.resultCode,
        endpoint: KPX_OPERATION_URL,
        error: `${header.resultMsg || 'API 응답 오류'} (resultCode: ${header.resultCode})`,
      });
      return;
    }

    const rawItemsContainer = responseObj?.body?.items;
    const rawItem =
      typeof rawItemsContainer === 'object' && rawItemsContainer !== null
        ? rawItemsContainer.item
        : undefined;

    const itemList: Record<string, unknown>[] = Array.isArray(rawItem)
      ? (rawItem as Record<string, unknown>[])
      : rawItem && typeof rawItem === 'object'
        ? [rawItem as Record<string, unknown>]
        : [];

    const items: RealTimeSupplyItem[] = itemList.map((row) => ({
      areaName: String(row.areaName ?? row.areaNm ?? '전국'),
      tradeDay: String(row.tradeDay ?? row.date ?? queryDate),
      tradeHour: Number(row.tradeHour ?? row.hour ?? 0),
      smp: toNumberOrNull(row.smp ?? row.landSmp),
      forecastLoad: toNumberOrNull(row.forecastLoad ?? row.forecastDemand),
    }));

    res.json({
      endpoint: KPX_OPERATION_URL,
      fetchedAt: new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour12: false,
      }),
      queryDate,
      totalCount: Number(responseObj?.body?.totalCount ?? items.length),
      items,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : '공공데이터포털 API 요청 중 네트워크 오류가 발생했습니다.';
    res.status(502).json({
      code: 'FETCH_ERROR',
      endpoint: KPX_OPERATION_URL,
      error: `API 호출에 실패했습니다: ${message}`,
    });
  }
});

app.post('/api/smp/explain', async (req, res) => {
  const dateParam = typeof req.body?.date === 'string' ? req.body.date : undefined;
  const regionParam =
    typeof req.body?.region === 'string' ? req.body.region : 'land';
  const report = getSmpDailyReport(dateParam, regionParam);

  if (!aiClient) {
    res.status(503).json({
      error:
        'GEMINI_API_KEY 환경 변수가 설정되지 않아 AI 해설을 생성할 수 없습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
    });
    return;
  }

  const hourlySummary = report.hourly
    .map((h) => `${h.hour}시:${h.price}원`)
    .join(', ');

  const prompt = [
    `당신은 한국 전력시장 입문자를 위한 친절한 에너지 시장 해설가입니다.`,
    `아래 데이터를 바탕으로 오늘의 전기 도매 시세(SMP)를 초보자도 한눈에 이해할 수 있도록 쉽게 설명해 주세요.`,
    ``,
    `- 날짜: ${report.dateLabel} (${report.dayType})`,
    `- 권역: ${report.regionLabel}`,
    `- 하루 평균 SMP: ${report.averageSmp} 원/kWh (전일 ${report.previousAverageSmp}원 대비 ${report.deltaFromPrev >= 0 ? '+' : ''}${report.deltaFromPrev}원, ${report.deltaPercent >= 0 ? '+' : ''}${report.deltaPercent}%)`,
    `- 최고가 시간대: ${report.maxPoint.hour}시 (${report.maxPoint.price} 원/kWh)`,
    `- 최저가 시간대: ${report.minPoint.hour}시 (${report.minPoint.price} 원/kWh)`,
    `- 일중 가격 변동폭: ${report.spread} 원/kWh`,
    `- 시간대별 SMP (1시~24시): ${hourlySummary}`,
    ``,
    `작성 지침:`,
    `1. headline: 그날 시세의 핵심 특징을 담은 1문장 요약 (35자 내외, 마침표 제외 가능).`,
    `2. paragraphs: 2~3개의 자연스러운 한국어 문단. 첫 문단에서는 전일 대비 흐름과 전반적인 수준을 짚고, 둘째 문단에서는 왜 최저가 시간대(예: 새벽 저부하 또는 낮 시간대 태양광 발전 증가)에 가격이 내려가고 최고가 시간대(예: 출근·조업 시간대 또는 저녁 난방·조명 피크)에 올라가는지 입문자 눈높이로 설명하세요. 전문 용어는 괄호로 쉽게 풀어주세요.`,
    `3. conceptTitle: 오늘 차트와 가장 관련 깊은 전력시장 입문 키워드 1개 (예: "계통한계가격(SMP)", "오후 태양광 하락(덕 커브)", "저녁 첨두부하").`,
    `4. conceptBody: 해당 키워드를 비유나 쉬운 표현으로 2문장 이내로 설명.`,
  ].join('\n');

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description: '오늘 전기 시세의 핵심 요약 한 줄',
            },
            paragraphs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '입문자를 위한 2~3개의 쉬운 시세 해설 문단',
            },
            conceptTitle: {
              type: Type.STRING,
              description: '오늘 차트와 연관된 전력시장 입문 개념 제목',
            },
            conceptBody: {
              type: Type.STRING,
              description: '입문 개념에 대한 쉬운 설명',
            },
          },
          required: ['headline', 'paragraphs', 'conceptTitle', 'conceptBody'],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'AI 해설 응답이 비어 있습니다. 다시 시도해 주세요.' });
      return;
    }

    const parsed = JSON.parse(rawText) as AiSmpExplanation;
    res.json(parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'AI 해설을 생성하는 중 오류가 발생했습니다.';
    console.error('Gemini API error:', err);
    res.status(500).json({
      error: `AI 해설 요청 중 문제가 발생했습니다: ${message}`,
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
