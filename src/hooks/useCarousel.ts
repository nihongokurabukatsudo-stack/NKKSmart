import { useEffect, useState } from "react";

export function useCarousel(itemCount: number, intervalMs = 4500) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (itemCount <= 1) {
      return;
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % itemCount);
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [intervalMs, itemCount]);

  const goToSlide = (nextIndex: number) => {
    setActiveIndex(nextIndex);
  };

  const goToNextSlide = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % itemCount);
  };

  const goToPreviousSlide = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + itemCount) % itemCount);
  };

  return {
    activeIndex,
    goToSlide,
    goToNextSlide,
    goToPreviousSlide,
  };
}
