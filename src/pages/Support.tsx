import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LegacyWorkspace } from '@/components/static/LegacyWorkspace';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supportApi, ticketRef, type TicketCategory, type SupportTicket } from '@/api/support';
import '@/styles/support.css';

const SUPPORT_EMAIL = 'hello@invoicier.app';
const SUPPORT_EMAIL_ALT = 'invoicier@gmail.com';
const SUPPORT_PHONE_DISPLAY = '+234 806 314 9773';
const SUPPORT_WA = '2348063149773';

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  feedback: 'Feedback',
  help: 'A question',
  dispute: 'A dispute',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  awaiting_user: 'Your move',
  resolved: 'Resolved',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const Support = () => {
  usePageMeta('Support');
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: tickets } = useQuery({ queryKey: ['support', 'tickets'], queryFn: supportApi.myTickets });

  return (
    <LegacyWorkspace active="support" title="Support">
      <div className="sup">
        <header className="sup-head">
          <h1>We are one message away.</h1>
          <p>Send feedback, ask a question, or raise a dispute. Reach us directly, or start a thread and we will reply right here.</p>
        </header>

        <section className="sup-contact">
          <a className="sup-contact-card" href={`mailto:${SUPPORT_EMAIL}`}>
            <span className="sup-ic"><i className="bx bx-envelope" /></span>
            <div><b>Email us</b><small>{SUPPORT_EMAIL}</small><small className="sup-faint">{SUPPORT_EMAIL_ALT}</small></div>
          </a>
          <a className="sup-contact-card" href={`https://wa.me/${SUPPORT_WA}`} target="_blank" rel="noreferrer">
            <span className="sup-ic sup-ic--wa"><i className="bx bxl-whatsapp" /></span>
            <div><b>WhatsApp / call</b><small>{SUPPORT_PHONE_DISPLAY}</small><small className="sup-faint">fastest for something urgent</small></div>
          </a>
        </section>

        <div className="sup-grid">
          <NewConversation onOpened={(id) => { setOpenId(id); qc.invalidateQueries({ queryKey: ['support', 'tickets'] }); }} />

          <section className="sup-threads">
            <h2 className="sup-h2">Your conversations</h2>
            {!tickets ? (
              <p className="sup-skel">loading</p>
            ) : tickets.length === 0 ? (
              <div className="sup-empty"><i className="bx bx-message-square-dots" /><p>No threads yet. Start one on the left, anytime.</p></div>
            ) : (
              <ul className="sup-list">
                {tickets.map((t) => (
                  <li key={t._id}>
                    <button
                      type="button"
                      className={`sup-item${openId === t._id ? ' is-open' : ''}`}
                      onClick={() => setOpenId(openId === t._id ? null : t._id)}
                    >
                      <span className="sup-item-top">
                        <span className={`sup-badge sup-${t.status}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
                        <small>{CATEGORY_LABEL[t.category]}</small>
                      </span>
                      <b>{t.subject}</b>
                      <small className="sup-faint"><span className="sup-ref">{ticketRef(t)}</span> · updated {when(t.updated_at)}</small>
                    </button>
                    {openId === t._id && <Thread ticket={t} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </LegacyWorkspace>
  );
};

const NewConversation = ({ onOpened }: { onOpened: (id: string) => void }) => {
  const [category, setCategory] = useState<TicketCategory>('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => supportApi.open({ category, subject: subject.trim(), message: message.trim() }),
    onSuccess: (thread) => {
      setDone(ticketRef(thread.ticket));
      setSubject(''); setMessage('');
      setTimeout(() => setDone(null), 5000);
      onOpened(thread.ticket._id);
    },
  });

  return (
    <section className="sup-new">
      <h2 className="sup-h2">Start a conversation</h2>
      <div className="sup-tabs" role="tablist">
        {(['feedback', 'help', 'dispute'] as TicketCategory[]).map((c) => (
          <button key={c} type="button" role="tab" aria-selected={category === c}
            className={category === c ? 'is-active' : ''} onClick={() => setCategory(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <label className="sup-field">
        <span>Subject</span>
        <input value={subject} placeholder="A few words on what this is" maxLength={160}
          onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="sup-field">
        <span>Message</span>
        <textarea value={message} rows={5} placeholder="Tell us what is going on. The more detail, the faster we can help."
          onChange={(e) => setMessage(e.target.value)} />
      </label>
      {error && <p className="sup-err">{error instanceof Error ? error.message : 'That did not send. Try again.'}</p>}
      <div className="sup-actions">
        {done && <span className="sup-ok"><i className="bx bx-check" /> Sent as <b>{done}</b>. We will reply here.</span>}
        <button type="button" className="iw-btn" disabled={isPending || subject.trim().length < 2 || message.trim().length < 2}
          onClick={() => mutate()}>
          {isPending ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </section>
  );
};

const Thread = ({ ticket }: { ticket: SupportTicket }) => {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const { data } = useQuery({ queryKey: ['support', 'thread', ticket._id], queryFn: () => supportApi.thread(ticket._id) });
  const { mutate, isPending } = useMutation({
    mutationFn: () => supportApi.reply(ticket._id, body.trim()),
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['support', 'thread', ticket._id] });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });

  return (
    <div className="sup-thread">
      <div className="sup-msgs">
        {(data?.messages ?? []).map((m) => (
          <div key={m._id} className={`sup-msg sup-msg--${m.author}`}>
            <span className="sup-msg-who">{m.author === 'admin' ? 'Invoicier' : 'You'}</span>
            <p>{m.body}</p>
            <span className="sup-msg-at">{when(m.created_at)}</span>
          </div>
        ))}
      </div>
      {ticket.status !== 'resolved' ? (
        <div className="sup-reply">
          <textarea value={body} rows={2} placeholder="Reply…" onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) mutate(); }} />
          <button type="button" className="iw-btn iw-btn--sm" disabled={isPending || body.trim().length < 1} onClick={() => mutate()}>
            <i className="bx bx-send" />
          </button>
        </div>
      ) : (
        <p className="sup-resolved">This thread is resolved. Start a new one if something else comes up.</p>
      )}
    </div>
  );
};
