// Safe font loading: fetch Roboto from Google Fonts as ArrayBuffer to avoid base64/widths errors
let cachedFontBuffer: ArrayBuffer | null = null;

export async function loadRobotoFont(): Promise<ArrayBuffer> {
  if (cachedFontBuffer) return cachedFontBuffer;
  try {
    const response = await fetch('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2');
    if (!response.ok) throw new Error('Failed to fetch Roboto font');
    cachedFontBuffer = await response.arrayBuffer();
    return cachedFontBuffer;
  } catch (err) {
    console.warn('PDF: Could not load Roboto font from Google Fonts, falling back to default', err);
    throw err;
  }
}

export async function registerPdfFonts(doc: any) {
  try {
    const fontBuffer = await loadRobotoFont();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fontBuffer)));
    doc.addFileToVFS('Roboto-Regular.woff2', base64);
    doc.addFont('Roboto-Regular.woff2', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    return { hasCustomFont: true, fontName: 'Roboto' };
  } catch (err) {
    console.warn('PDF: Failed to register custom font, using default font', err);
    return { hasCustomFont: false, fontName: undefined };
  }
}
