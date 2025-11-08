export const getTheme = () => localStorage.getItem("theme") || "light";

export const setTheme = (theme) => {
  const html = document.querySelector("html");
  if (theme === "dark") html.classList.add("dark");
  else html.classList.remove("dark");
  localStorage.setItem("theme", theme);
};
