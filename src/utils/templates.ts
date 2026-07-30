import type { InvoiceTemplate } from '@/stores/settingsStore';

export const TEMPLATES: { key: InvoiceTemplate; name: string; line: string }[] = [
  { key: 'classic', name: 'The Classic', line: 'Clean, quiet, gets paid.' },
  { key: 'ledger', name: 'The Ledger', line: 'Mono numbers, ruled lines.' },
  { key: 'bold', name: 'The Bold', line: 'Your color does the talking.' },
];
