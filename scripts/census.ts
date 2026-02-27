#!/usr/bin/env tsx
/**
 * Botswana Law MCP -- Census Script (botswanalaws.com Scraping)
 *
 * Scrapes the legislation listing pages from botswanalaws.com to enumerate
 * ALL acts across all categories. Writes data/census.json in golden standard format.
 *
 * Categories scraped:
 *   - Principal Legislation (~354 acts)
 *   - Subsidiary Legislation (~257 acts)
 *   - Constitution of Botswana (1 act)
 *   - Acts on Notice (~16 acts)
 *   - Repealed Acts (~42 acts)
 *   - Local Government Subsidiary (~218 acts)
 *
 * The site has a partial paywall: ~20% of sections are visible for free.
 * We ingest what is publicly available.
 *
 * Source: https://botswanalaws.com/
 *
 * Usage:
 *   npx tsx scripts/census.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRateLimit } from './lib/fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CENSUS_PATH = path.resolve(__dirname, '../data/census.json');

/* ----- Jurisdiction constants ----- */
const JURISDICTION = 'BW';
const JURISDICTION_NAME = 'Botswana';
const PORTAL = 'https://botswanalaws.com';

/* ----- Category definitions ----- */
interface Category {
  name: string;
  path: string;
  status: 'in_force' | 'amended' | 'repealed';
  category: 'act' | 'subsidiary' | 'constitution';
}

const CATEGORIES: Category[] = [
  {
    name: 'Principal Legislation',
    path: '/consolidated-statutes/principle-legislation',
    status: 'in_force',
    category: 'act',
  },
  {
    name: 'Subsidiary Legislation',
    path: '/consolidated-statutes/subsidiary-legislation',
    status: 'in_force',
    category: 'subsidiary',
  },
  {
    name: 'Constitution',
    path: '/consolidated-statutes/constitution-of-botswana',
    status: 'in_force',
    category: 'constitution',
  },
  {
    name: 'Acts on Notice',
    path: '/consolidated-statutes/acts-on-notice',
    status: 'in_force',
    category: 'act',
  },
  {
    name: 'Repealed Acts',
    path: '/consolidated-statutes/repealed-acts',
    status: 'repealed',
    category: 'act',
  },
  {
    name: 'Local Government Subsidiary',
    path: '/consolidated-statutes/local-government-subsidiary',
    status: 'in_force',
    category: 'subsidiary',
  },
];

/* ---------- Types ---------- */

interface CensusLawEntry {
  id: string;
  title: string;
  identifier: string;
  url: string;
  category_path: string;
  status: 'in_force' | 'amended' | 'repealed';
  category: 'act' | 'subsidiary' | 'constitution';
  classification: 'ingestable' | 'excluded' | 'inaccessible';
  ingested: boolean;
  provision_count: number;
  ingestion_date: string | null;
}

interface CensusFile {
  schema_version: string;
  jurisdiction: string;
  jurisdiction_name: string;
  portal: string;
  census_date: string;
  agent: string;
  summary: {
    total_laws: number;
    ingestable: number;
    ocr_needed: number;
    inaccessible: number;
    excluded: number;
  };
  laws: CensusLawEntry[];
}

interface ScrapedAct {
  title: string;
  slug: string;
  categoryPath: string;
}

/* ---------- Helpers ---------- */

/**
 * Convert an act title and slug to a stable kebab-case ID.
 * E.g. "principle-legislation/abolition-of-marital-power" -> "bw-act-abolition-of-marital-power"
 */
function slugToId(slug: string, category: string): string {
  // Remove category prefix to get just the act slug
  const actSlug = slug.replace(/^.*\//, '');
  const prefix = category === 'constitution' ? 'bw-constitution' :
                 category === 'subsidiary' ? 'bw-sub' : 'bw-act';
  return `${prefix}-${actSlug}`;
}

/**
 * Convert a slug to a title-case identifier.
 */
function slugToIdentifier(slug: string): string {
  return slug.replace(/^.*\//, '').replace(/-/g, ' ');
}

/**
 * Scrape act entries from a listing page HTML.
 * Extracts links matching the category path pattern.
 */
function scrapeListingPage(html: string, categoryPath: string): ScrapedAct[] {
  const acts: ScrapedAct[] = [];
  // Match links with the category path
  const escapedPath = categoryPath.replace(/\//g, '\\/');
  const linkPattern = new RegExp(
    `<a[^>]+href="${escapedPath}/([^"]+)"[^>]*>\\s*([^<]+?)\\s*</a>`,
    'gs',
  );

  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html)) !== null) {
    const slug = match[1].trim();
    let title = match[2]
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    // Skip year sub-pages (e.g. acts-on-notice/2024)
    if (/^\d{4}$/.test(slug)) continue;

    // Normalise title case: "ABOLITION OF MARITAL POWER" -> "Abolition of Marital Power"
    title = title
      .split(' ')
      .map((w, i) => {
        const lower = w.toLowerCase();
        const minorWords = ['of', 'the', 'and', 'in', 'on', 'for', 'to', 'by', 'at', 'a', 'an'];
        if (i > 0 && minorWords.includes(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');

    if (title.length > 0 && slug.length > 0) {
      acts.push({ title, slug, categoryPath });
    }
  }

  return acts;
}

/**
 * Load existing census for merge/resume (preserves ingestion data).
 */
function loadExistingCensus(): Map<string, CensusLawEntry> {
  const existing = new Map<string, CensusLawEntry>();
  if (fs.existsSync(CENSUS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CENSUS_PATH, 'utf-8')) as CensusFile;
      for (const law of data.laws) {
        if ('ingested' in law) {
          existing.set(law.id, law);
        }
      }
    } catch {
      // Ignore parse errors, start fresh
    }
  }
  return existing;
}

/* ---------- Main ---------- */

async function main(): Promise<void> {
  console.log(`${JURISDICTION_NAME} Law MCP -- Census (botswanalaws.com Scraping)`);
  console.log('='.repeat(60) + '\n');
  console.log(`  Jurisdiction:  ${JURISDICTION} (${JURISDICTION_NAME})`);
  console.log(`  Portal:        ${PORTAL}`);
  console.log(`  Categories:    ${CATEGORIES.length}`);
  console.log();

  const existingEntries = loadExistingCensus();
  if (existingEntries.size > 0) {
    console.log(`  Loaded ${existingEntries.size} existing entries from previous census\n`);
  }

  const allScrapedActs: ScrapedAct[] = [];
  const seenSlugs = new Set<string>();

  for (const cat of CATEGORIES) {
    console.log(`\n  --- ${cat.name} (${cat.path}) ---\n`);

    if (cat.category === 'constitution') {
      // Constitution is a single page, not a listing
      allScrapedActs.push({
        title: 'Constitution of Botswana',
        slug: 'constitution-of-botswana',
        categoryPath: cat.path,
      });
      seenSlugs.add('constitution-of-botswana');
      console.log('  1 act (constitution)');
      continue;
    }

    let page = 0;
    let emptyPages = 0;

    while (emptyPages < 2) {
      const url = page === 0 ? `${PORTAL}${cat.path}` : `${PORTAL}${cat.path}?start=${page * 50}`;
      process.stdout.write(`  Page ${page + 1}...`);

      const result = await fetchWithRateLimit(url);

      if (result.status !== 200) {
        console.log(` HTTP ${result.status} -- stopping pagination`);
        break;
      }

      const pageActs = scrapeListingPage(result.body, cat.path);
      const newActs = pageActs.filter(a => !seenSlugs.has(`${cat.path}/${a.slug}`));

      for (const act of newActs) {
        seenSlugs.add(`${cat.path}/${act.slug}`);
        allScrapedActs.push(act);
      }

      if (newActs.length === 0) {
        console.log(' 0 new acts (empty page)');
        emptyPages++;
      } else {
        console.log(` ${newActs.length} acts (total: ${allScrapedActs.length})`);
        emptyPages = 0;
      }

      page++;
    }
  }

  console.log(`\n  Total acts scraped: ${allScrapedActs.length}\n`);

  // Convert to census entries, merging with existing data
  const today = new Date().toISOString().split('T')[0];

  for (const scraped of allScrapedActs) {
    const matchingCat = CATEGORIES.find(c => c.path === scraped.categoryPath);
    const catType = matchingCat?.category ?? 'act';
    const id = slugToId(scraped.slug, catType);

    // Preserve ingestion data from existing census if available
    const existing = existingEntries.get(id);

    // Constitution URL is the category path itself, not a sub-page
    const url = catType === 'constitution'
      ? `${PORTAL}${scraped.categoryPath}`
      : `${PORTAL}${scraped.categoryPath}/${scraped.slug}`;

    const entry: CensusLawEntry = {
      id,
      title: scraped.title,
      identifier: slugToIdentifier(scraped.slug),
      url,
      category_path: scraped.categoryPath,
      status: matchingCat?.status ?? 'in_force',
      category: catType,
      classification: 'ingestable',
      ingested: existing?.ingested ?? false,
      provision_count: existing?.provision_count ?? 0,
      ingestion_date: existing?.ingestion_date ?? null,
    };

    existingEntries.set(id, entry);
  }

  // Build final census
  const allLaws = Array.from(existingEntries.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const ingestable = allLaws.filter(l => l.classification === 'ingestable').length;
  const excluded = allLaws.filter(l => l.classification === 'excluded').length;
  const inaccessible = allLaws.filter(l => l.classification === 'inaccessible').length;

  const census: CensusFile = {
    schema_version: '1.0',
    jurisdiction: JURISDICTION,
    jurisdiction_name: JURISDICTION_NAME,
    portal: PORTAL,
    census_date: today,
    agent: 'botswanalaws-scraper',
    summary: {
      total_laws: allLaws.length,
      ingestable,
      ocr_needed: 0,
      inaccessible,
      excluded,
    },
    laws: allLaws,
  };

  fs.mkdirSync(path.dirname(CENSUS_PATH), { recursive: true });
  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));

  console.log('='.repeat(60));
  console.log('Census Complete');
  console.log('='.repeat(60) + '\n');
  console.log(`  Total acts:     ${allLaws.length}`);
  console.log(`  Ingestable:     ${ingestable}`);
  console.log(`  Excluded:       ${excluded}`);
  console.log(`  Inaccessible:   ${inaccessible}`);
  console.log(`\n  Output: ${CENSUS_PATH}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
