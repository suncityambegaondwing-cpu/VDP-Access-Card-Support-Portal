
import { SupportTicket } from "../types";

const SPREADSHEET_ID = "10Ff2m3vI26Vg8nR-_uY_MNSNQ8-2t0ADfWgP-UUmcZE";
const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=0#gid=0`;

export const syncToGoogleSheet = async (ticket: SupportTicket): Promise<boolean> => {
  // In a real production environment, this would call a Google Apps Script Web App URL
  // or a backend service authorized to write to the Google Sheets API.
  // For this UI implementation, we simulate the network request to the targeted sheet.
  
  console.log(`Syncing ticket ${ticket.id} to Google Sheet: ${SPREADSHEET_ID}`);
  
  return new Promise((resolve) => {
    // Simulate network latency for the cloud sync
    setTimeout(() => {
      // Logic for actual integration would go here (e.g., fetch to a relay script)
      resolve(true);
    }, 1800);
  });
};

export const getSheetUrl = () => SPREADSHEET_URL;
