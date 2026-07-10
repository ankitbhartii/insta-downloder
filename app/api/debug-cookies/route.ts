import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');
interface Cookie { name: string; value: string }

function parseRawCookieString(raw: string): Cookie[] {
  return raw
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const eq = s.indexOf('=');
      if (eq === -1) return null;
      return { name: s.slice(0, eq).trim(), value: s.slice(eq + 1).trim() };
    })
    .filter(Boolean) as Cookie[];
}

function parseNetscapeCookies(text: string): Cookie[] {
  return text
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const p = l.trim().split('\t');
      return p.length >= 7 ? { name: p[5], value: p[6] } : null;
    })
    .filter(Boolean) as Cookie[];
}

export async function GET() {
  const envRaw = process.env.INSTAGRAM_COOKIES;
  const envPresent = !!envRaw;
  const envLength = envRaw ? envRaw.length : 0;
  const startsWithBracket = envRaw ? envRaw.trim().startsWith('[') : false;

  let parsedCount = 0;
  let parsedNames: string[] = [];

  if (envRaw?.trim()) {
    let parsed: Cookie[] = [];
    if (envRaw.trim().startsWith('[')) {
      try {
        const parsedJson = JSON.parse(envRaw);
        if (Array.isArray(parsedJson)) {
          parsed = parsedJson
            .map((c: any) => (c && c.name && c.value ? { name: c.name, value: c.value } : null))
            .filter(Boolean) as Cookie[];
        }
      } catch (e) {}
    } else {
      parsed = envRaw.includes('\t') ? parseNetscapeCookies(envRaw) : parseRawCookieString(envRaw);
    }
    parsedCount = parsed.length;
    parsedNames = parsed.map(c => c.name);
  }

  const fileExists = fs.existsSync(COOKIES_FILE);

  return NextResponse.json({
    envPresent,
    envLength,
    startsWithBracket,
    parsedCount,
    parsedNames,
    fileExists,
  });
}
