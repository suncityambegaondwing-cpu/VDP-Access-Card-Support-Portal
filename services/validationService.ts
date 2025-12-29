
export interface ResidentRecord {
  building: string;
  flatNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQZpi8L3yaDCyBRvXfl7-3_2vBlD3AhP1ODzTcZbNWMewIAFfcenIt62rujmrxnYI8eskxcEFD6feGS/pub?gid=0&single=true&output=csv";

/**
 * Normalizes a name by removing common honorifics
 */
export const normalizeName = (name: string): string => {
  if (!name) return "";
  const prefixRegex = /^(mr|mrs|ms|smt|shree|shri|sh|dr|late|smt\.|shri\.)\s+/i;
  return name
    .toLowerCase()
    .replace(prefixRegex, "")
    .trim();
};

export const fetchResidentData = async (): Promise<ResidentRecord[]> => {
  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    
    // Split by lines and filter out empty ones
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
    
    const buildingIdx = headers.indexOf('BUILDING');
    const flatIdx = headers.indexOf('FLAT NO.');
    const firstIdx = headers.indexOf('FIRST NAME');
    const middleIdx = headers.indexOf('MIDDLE NAME');
    const lastIdx = headers.indexOf('LAST NAME');

    if (buildingIdx === -1 || flatIdx === -1 || firstIdx === -1) {
      console.error("CSV headers missing. Found:", headers);
      return [];
    }

    return lines.slice(1).map(line => {
      // Basic CSV cell extraction
      const cells = line.split(',').map(c => c.trim());
      return {
        building: cells[buildingIdx] || "",
        flatNo: cells[flatIdx] || "",
        firstName: cells[firstIdx] || "",
        middleName: cells[middleIdx] || "",
        lastName: cells[lastIdx] || ""
      };
    }).filter(r => r.building && r.flatNo);
  } catch (error) {
    console.error("Error fetching resident data:", error);
    return [];
  }
};
