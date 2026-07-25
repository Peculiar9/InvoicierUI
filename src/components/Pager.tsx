interface PagerProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  sizes?: number[];
  noun?: string;
}

/**
 * List footer: what you are looking at ("1-8 of 23 invoices"), how many per
 * page, and prev/next when there is more than one page.
 */
export const Pager = ({
  page,
  pages,
  total,
  pageSize,
  onPage,
  onPageSize,
  sizes = [8, 16, 32, 50],
  noun = 'items',
}: PagerProps) => {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="iw-pager">
      <span className="iw-pager-count">
        {from}-{to} <em>of</em> {total} {noun}
      </span>
      <div className="iw-pager-nav">
        {onPageSize && (
          <select
            className="iw-select iw-select--sm"
            value={pageSize}
            aria-label="Rows per page"
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}
        {pages > 1 && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
