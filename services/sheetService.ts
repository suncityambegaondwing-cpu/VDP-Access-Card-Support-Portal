import { SupportTicket, IssueType, Urgency } from "../types";

const SPREADSHEET_ID = "10Ff2m3vI26Vg8nR-_uY_MNSNQ8-2t0ADfWgP-UUmcZE";
// Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNRKmwOTWqT9qtvdVjM_BOACdqrR1TJec81i1qTY2Raer0pNicr0QfWWKm426aeOROqw/exec";

export const syncToGoogleSheet = async (ticket: SupportTicket): Promise<boolean> => {
  try {
    // Mode 'no-cors' is used for POST to avoid preflight issues with Apps Script,
    // though it means we can't read the response body. This is safe for one-way sync.
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticket)
    });
    return true; 
  } catch (error) {
    console.error("Sync Error:", error);
    return false;
  }
};

/**
 * Fetches all tickets from the Google Sheet.
 * Maps spreadsheet header-based keys to the local SupportTicket interface.
 */
export const fetchTickets = async (): Promise<SupportTicket[]> => {
  try {
    console.debug("Initializing fetch from Google Apps Script...");
    
    const response = await fetch(SCRIPT_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const rawData = await response.json();
    
    if (!Array.isArray(rawData)) {
      console.warn("Data received is not an array. Check your doGet() return value.");
      return [];
    }

    // Map spreadsheet keys (which often contain spaces or different casing) back to local interface
    const mappedTickets: SupportTicket[] = rawData.map((item: any) => ({
      id: item.id || item.ID || item["Ticket ID"] || "N/A",
      fullName: item.fullName || item["Full Name"] || item.name || "Unknown",
      unitNumber: item.unitNumber || item["Unit Number"] || item.flat || "",
      towerBlock: item.towerBlock || item["Tower/Block"] || item.tower || "",
      contactNumber: item.contactNumber || item["Contact Number"] || item.phone || "",
      email: item.email || item.Email || "",
      issueType: (item.issueType || item["Issue Type"] || IssueType.OTHER) as IssueType,
      urgency: (item.urgency || item.Urgency || Urgency.MEDIUM) as Urgency,
      description: item.description || item.Description || item["Issue Description"] || "",
      submittedAt: item.submittedAt || item["Submitted At"] || item.date || new Date().toLocaleString()
    }));

    // Reverse to show the most recent submissions at the top
    return mappedTickets.reverse();
  } catch (error: any) {
    console.error("Critical Fetch Error:", error);
    
    if (error.message === 'Failed to fetch') {
      throw new Error("CORS/Network error. Ensure Apps Script is deployed for 'Anyone'.");
    }
    throw error;
  }
};

export const getSheetUrl = () => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
