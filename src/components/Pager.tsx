import { FilterSelect } from '@/components/ui/FilterSelect';

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
 * Numbered pages, up to seven of them, with an ellipsis where the middle was.
 *
 * Always the same width, so the row does not jump as you move through it:
 * first, last, the current page and its neighbours, and a gap for the rest.
 */
const pageWindow = (page: number, pages: number): (number | 'gap')[] => {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', pages];
  if (page >= pages - 3) return [1, 'gap', pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, 'gap', page - 1, page, page + 1, 'gap', pages];
};

/**
 * The list footer: what you are looking at, how much fits on a page, and a way
 * to move between them.
 *
 * Page numbers rather than only prev/next, because "page 1 of 12" with two
 * arrows makes getting to page 9 a chore. The rows-per-page control is the
 * same dropdown as every other filter, so nothing here is the odd one out.
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
        <b>
          {from}–{to}
        </b>{' '}
        of <b>{total}</b> {noun}
      </span>

      <div className="iw-pager-nav">
        {onPageSize && (
          <FilterSelect
            label="Per page"
            placeholder={`${pageSize}`}
            icon="bx-list-ul"
            value=""
            options={sizes.map((size) => ({ value: String(size), label: `${size} per page` }))}
            onChange={(v) => onPageSize(Number(v) || sizes[0])}
          />
        )}

        {pages > 1 && (
          <div className="iw-pages" role="navigation" aria-label="Pages">
            <button
              type="button"
              className="iw-page-arrow"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <i className="bx bx-chevron-left" />
            </button>

            {pageWindow(page, pages).map((entry, i) =>
              entry === 'gap' ? (
                <span key={`gap-${i}`} className="iw-page-gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  className={`iw-page${entry === page ? ' is-current' : ''}`}
                  aria-current={entry === page ? 'page' : undefined}
                  aria-label={`Page ${entry}`}
                  onClick={() => onPage(entry)}
                >
                  {entry}
                </button>
              )
            )}

            <button
              type="button"
              className="iw-page-arrow"
              onClick={() => onPage(page + 1)}
              disabled={page >= pages}
              aria-label="Next page"
            >
              <i className="bx bx-chevron-right" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
