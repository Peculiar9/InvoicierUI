interface PagerProps {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}

/** Minimal pagination control: prev / position / next. Hidden for one page. */
export const Pager = ({ page, pages, onPage }: PagerProps) => {
  if (pages <= 1) return null;
  return (
    <div className="iw-pager">
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
  );
};
