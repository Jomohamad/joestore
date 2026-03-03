interface BrandWordmarkProps {
  className?: string;
  compact?: boolean;
  animated?: boolean;
}

export default function BrandWordmark({ className = '', compact = false, animated = true }: BrandWordmarkProps) {
  return (
    <span className={`inline-flex items-baseline font-display font-bold tracking-tight ${className}`}>
      <span className="text-white">JOE</span>
      <span className={`${animated ? 'brand-store-typing' : 'ml-0.5'} text-creo-accent ${compact ? 'text-[0.95em]' : ''}`}>Store</span>
    </span>
  );
}
