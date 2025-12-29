
export enum IssueType {
  VDP = 'Video Door Phone (VDP)',
  ACCESS_CARD = 'Door Access Card',
  BOTH = 'Both VDP and Access Card',
  OTHER = 'Other'
}

export enum Urgency {
  LOW = 'Low - Routine Check',
  MEDIUM = 'Medium - Intermittent Issue',
  HIGH = 'High - Completely Broken',
  CRITICAL = 'Critical - Security Risk'
}

export interface SupportTicket {
  id: string;
  fullName: string;
  unitNumber: string;
  towerBlock: string;
  contactNumber: string;
  email: string;
  issueType: IssueType;
  urgency: Urgency;
  description: string;
  submittedAt: string;
  photoUrl?: string;
}

export interface TroubleshootingTip {
  title: string;
  suggestion: string;
}
