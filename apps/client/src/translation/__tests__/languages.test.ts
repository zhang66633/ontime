import { langEn } from 'ontime-types';

import { langDe } from '../languages/de';
import { langEs } from '../languages/es';
import { langFr } from '../languages/fr';
import { langIt } from '../languages/it';
import { langPt } from '../languages/pt';
import { langZh } from '../languages/zh';

const languages = { de: langDe, en: langEn, es: langEs, fr: langFr, it: langIt, pt: langPt, zh: langZh };
const referenceKeys = Object.keys(langEn).sort();

describe('Translation language packs', () => {
  test.each(Object.keys(languages))('language %s covers every translation key', (lang) => {
    expect(Object.keys(languages[lang as keyof typeof languages]).sort()).toStrictEqual(referenceKeys);
  });

  test.each(Object.keys(languages))('language %s has no empty strings', (lang) => {
    const entries = Object.entries(languages[lang as keyof typeof languages]);
    const empties = entries.filter(([, value]) => value.trim() === '').map(([key]) => key);
    expect(empties).toStrictEqual([]);
  });

  test('Chinese pack is translated, not a copy of English', () => {
    const copied = Object.keys(langEn).filter((key) => langZh[key as keyof typeof langZh] === langEn[key as keyof typeof langEn]);
    expect(copied).toStrictEqual([]);
  });
});
