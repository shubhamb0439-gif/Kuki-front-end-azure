import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 100
}: SwipeGestureOptions) {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);
  const isHorizontalSwipe = useRef<boolean>(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;

      // Ignore touch events on interactive elements
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('[role="button"]')
      ) {
        isSwiping.current = false;
        isHorizontalSwipe.current = false;
        return;
      }

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
      isSwiping.current = true;
      isHorizontalSwipe.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current) return;

      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;

      // Determine swipe direction early
      const horizontalDistance = Math.abs(touchStartX.current - touchEndX.current);
      const verticalDistance = Math.abs(touchStartY.current - touchEndY.current);

      // If user is clearly swiping horizontally, mark it
      if (horizontalDistance > 30 && horizontalDistance > verticalDistance * 1.5) {
        isHorizontalSwipe.current = true;
      }

      // If user is clearly scrolling vertically, stop tracking swipe
      if (verticalDistance > 30 && verticalDistance > horizontalDistance * 1.5) {
        isSwiping.current = false;
        isHorizontalSwipe.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current || !isHorizontalSwipe.current) {
        isSwiping.current = false;
        isHorizontalSwipe.current = false;
        return;
      }

      const horizontalDistance = touchStartX.current - touchEndX.current;
      const verticalDistance = Math.abs(touchStartY.current - touchEndY.current);

      // Only trigger if horizontal movement is greater than vertical (horizontal swipe)
      // and the movement is significant
      if (Math.abs(horizontalDistance) > minSwipeDistance && Math.abs(horizontalDistance) > verticalDistance * 2) {
        const isLeftSwipe = horizontalDistance > minSwipeDistance;
        const isRightSwipe = horizontalDistance < -minSwipeDistance;

        if (isLeftSwipe && onSwipeLeft) {
          onSwipeLeft();
        }

        if (isRightSwipe && onSwipeRight) {
          onSwipeRight();
        }
      }

      isSwiping.current = false;
      isHorizontalSwipe.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance]);
}
