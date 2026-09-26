export const formatDuration = (seconds = 0): string => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return [minutes ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : '', remainder || !minutes ? `${remainder} ${remainder === 1 ? 'second' : 'seconds'}` : ''].filter(Boolean).join(' ');
};
