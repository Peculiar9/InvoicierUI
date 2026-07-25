interface PagerProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  noun?: string;
}

/**
 * List footer: always shows what you are looking at ("1-8 of 23 invoices"),
 * with prev/next when there is more than one page.
 */
export const Pager = ({ page, pages, total, pageSize, onPage, noun = 'items' }: PagerProps) => {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="iw-pager">
      <span className="iw-pager-count">
        {from}-{to} <em>of</em> {total} {noun}
      </span>
      {pages > 1 && (
        <div className="iw-pager-nav">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <i className="bx bx-chevron-left" />
          </button>
          <span>
            {page} <em>of</em> {pages}
          </span>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
};
