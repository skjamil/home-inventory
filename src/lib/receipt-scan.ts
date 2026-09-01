import { createWorker } from 'tesseract.js';
import { parse, isValid, isFuture } from 'date-fns';

export interface ScannedReceipt {
  name?: string;
  price?: number;
  purchaseDate?: string; // yyyy-MM-dd, matches ItemForm's date inputs
}

const DATE_PATTERNS = [
  { regex: /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/, format: 'M/d/yyyy' },
  { regex: /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/, format: 'M/d/yy' },
  { regex: /\b(\d{4}-\d{1,2}-\d{1,2})\b/, format: 'yyyy-M-d' },
  { regex: /\b(\d{1,2}-\d{1,2}-\d{4})\b/, format: 'M-d-yyyy' },
  { regex: /\b([A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4})\b/, format: 'MMM d, yyyy' },
];

const OLDEST_PLAUSIBLE_YEAR = 2000;

// Client-side OCR + best-effort heuristics for auto-filling the Item Create/
// Edit form from a receipt photo — see "Receipt scan auto-fill" in
// docs/DESIGN.md. Never throws: any failure resolves to {} so a bad/unclear
// photo never blocks manual form entry.
export async function scanReceipt(imageUrl: string): Promise<ScannedReceipt> {
  try {
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(imageUrl);
      return parseReceiptText(data.text);
    } finally {
      await worker.terminate();
    }
  } catch {
    return {};
  }
}

function parseReceiptText(text: string): ScannedReceipt {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    name: extractName(lines),
    price: extractPrice(lines),
    purchaseDate: extractDate(text),
  };
}

const MONEY = /\d{1,3}(?:[,.]\d{3})*[.,]\d{2}/g;

function extractPrice(lines: string[]): number | undefined {
  const totalLine = lines.find((l) => /total|amount due|balance/i.test(l));
  const fromTotal = totalLine ? toAmount(totalLine.match(MONEY)?.[0]) : undefined;
  if (fromTotal != null) return fromTotal;

  const all = lines
    .flatMap((l) => l.match(MONEY) ?? [])
    .map(toAmount)
    .filter((n): n is number => n != null);
  return all.length > 0 ? Math.max(...all) : undefined;
}

function toAmount(token?: string | null): number | undefined {
  if (!token) return undefined;
  const normalized = Number(token.replace(/,/g, ''));
  return Number.isFinite(normalized) ? normalized : undefined;
}

function extractDate(text: string): string | undefined {
  for (const { regex, format } of DATE_PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;
    const parsed = parse(match[1], format, new Date());
    if (isValid(parsed) && !isFuture(parsed) && parsed.getFullYear() >= OLDEST_PLAUSIBLE_YEAR) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return undefined;
}

function extractName(lines: string[]): string | undefined {
  const candidate = lines.find(
    (l) =>
      l.length >= 3 &&
      l.length <= 40 &&
      /[a-zA-Z]{3,}/.test(l) &&
      !/^\(?\d{3}\)?[\s.-]?\d{3}/.test(l) &&
      l.match(MONEY) === null
  );
  return candidate;
}
