
import { SupportTicket } from "../types";

export const generateCSV = (tickets: SupportTicket[]): string => {
  if (tickets.length === 0) return "";

  const headers = [
    "ID",
    "Full Name",
    "Unit Number",
    "Tower/Block",
    "Contact Number",
    "Email",
    "Issue Type",
    "Urgency",
    "Description",
    "Submitted At"
  ];

  const rows = tickets.map(t => [
    t.id,
    `"${t.fullName.replace(/"/g, '""')}"`,
    `"${t.unitNumber}"`,
    `"${t.towerBlock}"`,
    `"${t.contactNumber}"`,
    `"${t.email}"`,
    `"${t.issueType}"`,
    `"${t.urgency}"`,
    `"${t.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    t.submittedAt
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
