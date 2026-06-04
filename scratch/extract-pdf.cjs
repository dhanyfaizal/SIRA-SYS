const PDFParser = require('pdf2json');
const path = require('path');

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
  const pages = pdfData.Pages;
  console.log('=== TOTAL PAGES:', pages.length, '===\n');
  
  pages.forEach((page, pageIdx) => {
    console.log(`\n--- PAGE ${pageIdx + 1} ---`);
    const texts = page.Texts
      .map(t => {
        let text;
        try {
          text = decodeURIComponent(t.R.map(r => r.T).join(''));
        } catch (e) {
          text = t.R.map(r => r.T).join('').replace(/%([0-9A-F]{2})/gi, (_, hex) => {
            try { return decodeURIComponent('%' + hex); } catch(e2) { return String.fromCharCode(parseInt(hex, 16)); }
          });
        }
        return { x: t.x, y: t.y, text };
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);
    
    let lastY = -1;
    let line = '';
    texts.forEach(t => {
      if (lastY >= 0 && Math.abs(t.y - lastY) > 0.3) {
        console.log(line);
        line = t.text;
      } else {
        line += (line ? '  ' : '') + t.text;
      }
      lastY = t.y;
    });
    if (line) console.log(line);
  });
});

pdfParser.loadPDF(path.resolve('ref_rps/Blanko Review RPS.pdf'));
