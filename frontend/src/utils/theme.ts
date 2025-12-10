export type Theme = 'dark' | 'light' | 'midnight';

export const applyTheme = (theme: Theme) => {
  // 1. Set data attribute for Tailwind
  document.documentElement.setAttribute('data-theme', theme);
  
  // 2. Save to localStorage
  localStorage.setItem('clouide-theme', theme);
};

export const getSavedTheme = (): Theme => {
  return (localStorage.getItem('clouide-theme') as Theme) || 'dark';
};