export interface Registration {
  _id?: string;
  event_code: string;
  event_slug?: string;
  created_at: string;
  ref: string;
  name: string;
  phone: string;
  email: string | null;
  age?: number | null;
  college?: string | null;
  course?: string | null;
  year_of_study?: string | null;
  gender?: string | null;
  pass_type: 'student' | 'general';
  qty_general: number;
  qty_student: number;
  total: number;
  student_status: string | null;
  id_card_url: string | null;
  payment_id: string | null;
  order_id: string | null;
  payment_signature: string | null;
  payment_status: 'paid' | 'pending' | 'failed';
  raw?: Record<string, unknown>;
  whatsapp_status?: string | null;
  whatsapp_message_id?: string | null;
  whatsapp_sent_at?: string | null;
  whatsapp_delivered_at?: string | null;
  whatsapp_read_at?: string | null;
  whatsapp_failed_at?: string | null;
  whatsapp_failure_reason?: string | null;
}

/**
 * WhatsApp delivery of the booking-confirmation template, as tracked by the
 * Gupshup webhook. Values match Gupshup's callback eventType.
 */
export type WhatsAppStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'none';

export type StudentStatus = 'verified' | 'rejected' | 'pending' | 'none';
