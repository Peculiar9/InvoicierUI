import { createFileRoute } from '@tanstack/react-router';
import { Payment } from '@/pages';

const PayRoute = () => {
  const { invoiceId } = Route.useParams();
  return <Payment invoiceId={invoiceId} />;
};

// Public — no auth guard; this is the link clients open to pay.
export const Route = createFileRoute('/pay/$invoiceId')({
  component: PayRoute,
});
