import { SupportTicket } from "../types";

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
 * Note: Requires the doGet() function in Apps Script to be deployed correctly.
 * IMPORTANT: The script MUST be deployed with "Who has access: Anyone".
 */
export const fetchTickets = async (): Promise<SupportTicket[]> => {
  try {
    console.debug("Initializing fetch from Google Apps Script...");
    
    // Using a simple fetch with default mode (cors) for GET requests.
    // Google Apps Script requires redirect following.
    const response = await fetch(SCRIPT_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // redirect: 'follow' is default, but we specify it for clarity
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn("Data received is not an array. Check your doGet() return value.");
      return [];
    }

    // Reverse to show the most recent submissions at the top
    return [...data].reverse();
  } catch (error: any) {
    console.error("Critical Fetch Error:", error);
    
    // If we get "Failed to fetch", it's usually a browser-level CORS block
    if (error.message === 'Failed to fetch') {
      throw new Error("CORS/Network error. Check if 'Anyone' has access in Apps Script deployment.");
    }
    throw error;
  }
};

export const getSheetUrl = () => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
