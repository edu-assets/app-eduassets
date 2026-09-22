const THEME_STORAGE_KEY = 'eduassets_theme';

try {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const theme =
    savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : prefersDark
        ? 'dark'
        : 'light';

  document.documentElement.setAttribute('data-theme', theme);
} catch {
  document.documentElement.setAttribute('data-theme', 'light');
}
