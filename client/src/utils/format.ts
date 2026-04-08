export const formatTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const pickAvatarColor = (nickname: string) => {
  const palette = ['#ffd0b1', '#cfe6b8', '#f5d6b8', '#bfe4d4', '#f6c2c9'];
  const score = nickname.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[score % palette.length];
};
