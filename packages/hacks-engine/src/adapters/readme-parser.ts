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

  // Regex to match a markdown table row containing a date and a link
  // capturing: 1=Protocol, 2=Date, 3=Loss, 4=Link text (ignored), 5=Link path
  // E.g., | Euler | 2023-03-13 | $197M | [Link](src/test/2023-03/Euler_exp.sol) |
  const rowRegex =
    /\|\s*([^|]+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*\[([^\]]*?)\]\((.*?)\)\s*\|/g;

  let match;
  while ((match = rowRegex.exec(readmeContent)) !== null) {
    const protocolName = match[1]?.trim();
    const dateStr = match[2]?.trim();
    const lossStr = match[3]?.trim();
    const testFilePath = match[5]?.trim();

    // Basic cleanup and validation
    if (!protocolName || !dateStr || !testFilePath || !lossStr) {
      continue;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      continue;
    }

    const lossUsd = parseLossAmount(lossStr);

    entries.push({
      protocolName,
      date,
      lossUsd,
      testFilePath,
    });
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
  if (!lossStr || lossStr === '-' || lossStr.toLowerCase() === 'n/a') {
    return 0;
  }

  // Remove whitespace, currency symbols, and approx indicators
  const cleaned = lossStr.replace(/[\s$~,]/g, '').toUpperCase();

  if (!cleaned) return 0;

  // Extract numeric part and multiplier
  const numericMatch = cleaned.match(/^([0-9.]+)([KMB]?)/);
  if (!numericMatch) {
    return 0;
  }

  const [, numStr, multiplier] = numericMatch;
  const num = parseFloat(numStr || '');

  if (isNaN(num)) {
    return 0;
  }

  switch (multiplier || '') {
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
