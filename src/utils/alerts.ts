export const getAlertDateKey = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatAlertTimestamp = (value: string, language: 'vi' | 'en' = 'vi'): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (elapsedMinutes < 1) return language === 'en' ? 'Just now' : 'Vừa xong';
  if (elapsedMinutes < 60) return language === 'en' ? `${elapsedMinutes} minutes ago` : `${elapsedMinutes} phút trước`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return language === 'en' ? `${elapsedHours} hours ago` : `${elapsedHours} giờ trước`;

  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatAlertFilterDate = (value: string, language: 'vi' | 'en' = 'vi'): string => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
};
