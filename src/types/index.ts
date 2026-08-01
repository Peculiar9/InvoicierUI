export interface User {
  id: string;
  email: string;
  username: string;
  /** cleared by the verification link; gates sending, nothing else */
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  createdAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  client: Client;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  /* ---- tax-grade record fields (the tax engine eats these later) ---- */
  /** VAT applied at invoice level (7.5% in v1). */
  vatEnabled?: boolean;
  /** The client is expected to withhold WHT on payment. */
  whtExpected?: boolean;
  /** Date the money actually landed. Cash basis: income exists when received. */
  dateReceived?: string;
  /** Amount actually received (fees and FX spreads mean it can differ). */
  amountReceived?: number;
  /** Amount withheld by the client; spawns a WHT credit record. */
  whtWithheld?: number;

  /* ---- the trail from send to receipt ---- */
  /** Every delivery, so "we never got it" has an answer. */
  sends?: InvoiceSend[];
  /** First time the client opened the payment link. */
  viewedAt?: string;
  /** How the money arrived, as chosen on the payment page. */
  paymentMethod?: string;
  /** Where the payer asked for their receipt. */
  payerEmail?: string;
  /** Receipts get their own identity, not the invoice number. */
  receiptNumber?: string;
  receiptedAt?: string;

  /* ---- how this one is meant to be paid ---- */
  /** Overrides the sender's default for this invoice only. */
  paymentRoute?: PaymentRoute;
  /** Which of the sender's accounts to show for a transfer. */
  receivingAccountId?: string;
  /** The payer said they sent it: when, and what reference they quoted. */
  claimedAt?: string;
  claimReference?: string;
  claimNote?: string;
  /** the sender could not find the money: when, and what they told the payer */
  declinedAt?: string;
  declineReason?: string;
  /** why an invoice was voided, kept instead of deleting the record */
  voidReason?: string;
  voidedAt?: string;
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
  accountName: string;
  accountNumber?: string;
  bankName?: string;
  routingNumber?: string;
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
  totalReceived: number;
  totalInvoices: number;
  totalClients: number;
  pendingInvoices: number;
  overdueInvoices: number;
  paidThisMonth: number;
  /** Paid invoices carrying a date-received: the March-readiness signal. */
  taxReadyPaid?: number;
  paidCount?: number;
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
  invoiceId?: string;
  clientId?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  revenueChart: ChartData;
  invoiceStatusChart: ChartData;
  recentInvoices: Invoice[];
  recentActivities: Activity[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
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
  totalPages: number;
}

export interface CreateInvoiceDto {
  /** Optional: bill a saved client, or name the recipient inline below. */
  clientId?: string;
  /** Ad-hoc recipient, used when no client has been saved yet. */
  recipientName?: string;
  recipientEmail?: string;
  items: Omit<InvoiceItem, 'id' | 'total'>[];
  currency: string;
  dueDate: string;
  notes?: string;
  terms?: string;
  taxRate?: number;
  vatEnabled?: boolean;
  whtExpected?: boolean;
  paymentRoute?: PaymentRoute;
  receivingAccountId?: string;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  status?: InvoiceStatus;
}

/** The three answers that make a foreign payment tax-grade. */
export interface MarkPaidDto {
  dateReceived: string;
  amountReceived: number;
  whtWithheld?: number;
  /** set when the payer pays through the public link */
  paymentMethod?: string;
  payerEmail?: string;
}
