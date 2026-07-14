import { reactive } from 'vue';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS Safari
}

export const pwaState = reactive({
  deferredPrompt: null,
  canInstall: false,
  installed: isStandalone(),
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pwaState.deferredPrompt = e;
  pwaState.canInstall = !pwaState.installed;
});

window.addEventListener('appinstalled', () => {
  pwaState.installed = true;
  pwaState.canInstall = false;
  pwaState.deferredPrompt = null;
});

export async function promptInstall() {
  const e = pwaState.deferredPrompt;
  if (!e) return;
  pwaState.deferredPrompt = null;
  pwaState.canInstall = false;
  e.prompt();
  await e.userChoice;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
