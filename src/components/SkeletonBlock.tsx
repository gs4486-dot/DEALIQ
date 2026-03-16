interface SkeletonBlockProps {
  height?: string;
}

const SkeletonBlock = ({ height = "h-32" }: SkeletonBlockProps) => {
  return (
    <div className={`${height} w-full rounded-xl animate-skeleton`} />
  );
};

export default SkeletonBlock;
