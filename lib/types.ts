// Shared domain types + option lists for Lab IQ Sales.

export type Role = "salesperson" | "manager";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  punch_in_time: string;
  punch_in_latitude: number | null;
  punch_in_longitude: number | null;
  punch_in_accuracy: number | null;
  punch_in_address: string | null;
  punch_out_time: string | null;
  punch_out_latitude: number | null;
  punch_out_longitude: number | null;
  punch_out_accuracy: number | null;
  punch_out_address: string | null;
  created_at: string;
}

export type SiteType =
  | "Hospital"
  | "Diagnostic Centre"
  | "Laboratory"
  | "Clinic"
  | "Nursing Home"
  | "Pharmacy"
  | "Corporate"
  | "Other";

export interface Site {
  id: string;
  name: string;
  site_type: SiteType;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type VisitOutcome =
  | "Positive"
  | "Interested"
  | "Follow-up Required"
  | "Decision Maker Unavailable"
  | "Not Interested"
  | "No Opportunity";

export interface Visit {
  id: string;
  user_id: string;
  site_id: string | null;
  visit_time: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  person_met: string | null;
  designation: string | null;
  mobile: string | null;
  outcome: VisitOutcome | null;
  notes: string | null;
  created_at: string;
}

export type LeadPriority = "High" | "Medium" | "Low";
export type LeadStatus =
  | "New"
  | "Interested"
  | "Proposal Sent"
  | "Negotiation"
  | "Won"
  | "Lost";

export interface Lead {
  id: string;
  visit_id: string | null;
  site_id: string | null;
  user_id: string;
  lead_type: string | null;
  opportunity: string[];
  estimated_monthly_business: number | null;
  priority: LeadPriority | null;
  expected_conversion: string | null;
  next_followup_date: string | null;
  next_action: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

// Rows joined with their site + author, as fetched for lists / map.
export interface VisitWithRelations extends Visit {
  site: Pick<Site, "id" | "name" | "site_type"> | null;
  user: Pick<UserProfile, "id" | "name"> | null;
  lead: Pick<Lead, "id" | "estimated_monthly_business" | "priority" | "status"> | null;
}

// ---- Option lists (single source of truth for the UI dropdowns/chips) ----

export const SITE_TYPES: SiteType[] = [
  "Hospital",
  "Diagnostic Centre",
  "Laboratory",
  "Clinic",
  "Nursing Home",
  "Pharmacy",
  "Corporate",
  "Other",
];

export const DESIGNATIONS = [
  "Doctor",
  "Pathologist",
  "Lab Manager",
  "Hospital Administrator",
  "Purchase Manager",
  "Owner",
  "Medical Superintendent",
  "Other",
];

export const OUTCOMES: { value: VisitOutcome; emoji: string; color: string }[] = [
  { value: "Positive", emoji: "🟢", color: "#16a34a" },
  { value: "Interested", emoji: "🔵", color: "#2563eb" },
  { value: "Follow-up Required", emoji: "🟡", color: "#ca8a04" },
  { value: "Decision Maker Unavailable", emoji: "🟠", color: "#ea580c" },
  { value: "Not Interested", emoji: "🔴", color: "#dc2626" },
  { value: "No Opportunity", emoji: "⚪", color: "#6b7280" },
];

export const LEAD_TYPES = [
  "Hospital Laboratory",
  "B2B Diagnostic Centre",
  "Referral Testing",
  "Sample Collection Centre",
  "Corporate",
  "Doctor Referral",
  "Other",
];

export const OPPORTUNITIES = [
  "Routine Pathology",
  "Biochemistry",
  "Immunoassay",
  "Molecular",
  "Histopathology",
  "Microbiology",
  "Referral Testing",
  "Hospital Lab Management",
  "Other",
];

export const EXPECTED_CONVERSIONS = [
  "This Week",
  "This Month",
  "1–3 Months",
  "3–6 Months",
  ">6 Months",
];

export const NEXT_ACTIONS = [
  "Call",
  "Visit",
  "Send Price List",
  "Send Test Menu",
  "Send Quotation",
  "Send HLM Proposal",
  "Other",
];

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Interested",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
];

export function outcomeMeta(outcome: VisitOutcome | null) {
  return OUTCOMES.find((o) => o.value === outcome);
}
