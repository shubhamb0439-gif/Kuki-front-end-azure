export const isLargeScreen = (): boolean => {
  if (typeof window === 'undefined') return false;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDimension = Math.min(width, height);

  return minDimension >= 768;
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDimension = Math.min(width, height);

  return minDimension < 768;
};

export const isLandscape = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight;
};

export const isPortrait = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerHeight >= window.innerWidth;
};
