import { SupportTicket } from "../types";

const SPREADSHEET_ID = "10Ff2m3vI26Vg8nR-_uY_MNSNQ8-2t0ADfWgP-UUmcZE";
// Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm5l37zoQLy93QcbZGntHpt6BRdUu1tE5qJciDvE6KTk0Br89nwBfSi7CekP5YMWkWCQ/exec";

export const syncToGoogleSheet = async (ticket: SupportTicket): Promise<boolean> => {
  try {
    // Mode 'no-cors' is used for POST to avoid preflight issues with Apps Script,
    // though it means we can't read the response body.
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
 * Note: Requires the doGet() function in Apps Script to be deployed correctly.
 * IMPORTANT: The script MUST be deployed with "Who has access: Anyone".
 */
export const fetchTickets = async (): Promise<SupportTicket[]> => {
  try {
    console.log("Fetching tickets from:", SCRIPT_URL);
    
    const response = await fetch(SCRIPT_URL, {
      method: 'GET',
      redirect: 'follow', // Crucial for Google Apps Script redirects
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn("Unexpected data format from Apps Script:", data);
      return [];
    }

    // Sort by most recent (assuming spreadsheet rows are in chronological order)
    return data.reverse();
  } catch (error: any) {
    console.error("Detailed Fetch Error:", error);
    // If we get "Failed to fetch", it's almost always a CORS/Access issue
    if (error.message === 'Failed to fetch') {
      throw new Error("CORS Access Denied. Ensure the Web App is deployed for 'Anyone'");
    }
    throw error;
  }
};

export const getSheetUrl = () => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
