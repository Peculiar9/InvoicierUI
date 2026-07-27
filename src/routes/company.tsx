import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/pages/ComingSoon';

export const Route = createFileRoute('/company')({
  component: () => (
    <ComingSoon
      eyebrow="Company"
      title="A small team, heads down."
      blurb="Invoicier is built by peculiarlabs. There is not much of a company page yet because the time is going into the product, but the door is open."
      bullets={[
        'Who we are and why invoicing, of all things',
        'How we think about your data and your money',
        'Roles, when there are roles',
        'Say hello: hello@invoicier.app',
      ]}
    />
  ),
});
