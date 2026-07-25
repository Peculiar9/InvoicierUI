export interface User {
  id: string;
  email: string;
  username: string;
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
}

export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

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
  type: 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'client_added';
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
  clientId: string;
  items: Omit<InvoiceItem, 'id' | 'total'>[];
  currency: string;
  dueDate: string;
  notes?: string;
  terms?: string;
  taxRate?: number;
  vatEnabled?: boolean;
  whtExpected?: boolean;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  status?: InvoiceStatus;
}

/** The three answers that make a foreign payment tax-grade. */
export interface MarkPaidDto {
  dateReceived: string;
  amountReceived: number;
  whtWithheld?: number;
}
