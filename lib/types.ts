export interface Registration {
  _id?: string;
  created_at: string;
  ref: string;
  name: string;
  phone: string;
  email: string | null;
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
}

export type StudentStatus = 'verified' | 'rejected' | 'pending' | 'none';
