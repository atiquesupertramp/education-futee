export type Program = "tutorat" | "classes_futees";
export type Subject = "lecture" | "ecriture" | "math";
export type EnrollmentStatus = "en_attente" | "envoye" | "relance" | "a_appeler" | "confirme" | "termine";
export type MembershipStatus = "actif" | "en_pause" | "termine";

export interface Group {
  code: string;
  program: Program;
  cycle: 2 | 3;
  subject: Subject;
  teacher: string | null;
  day: string | null;
  time: string | null;
  zoom_url: string | null;
  zoom_id: string | null;
  zoom_password: string | null;
  active: boolean;
  notes: string | null;
}

export interface Family {
  id: string;
  parent_name: string | null;
  parent_email: string;
  parent_phone: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  family_id: string;
  first_name: string;
  grade: string | null;
  cycle: 2 | 3;
  start_date: string | null;
  end_date: string | null;
  membership_status: MembershipStatus;
  closer_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  group_code: string;
  status: EnrollmentStatus;
  confirm_token: string;
  welcome_sent_at: string | null;
  confirmed_at: string | null;
  confirmed_via: string | null;
  reminder_sent_at: string | null;
  escalated_at: string | null;
  next_action_at: string | null;
  call_done_at: string | null;
  call_notes: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  student_id: string | null;
  enrollment_id: string | null;
  channel: "email" | "sms";
  kind: string;
  to_address: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  status: string;
  sent_at: string;
}

export interface Settings {
  demo_offset_hours: number;
  sender_email: string;
  reply_to: string;
  va_email: string;
}
