import { useRef, useState } from "react";

const THRESHOLD = 70;

export default function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const onTouchStart = (e) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    } else {
      startY.current = null;
      pulling.current = false;
    }
  };

  const onTouchMove = (e) => {
    if (!pulling.current || startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPull(Math.min(delta * 0.5, 90));
    }
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  return { pull, refreshing, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}