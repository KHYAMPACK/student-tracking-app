/** Builds the cut-out login cards PDF and saves it (react-pdf is loaded on demand). */
export async function downloadParentCardsPdf({ schoolName, address, cards }) {
  const [{ pdf }, { ParentCardsPdf }, { ensurePdfFontsReady }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ParentCardsPdf.jsx'),
    import('../examReports/pdf/registerFonts.js'),
  ]);
  await ensurePdfFontsReady();
  const blob = await pdf(<ParentCardsPdf schoolName={schoolName} address={address} cards={cards} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `veli-giris-kartlari-${new Date().toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
