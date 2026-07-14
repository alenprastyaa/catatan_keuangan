const LOGO_URL = '/img/logo.png';
export const LOGO_RATIO = 176 / 722; // tinggi / lebar asli logo

let logoDataUrlPromise = null;

// Logo aslinya JPEG progresif — di-render ulang lewat canvas jadi PNG
// supaya aman didekode oleh jsPDF (decoder bawaannya tidak selalu
// mendukung JPEG progresif).
export function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = LOGO_URL;
    });
  }
  return logoDataUrlPromise;
}
