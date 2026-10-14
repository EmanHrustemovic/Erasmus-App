export type User = {
  id: number;
  email: string;
  role: "student" | "admin";
  is_verified: boolean;
  two_factor_enabled: boolean;
};

export type ErasmusCall = {
  id: number;
  title: string;
  country: string;
  description: string;
  deadline: string;
  link: string;
  erasmus_email?: string | null;
  min_gpa?: number;
  required_docs?: string[];
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  created_at: string;
};

export type InboxMessage = {
  id: number;
  subject: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

export type AuditLog = {
  id: number;
  action: string;
  application_id?: number | null;
  call_title: string;
  student_email: string;
  reviewer_email: string;
  status: string;
  reason?: string | null;
  created_at: string;
};

export type Application = {
  id: number;
  call_id: number;
  call_title: string;
  user_email: string;
  full_name: string;
  phone: string;
  department: string;
  gpa: number;
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by_email?: string | null;
  decision_reason?: string | null;
};

export type ApplicationDocument = {
  id: number;
  doc_type: string;
  original_name: string;
  size: number;
  created_at: string;
};

export type ApplicationDetail = {
  id: number;
  call_id: number;
  call_title: string;
  call_country: string;
  call_deadline: string;
  call_description: string;
  call_link: string;
  call_erasmus_email?: string | null;
  user_email: string;
  full_name: string;
  phone: string;
  department: string;
  gpa: number;
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by_email?: string | null;
  decision_reason?: string | null;
  documents: ApplicationDocument[];
};

export type ApplicationStatusHistory = {
  id: number;
  application_id: number;
  status: string;
  reason?: string | null;
  changed_by_email: string;
  changed_by_role: string;
  created_at: string;
};

export type BulkReviewSkipped = {
  id: number;
  reason: string;
};

export type BulkReviewResult = {
  updated: number[];
  skipped: BulkReviewSkipped[];
};
