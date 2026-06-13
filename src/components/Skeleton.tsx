interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
  className?: string;
}

/** A shimmering placeholder block for loading states. */
export const Skeleton = ({ width, height = 16, radius = 8, className = '' }: SkeletonProps) => (
  <span
    className={`skel ${className}`}
    style={{ width, height, borderRadius: radius }}
    aria-hidden="true"
  />
);
