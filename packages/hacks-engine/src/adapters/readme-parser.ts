/**
 * @module readme-parser
 * @description Utility for parsing markdown tables from the DeFiHackLabs README.
 *
 * Extracts exploit-to-POC mappings, including protocol name, exploit date,
 * loss amount, and the path to the Foundry test file.
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-002
 */

export interface DeFiHackLabsPocEntry {
  /** Name of the exploited protocol */
  protocolName: string;
  /** Date of the exploit */
  date: Date;
  /** Total value lost in USD */
  lossUsd: number;
  /** Path to the Foundry test file relative to the repo root */
  testFilePath: string;
  /** Optional vulnerability type if present in the row */
  vulnerabilityType?: string;
}

/**
 * Parses markdown tables from the DeFiHackLabs README to extract POC mappings.
 *
 * The expected table format is typically:
 * | Protocol | Date | Loss | Test File |
 * |----------|------|------|-----------|
 * | Euler | 2023-03-13 | $197M | [Link](src/test/2023-03/Euler_exp.sol) |
 *
 * @param readmeContent Raw markdown content of the README
 * @returns Array of parsed POC entries
 */
export function parseReadmeTables(readmeContent: string): DeFiHackLabsPocEntry[] {
  const entries: DeFiHackLabsPocEntry[] = [];

  const lines = readmeContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      continue;
    }

    // Ignore header separators like |---|---|
    if (/^\|[-:| ]+\|$/.test(trimmed)) {
      continue;
    }

    const columns = trimmed.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (columns.length < 3) continue;

    let dateStr: string | undefined;
    let testFilePath: string | undefined;
    let lossStr: string | undefined;
    let protocolName: string | undefined;
    let vulnerabilityType: string | undefined;

    for (const col of columns) {
      // 1. Check for Date
      if (dateStr === undefined && /^\d{4}-?\d{2}-?\d{2}$/.test(col)) {
        dateStr = col;
        continue;
      }

      // 2. Check for POC Link
      const linkMatch = col.match(/\[.*?\]\((.*?)\)/);
      if (linkMatch && linkMatch[1] !== undefined && (linkMatch[1].endsWith('.sol') || linkMatch[1].includes('src/test'))) {
        testFilePath = linkMatch[1];
        continue;
      }

      // 3. Check for Loss
      if (lossStr === undefined && (col.includes('$') || /^[~]?\$?[0-9,.]+[KMBkmb]?$/.test(col.replace(/\s/g, '')))) {
        lossStr = col;
        continue;
      }

      // 4. Extract Protocol Name if it's a link (but not POC)
      if (protocolName === undefined && linkMatch && linkMatch[1] !== undefined && !linkMatch[1].endsWith('.sol')) {
        const nameMatch = col.match(/\[(.*?)\]/);
        if (nameMatch && nameMatch[1] !== undefined) {
          protocolName = nameMatch[1];
          continue;
        }
      }
    }

    // 5. Fallback for Protocol Name and Vulnerability (Plain text columns)
    const remainingCols = columns.filter(col => col !== dateStr && col !== lossStr && !col.includes('](') && col !== protocolName);
    
    if (protocolName === undefined && remainingCols.length > 0) {
      protocolName = remainingCols.shift();
    }
    
    if (remainingCols.length > 0) {
      vulnerabilityType = remainingCols[0];
    }

    if (protocolName === undefined || dateStr === undefined || testFilePath === undefined || lossStr === undefined) {
      continue;
    }

    let date: Date;
    if (dateStr.length === 8 && !dateStr.includes('-')) {
      date = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`);
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      continue;
    }

    const lossUsd = parseLossAmount(lossStr);

    const entry: DeFiHackLabsPocEntry = {
      protocolName,
      date,
      lossUsd,
      testFilePath,
    };
    
    if (vulnerabilityType !== undefined) {
      entry.vulnerabilityType = vulnerabilityType;
    }

    entries.push(entry);
  }

  return entries;
}

/**
 * Parses a string representation of loss into a raw USD number.
 * Handles formats like "$197M", "$1.2B", "$500K", "~$3.6M", "0", "-", etc.
 *
 * @param lossStr The raw loss string from the markdown table
 * @returns The parsed number in USD, or 0 if unparseable
 */
export function parseLossAmount(lossStr: string): number {
  if (lossStr === '' || lossStr === '-' || lossStr.toLowerCase() === 'n/a') {
    return 0;
  }

  // Remove whitespace, currency symbols, and approx indicators
  const cleaned = lossStr.replace(/[\s$~,]/g, '').toUpperCase();

  if (cleaned === '') return 0;

  // Extract numeric part and multiplier
  const numericMatch = cleaned.match(/^([0-9.]+)([KMB]?)/);
  if (!numericMatch) {
    return 0;
  }

  const [, numStr, multiplier] = numericMatch;
  const num = parseFloat(numStr ?? '');

  if (isNaN(num)) {
    return 0;
  }

  switch (multiplier ?? '') {
    case 'B':
      return num * 1_000_000_000;
    case 'M':
      return num * 1_000_000;
    case 'K':
      return num * 1_000;
    default:
      return num;
  }
}
