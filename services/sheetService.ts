
import { SupportTicket } from "../types";

const SPREADSHEET_ID = "10Ff2m3vI26Vg8nR-_uY_MNSNQ8-2t0ADfWgP-UUmcZE";
// Replace the URL below with your deployed Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm5l37zoQLy93QcbZGntHpt6BRdUu1tE5qJciDvE6KTk0Br89nwBfSi7CekP5YMWkWCQ/exec";

export const syncToGoogleSheet = async (ticket: SupportTicket): Promise<boolean> => {
  console.log(`Attempting sync for ticket ${ticket.id} to Google Sheet: ${SPREADSHEET_ID}`);
  
  // NOTE: If SCRIPT_URL is not set up, this will fail.
  // We use no-cors if we don't need the JSON response, 
  // but for reliability in Apps Script, we usually just use a standard POST.
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // standard for Google Apps Script to avoid CORS preflight issues
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticket)
    });

    // With mode: 'no-cors', response.ok will be false and status will be 0, 
    // but the data will likely have been sent successfully.
    return true; 
  } catch (error) {
    console.error("Critical Sync Error:", error);
    return false;
  }
};

export const getSheetUrl = () => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
