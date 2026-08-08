export interface User {
  id: string;
  email: string;
  username: string;
  /** cleared by the verification link; gates sending, nothing else */
  email_verified?: boolean;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  /** the access token; short-lived, sent on every request */
  token: string | null;
  /** long-lived; traded for a new access token when one expires */
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  /** their mark, shown where they appear; initials stand in without one */
  logo_url?: string | null;
  created_at: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client: Client;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  tax_rate: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  notes?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  /* ---- tax-grade record fields (the tax engine eats these later) ---- */
  /** VAT applied at invoice level (7.5% in v1). */
  vat_enabled?: boolean;
  /** The client is expected to withhold WHT on payment. */
  wht_expected?: boolean;
  /** Date the money actually landed. Cash basis: income exists when received. */
  date_received?: string;
  /** Amount actually received (fees and FX spreads mean it can differ). */
  amount_received?: number;
  /** Amount withheld by the client; spawns a WHT credit record. */
  wht_withheld?: number;

  /* ---- the trail from send to receipt ---- */
  /** Every delivery, so "we never got it" has an answer. */
  sends?: InvoiceSend[];
  /** First time the client opened the payment link. */
  viewed_at?: string;
  /** How the money arrived, as chosen on the payment page. */
  payment_method?: string;
  /** Where the payer asked for their receipt. */
  payer_email?: string;
  /** Receipts get their own identity, not the invoice number. */
  receipt_number?: string;
  receipted_at?: string;

  /* ---- how this one is meant to be paid ---- */
  /** Overrides the sender's default for this invoice only. */
  payment_route?: PaymentRoute;
  /** Which of the sender's accounts to show for a transfer. */
  receiving_account_id?: string;
  /** The payer said they sent it: when, and what reference they quoted. */
  claimed_at?: string;
  claim_reference?: string;
  claim_note?: string;
  /** the sender could not find the money: when, and what they told the payer */
  declined_at?: string;
  decline_reason?: string;
  /** why an invoice was voided, kept instead of deleting the record */
  void_reason?: string;
  voided_at?: string;
}

/**
 * The lifecycle: draft -> sent -> viewed -> paid -> receipted, plus overdue
 * (past due and unpaid) and cancelled. 'pending' is retained because seeded
 * and older records use it; it reads as "sent, awaiting payment".
 */
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'viewed'
  /** the payer says they transferred; the money is not confirmed yet */
  | 'awaiting'
  | 'paid'
  | 'receipted'
  | 'overdue'
  | 'cancelled';

/**
 * How the money can reach you.
 * 'instant' settles itself (Paystack today); 'transfer' means the client
 * moves money to an account you own (Grey, Fincra, a dom account), which
 * only you can confirm has landed.
 */
export type PaymentRoute = 'instant' | 'transfer' | 'both';

export type AccountProvider =
  | 'grey'
  | 'fincra'
  | 'dom'
  | 'bank'
  | 'wise'
  | 'paypal'
  | 'other';

/** An account a client can send money straight into. */
export interface ReceivingAccount {
  id: string;
  label: string;
  provider: AccountProvider;
  currency: string;
  account_name: string;
  account_number?: string;
  bank_name?: string;
  routing_number?: string;
  swift?: string;
  iban?: string;
  /** anything the payer needs to be told, e.g. a reference to quote */
  instructions?: string;
}

/** One delivery of an invoice: how it went out, and when. */
export interface InvoiceSend {
  channel: 'email' | 'mailto' | 'link' | 'whatsapp' | 'reminder';
  at: string;
  to?: string;
}

export interface DashboardStats {
  total_received: number;
  total_invoices: number;
  total_clients: number;
  pending_invoices: number;
  overdue_invoices: number;
  paid_this_month: number;
  /** Paid invoices carrying a date-received: the March-readiness signal. */
  tax_ready_paid?: number;
  paid_count?: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

export interface Activity {
  id: string;
  type:
    | 'invoice_created'
    | 'invoice_sent'
    | 'invoice_viewed'
    | 'invoice_claimed'
    | 'invoice_paid'
    | 'client_added';
  description: string;
  timestamp: string;
  invoice_id?: string;
  client_id?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  revenue_chart: ChartData;
  invoice_status_chart: ChartData;
  recent_invoices: Invoice[];
  recent_activities: Activity[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** What signing up actually asks for: a name, an email and a password. */
export interface SignupCredentials {
  full_name: string;
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateInvoiceDto {
  /** Optional: bill a saved client, or name the recipient inline below. */
  client_id?: string;
  /** Ad-hoc recipient, used when no client has been saved yet. */
  recipient_name?: string;
  recipient_email?: string;
  items: Omit<InvoiceItem, 'id' | 'total'>[];
  currency: string;
  due_date: string;
  notes?: string;
  terms?: string;
  tax_rate?: number;
  vat_enabled?: boolean;
  wht_expected?: boolean;
  payment_route?: PaymentRoute;
  receiving_account_id?: string;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  status?: InvoiceStatus;
}

/** The three answers that make a foreign payment tax-grade. */
export interface MarkPaidDto {
  date_received: string;
  amount_received: number;
  wht_withheld?: number;
  /** set when the payer pays through the public link */
  payment_method?: string;
  payer_email?: string;
}
