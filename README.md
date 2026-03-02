# Botswana Law MCP Server

**The BACLAYS alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fbotswana-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/botswana-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Botswana-law-mcp?style=social)](https://github.com/Ansvar-Systems/Botswana-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Botswana-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Botswana-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/Botswana-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/Botswana-law-mcp/actions/workflows/check-updates.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](https://github.com/Ansvar-Systems/Botswana-law-mcp)
[![Provisions](https://img.shields.io/badge/provisions-7%2C626-blue)](https://github.com/Ansvar-Systems/Botswana-law-mcp)

Query **882 Botswanan Acts** -- from the Data Protection Act 2018 and the Penal Code to the Companies Act, Employment Act, and more -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Botswanan legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Botswanan legal research means navigating laws.parliament.bw, botswanalii.org, and scattered government PDF publications. Whether you're:

- A **lawyer** validating citations in a brief or contract
- A **compliance officer** checking obligations under the Data Protection Act 2018 or the Financial Intelligence Act
- A **legal tech developer** building tools on Botswanan law
- A **researcher** tracing legislative provisions across 882 Acts

...you shouldn't need dozens of browser tabs and manual PDF cross-referencing. Ask Claude. Get the exact provision. With context.

This MCP server makes Botswanan law **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version -- zero dependencies, nothing to install.

**Endpoint:** `https://botswana-law-mcp.vercel.app/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add botswana-law --transport http https://botswana-law-mcp.vercel.app/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "botswana-law": {
      "type": "url",
      "url": "https://botswana-law-mcp.vercel.app/mcp"
    }
  }
}
```

**GitHub Copilot** -- add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "botswana-law": {
      "type": "http",
      "url": "https://botswana-law-mcp.vercel.app/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/botswana-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "botswana-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/botswana-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "botswana-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/botswana-law-mcp"]
    }
  }
}
```

---

## Example Queries

Once connected, just ask naturally:

- *"What does the Data Protection Act 2018 say about consent for data processing?"*
- *"Find provisions in the Penal Code about fraud and financial crimes"*
- *"Search for company law requirements under the Companies Act"*
- *"What does the Employment Act say about termination and severance?"*
- *"Is the Financial Intelligence Act still in force?"*
- *"Find provisions about competition law under the Competition Act"*
- *"Build a legal stance on corporate governance obligations in Botswana"*
- *"Validate the citation 'Section 12 of the Data Protection Act 2018'"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Acts** | 882 statutes | Comprehensive Botswanan legislation |
| **Provisions** | 7,626 sections | Full-text searchable with FTS5 |
| **Legal Definitions** | 7,703 definitions | Extracted from Act texts |
| **Database Size** | ~17 MB | Optimized SQLite, portable |
| **Freshness Checks** | Automated | Monitoring against laws.parliament.bw |

**Verified data only** -- every citation is validated against official sources (laws.parliament.bw, botswanalii.org). Zero LLM-generated content.

---

## Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from botswanalaws.com and the Parliament of Botswana (laws.parliament.bw)
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains statute text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by Act name and section number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
botswanalaws.com / laws.parliament.bw --> Parse --> SQLite --> FTS5 snippet() --> MCP response
                                            ^                        ^
                                     Provision parser         Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search laws.parliament.bw by Act name | Search by plain language: *"data protection consent"* |
| Navigate multi-section Acts manually | Get the exact provision with context |
| Manual cross-referencing between Acts | `build_legal_stance` aggregates across sources |
| "Is this Act still in force?" --> check manually | `check_currency` tool --> answer in seconds |
| Find SADC/AU alignment --> dig through frameworks | `get_eu_basis` --> linked frameworks instantly |
| No API, no integration | MCP protocol --> AI-native |

**Traditional:** Search laws.parliament.bw --> Download PDF --> Ctrl+F --> Cross-reference Acts --> Check amendments manually --> Repeat

**This MCP:** *"What are the data subject rights under the Data Protection Act 2018 and how do they compare to SADC frameworks?"* --> Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across 7,626 provisions with BM25 ranking. Supports quoted phrases, boolean operators, prefix wildcards |
| `get_provision` | Retrieve specific provision by Act name and section number |
| `check_currency` | Check if an Act is in force, amended, or repealed |
| `validate_citation` | Validate citation against database -- zero-hallucination check. Supports "Section 12 Data Protection Act 2018", "s. 5 Penal Code" |
| `build_legal_stance` | Aggregate citations from multiple Acts for a legal topic |
| `format_citation` | Format citations per Botswanan conventions (full/short/pinpoint) |
| `list_sources` | List all available Acts with metadata, coverage scope, and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### International Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get international frameworks (SADC, AU, Commonwealth) that a Botswanan Act aligns with |
| `get_botswanan_implementations` | Find Botswanan laws implementing a specific international framework or convention |
| `search_eu_implementations` | Search international documents with Botswanan alignment counts |
| `get_provision_eu_basis` | Get international law references for a specific provision |
| `validate_eu_compliance` | Check alignment status of Botswanan laws against international standards |

---

## International Law Alignment

Botswana is not an EU member state. Botswanan law develops through its own Westminster-derived constitutional and parliamentary framework, with international alignment through:

- **SADC** -- Southern African Development Community protocols on trade, finance, and governance; SADC Model Law on Data Protection
- **African Union (AU)** -- Malabo Convention on Cybersecurity and Personal Data Protection; AU frameworks on digital economy
- **Commonwealth** -- Commonwealth legal traditions and model laws; Commonwealth Cyber Declaration
- **UN Conventions** -- UNCAC (anti-corruption), Convention on the Rights of the Child, and international human rights instruments

The international bridge tools allow you to explore these alignment relationships -- checking which Botswanan provisions correspond to SADC or AU requirements, and vice versa.

> **Note:** International cross-references reflect alignment and framework relationships, not direct transposition. Botswana develops its own legislative approach, and the alignment tools help identify where Botswanan and international law address similar domains.

---

## Data Sources & Freshness

All content is sourced from authoritative Botswanan legal databases:

- **[botswanalaws.com](https://www.botswanalaws.com/)** -- Botswana laws and Acts database (primary source)
- **[Parliament of Botswana](https://www.parliament.gov.bw/)** -- Official Acts and subsidiary legislation
- **[botswanalii.org](https://www.botswanalii.org/)** -- Botswana Legal Information Institute

### Data Provenance

| Field | Value |
|-------|-------|
| **Authority** | Republic of Botswana |
| **Primary source** | botswanalaws.com / laws.parliament.bw |
| **Languages** | English (official language) |
| **Coverage** | 882 consolidated Acts |
| **Last ingested** | 2026-02-25 |

### Automated Freshness Checks

A [GitHub Actions workflow](.github/workflows/check-updates.yml) monitors data sources for changes:

| Check | Method |
|-------|--------|
| **Act amendments** | Drift detection against known provision anchors |
| **New Acts** | Comparison against source index |
| **Repealed Acts** | Status change detection |

**Verified data only** -- every citation is validated against official sources. Zero LLM-generated content.

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from botswanalaws.com and laws.parliament.bw. However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Court case coverage is not included** -- do not rely solely on this for case law research
> - **Verify critical citations** against primary sources for court filings
> - **International cross-references** reflect alignment relationships, not direct transposition

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [SECURITY.md](SECURITY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment.

### Bar Association

For professional legal use in Botswana, consult guidance from the **Law Society of Botswana** regarding professional obligations and confidentiality requirements.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Botswana-law-mcp
cd Botswana-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest              # Ingest Acts from botswanalaws.com
npm run build:db            # Rebuild SQLite database
npm run drift:detect        # Run drift detection against anchors
npm run check-updates       # Check for amendments and new Acts
npm run census              # Generate coverage census
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** ~17 MB (efficient, portable)
- **Reliability:** 100% ingestion success rate across 882 Acts

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/US_Compliance_MCP)
**Query US federal and state compliance laws** -- HIPAA, CCPA, SOX, GLBA, FERPA, and more. `npx @ansvar/us-regulations-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** -- ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

**70+ national law MCPs** covering Australia, Brazil, Canada, Denmark, Ethiopia, France, Germany, Ghana, India, Ireland, Japan, Kenya, Malawi, Netherlands, Nigeria, Norway, Singapore, South Africa, Sweden, Switzerland, UAE, UK, and more.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Court case law expansion (High Court of Botswana, Court of Appeal)
- SADC protocol alignment mapping
- AU Malabo Convention cross-references
- Historical Act versions and amendment tracking
- Subsidiary legislation and statutory instruments

---

## Roadmap

- [x] Core Act database with FTS5 search
- [x] Full corpus ingestion (882 Acts, 7,626 provisions, 7,703 definitions)
- [x] International law alignment tools
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [ ] Court case law expansion (High Court, Court of Appeal)
- [ ] Historical Act versions (amendment tracking)
- [ ] Subsidiary legislation and statutory instruments
- [ ] SADC protocol cross-references

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{botswana_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Botswana Law MCP Server: AI-Powered Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Botswana-law-mcp},
  note = {882 Botswanan Acts with 7,626 provisions sourced from botswanalaws.com}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Republic of Botswana (public domain)
- **International Framework Metadata:** SADC / AU / Commonwealth (public domain)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. This MCP server started as our internal reference tool -- turns out everyone building for the Botswanan or Southern African market has the same research frustrations.

So we're open-sourcing it. Navigating 882 Acts shouldn't require a law degree.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
