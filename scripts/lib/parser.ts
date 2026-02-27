/**
 * Botswana Law HTML Parser (botswanalaws.com)
 *
 * Parses legislation pages from botswanalaws.com (Joomla CMS).
 * The HTML uses custom CSS classes for structure:
 *   - Level-Iblue: section headings (with anchor + hidden input)
 *   - Level-Centeredblue: part/chapter headings
 *   - T0: subsection paragraphs (numbered)
 *   - TI: sub-items (lettered/numbered indent)
 *   - RI: roman numeral items
 *   - Annote: amendment annotations
 *   - ListingRI / ListingCentered: table of contents entries (ignored)
 *   - restricted_info: paywall boundary (stop parsing here)
 *
 * Section anchors follow patterns:
 *   Principal: <a name="Ch2907s1"> (chapter:section)
 *   Subsidiary: <a name="SubLCh6105s1_NAME"> (chapter:section)
 *
 * Source: https://botswanalaws.com/
 */

export interface ActIndexEntry {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issuedDate: string;
  inForceDate: string;
  url: string;
  description?: string;
  /** AKN fields (unused for botswanalaws.com, kept for interface compat) */
  aknYear?: string;
  aknNumber?: string;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  title_en: string;
  short_name: string;
  status: string;
  issued_date: string;
  in_force_date: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

/**
 * Strip HTML tags and decode common entities, normalising whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the article body HTML from the full page.
 * Stops at the paywall boundary if present.
 */
function extractArticleBody(html: string): string {
  // Find the article body container
  const bodyStart = html.indexOf('com-content-article__body');
  if (bodyStart === -1) {
    // Fallback: try the broader article container
    const articleStart = html.indexOf('com-content-article');
    if (articleStart === -1) return html;
    return html.substring(articleStart);
  }

  let body = html.substring(bodyStart);

  // Truncate at paywall boundary
  const paywallIdx = body.indexOf('restricted_info');
  if (paywallIdx !== -1) {
    // Cut before the <div containing the paywall, not just the id
    const divStart = body.lastIndexOf('<div', paywallIdx);
    body = divStart !== -1 ? body.substring(0, divStart) : body.substring(0, paywallIdx);
  }

  return body;
}

/**
 * Parse the content body to extract section blocks.
 *
 * Each section starts with a <p class="Level-Iblue"> tag containing:
 *   - Hidden input with chapter reference: <input name="aa" value="[Ch2907s1]">
 *   - Anchor: <a name="Ch2907s1"></a>
 *   - Section number and title: "1.    Short title"
 *
 * Content paragraphs follow until the next Level-Iblue or Level-Centeredblue.
 */
function parseSections(body: string, lawId: string): ParsedProvision[] {
  const provisions: ParsedProvision[] = [];

  // Split by paragraph tags, preserving the tag
  // We process sequentially, accumulating content per section
  const paragraphs = body.split(/<\/p>\s*/);

  let currentPart: string | undefined;
  let currentSection: string | null = null;
  let currentTitle = '';
  let currentContent = '';
  let currentRef = '';

  function flushSection(): void {
    if (currentSection && currentContent.trim().length > 10) {
      provisions.push({
        provision_ref: `s${currentSection}`,
        chapter: currentPart,
        section: currentSection,
        title: currentTitle,
        content: currentContent.trim().substring(0, 12000),
      });
    }
    currentSection = null;
    currentTitle = '';
    currentContent = '';
    currentRef = '';
  }

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Skip table of contents entries
    if (trimmed.includes('class="ListingRI"') || trimmed.includes('class="ListingCentered"')) {
      continue;
    }

    // Part/Chapter heading
    if (trimmed.includes('class="Level-Centeredblue"')) {
      flushSection();
      const partText = stripHtml(trimmed);
      // Extract part name: "PART II Abolition of Marital Power (ss 4-5)"
      const partMatch = partText.match(/^(PART\s+[IVXLC]+[A-Z]*|CHAPTER\s+[IVXLC0-9]+)/i);
      if (partMatch) {
        // Include the descriptive text after the part number
        const fullText = partText.replace(/\(ss?\s+[\d\-–, ]+\)/g, '').trim();
        currentPart = fullText;
      } else {
        // Sub-headings like "A. DIRECTOR OF PUBLIC PROSECUTIONS"
        const subHeading = partText.replace(/\(ss?\s+[\d\-–, ]+\)/g, '').trim();
        if (subHeading.length > 0 && currentPart) {
          currentPart = `${currentPart} - ${subHeading}`;
        }
      }
      continue;
    }

    // Section heading (Level-Iblue)
    if (trimmed.includes('class="Level-Iblue"')) {
      flushSection();

      // Extract anchor name: <a name="Ch2907s1"> or <a name="SubLCh6105s1_NAME">
      const anchorMatch = trimmed.match(/<a\s+name="([^"]+)"/);
      if (anchorMatch) {
        currentRef = anchorMatch[1];
      }

      // Extract section number and title from the heading text
      const headingText = stripHtml(trimmed);
      // Pattern: "1.    Short title" or "25A.    Special provisions"
      const sectionMatch = headingText.match(/^(\d+[A-Za-z]*)\.\s+(.*)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        currentTitle = sectionMatch[2].trim();
      } else {
        // Subsidiary pattern or unnumbered: try anchor
        const refMatch = currentRef.match(/s(\d+[A-Za-z]*)(?:_|$)/);
        if (refMatch) {
          currentSection = refMatch[1];
          currentTitle = headingText.replace(/^\d+[A-Za-z]*\.\s*/, '').trim();
        }
      }

      // The heading text itself is part of the content
      if (currentSection) {
        currentContent = headingText + '\n';
      }
      continue;
    }

    // Content paragraphs (belonging to current section)
    if (currentSection) {
      const text = stripHtml(trimmed);
      if (text.length > 0) {
        currentContent += text + '\n';
      }
    }
  }

  // Flush final section
  flushSection();

  if (provisions.length === 0) {
    console.log(`    [parser] No sections found in ${lawId}`);
  }

  return provisions;
}

/**
 * Extract term definitions from provision text.
 *
 * Definitions in botswanalaws.com HTML appear in interpretation/definition
 * sections with patterns like:
 *   "term" means/includes definition text;
 *   "term" has the meaning assigned to it in ...
 */
export function extractDefinitions(provisions: ParsedProvision[]): ParsedDefinition[] {
  const definitions: ParsedDefinition[] = [];
  const seen = new Set<string>();

  for (const prov of provisions) {
    // Only look in interpretation/definition sections
    const lowerTitle = prov.title.toLowerCase();
    if (
      !lowerTitle.includes('interpretation') &&
      !lowerTitle.includes('definition') &&
      !lowerTitle.includes('meaning')
    ) {
      continue;
    }

    // Match patterns: "term" means/includes definition
    // The HTML uses <strong> for terms which becomes plain text after stripHtml
    const defPattern = /["\u201c]([^"\u201d]+)["\u201d]\s+(means|includes|has the (?:same )?meaning)\s+([^;]+)/gi;
    let defMatch: RegExpExecArray | null;

    while ((defMatch = defPattern.exec(prov.content)) !== null) {
      const term = defMatch[1].trim();
      const definition = defMatch[3].trim();

      if (term.length > 0 && definition.length > 5 && !seen.has(term.toLowerCase())) {
        seen.add(term.toLowerCase());
        definitions.push({
          term,
          definition,
          source_provision: prov.provision_ref,
        });
      }
    }
  }

  return definitions;
}

/**
 * Parse a botswanalaws.com act page HTML.
 * This is the main entry point used by ingest.ts.
 */
export function parseBotswanaLawHtml(html: string, act: ActIndexEntry): ParsedAct {
  const body = extractArticleBody(html);
  const provisions = parseSections(body, act.id);
  const definitions = extractDefinitions(provisions);

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn,
    short_name: act.shortName,
    status: act.status,
    issued_date: act.issuedDate,
    in_force_date: act.inForceDate,
    url: act.url,
    description: act.description,
    provisions,
    definitions,
  };
}
