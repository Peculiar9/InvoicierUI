interface ClientAvatarProps {
  name: string;
  logo_url?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * "Otto Holdings" → "OH"; a mononym keeps its first two letters. Joiners are
 * not words: "Thornton & Co" is TC, not T&.
 */
const initialsOf = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => /^[\p{L}\p{N}]/u.test(part));
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
};

/**
 * The client's mark. Their logo when they have one, their initials when they
 * do not, never an empty grey square, and the initials are two letters
 * because "O" could be anyone and "OH" is probably Otto Holdings.
 */
export const ClientAvatar = ({ name, logo_url, size = 'md' }: ClientAvatarProps) => {
  const cls = `client-avatar${size === 'sm' ? ' client-avatar--sm' : size === 'lg' ? ' client-avatar--lg' : ''}`;
  if (logo_url) {
    return (
      <span className={`${cls} client-avatar--logo`}>
        <img src={logo_url} alt="" loading="lazy" />
      </span>
    );
  }
  return <span className={cls}>{initialsOf(name)}</span>;
};
