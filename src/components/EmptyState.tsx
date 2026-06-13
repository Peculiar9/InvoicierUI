type EmptyStateAction = {
  label: string;
  icon?: string;
  onClick: () => void;
};

type EmptyStateProps = {
  icon: string;
  title: string;
  message?: string;
  action?: EmptyStateAction;
};

/** Clean, centered empty state for list views (invoices, clients, services). */
export const EmptyState = ({ icon, title, message, action }: EmptyStateProps) => (
  <div className="empty-state">
    <span className="empty-state__icon">
      <i className={`bx ${icon}`} />
    </span>
    <h3 className="empty-state__title">{title}</h3>
    {message && <p className="empty-state__text">{message}</p>}
    {action && (
      <button type="button" className="btn btn-primary empty-state__action" onClick={action.onClick}>
        {action.icon && <i className={`bx ${action.icon}`} />} {action.label}
      </button>
    )}
  </div>
);
