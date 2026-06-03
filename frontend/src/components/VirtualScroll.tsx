import { useMemo, useRef, useState, useEffect, ReactNode } from 'react';

interface VirtualScrollProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => ReactNode;
  overscan?: number;
  fallback?: boolean;
}

export default function VirtualScroll({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  fallback = false,
}: VirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation
  useEffect(() => {
    try {
      setError(null);
      if (!Array.isArray(items)) throw new Error('Items must be an array');
      if (typeof itemHeight !== 'number' || itemHeight <= 0) throw new Error('Item height must be a positive number');
      if (typeof containerHeight !== 'number' || containerHeight <= 0) throw new Error('Container height must be a positive number');
      if (typeof renderItem !== 'function') throw new Error('RenderItem must be a function');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [items, itemHeight, containerHeight, renderItem]);

  // ALL hooks must be called unconditionally before any early returns
  const visibleRange = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const startIndex = Math.max(0, Math.floor(scrollTop / Math.max(itemHeight, 1)) - overscan);
    const endIndex = Math.min(
      safeItems.length - 1,
      Math.ceil((scrollTop + containerHeight) / Math.max(itemHeight, 1)) + overscan,
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items, overscan]);

  const visibleItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const { startIndex, endIndex } = visibleRange;
    return safeItems.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, visibleRange]);

  const totalHeight = Array.isArray(items) ? items.length * itemHeight : 0;

  const handleScroll = () => {
    if (scrollElementRef.current) {
      setScrollTop(scrollElementRef.current.scrollTop);
    }
  };

  // Fallback mode (after all hooks)
  const useFallback = fallback || !!error || !Array.isArray(items) || items.length < 20;

  if (useFallback) {
    return (
      <div style={{ height: containerHeight, overflow: 'auto' }} className="virtual-scroll-container">
        {error ? (
          <div className="p-4 text-xs text-red-400">Virtual Scroll Error: {error}</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {(Array.isArray(items) ? items : []).map((item, index) => (
              <div key={index} style={{ minHeight: itemHeight }}>
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: 'auto' }}
      className="virtual-scroll-container"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={`${index}-${item.id ?? Math.random()}`}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}