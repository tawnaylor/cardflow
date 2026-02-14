import { getTheme, setTheme } from "./storage.mjs";

export function applyTheme(theme){
  document.documentElement.dataset.theme = (theme === "fantasy") ? "fantasy" : "neon";
}

export function initThemeSwitch(switchEl){
  const theme = getTheme();
  applyTheme(theme);
  if (switchEl){
    switchEl.checked = theme === "fantasy";
    switchEl.addEventListener("change", () => {
      const next = switchEl.checked ? "fantasy" : "neon";
      setTheme(next);
      applyTheme(next);
    });
  }
}

export function fillSelect(selectEl, items, placeholder="Select…"){
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  for (const item of items){
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    selectEl.appendChild(opt);
  }
}

export function escapeText(s=""){
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
