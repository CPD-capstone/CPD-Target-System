// Load PDF assets only when exporting; all files are served locally by the controller.
let dependencies;

const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(), 20000);
    const fail = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error('PDF files could not be loaded. Check the controller connection and try again.'));
    };
    script.src = src;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = fail;
    document.head.append(script);
});

const loadFont = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch('vendor/fonts/NotoSans-Regular.ttf?v=b85c38ec', { signal: controller.signal });
        if (!response.ok) throw new Error('The PDF font could not be loaded. Try again.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let index = 0; index < bytes.length; index += 8192) {
            binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
        }
        return btoa(binary);
    } finally {
        clearTimeout(timer);
    }
};

const loadDependencies = () => {
    if (!dependencies) {
        dependencies = Promise.all([
            (async () => {
                if (!window.jspdf?.jsPDF) await loadScript('vendor/jspdf.umd.min.js?v=4.2.1');
                if (!window.jspdf.jsPDF.API.autoTable) await loadScript('vendor/jspdf.plugin.autotable.min.js?v=5.0.9');
                return window.jspdf.jsPDF;
            })(),
            loadFont()
        ]).catch((error) => { dependencies = null; throw error; });
    }
    return dependencies;
};

// Generate a selectable-text PDF directly from the selected records, without browser printing.
export const createQualificationPdf = async ({ records, scope }) => {
    const [JsPDF, font] = await loadDependencies();
    const pdf = new JsPDF({ unit: 'pt', format: 'letter', compress: true, putOnlyUsedFonts: true });
    pdf.addFileToVFS('NotoSans-Regular.ttf', font);
    pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    pdf.setFont('NotoSans', 'normal');
    pdf.setProperties({ title: 'Qualification results', author: 'Cookeville Police Department', subject: scope });
    const average = records.length
        ? (records.reduce((total, record) => total + record.score, 0) / records.length).toFixed(1) : '—';
    pdf.autoTable({
        body: [
            ['Qualification results'],
            [`Cookeville Police Department | Generated ${new Date().toLocaleString()}`],
            [scope],
            [`${records.length} results | Average score: ${average}`]
        ],
        theme: 'plain',
        margin: 36,
        styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
        didParseCell: (data) => { if (data.row.index === 0) data.cell.styles.fontSize = 18; }
    });
    const dateFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 12,
        head: [['Officer', 'Badge', 'Qualification', 'Date', 'Score']],
        body: [...records].sort((a, b) => b.date - a.date || a.badge.localeCompare(b.badge)
            || a.qualification.localeCompare(b.qualification)).map((record) => [
            record.name, record.badge, record.qualification, dateFormat.format(record.date), String(record.score)
        ]),
        theme: 'grid',
        margin: { top: 36, right: 36, bottom: 42, left: 36 },
        styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 6, overflow: 'linebreak' },
        headStyles: { fontStyle: 'normal', fillColor: [0, 87, 184] },
        columnStyles: { 4: { halign: 'right' } },
        rowPageBreak: 'avoid',
        showHead: 'everyPage'
    });
    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        pdf.setFontSize(9);
        pdf.text(`Page ${page} of ${pages}`, 576, 768, { align: 'right' });
    }
    return pdf.output('blob');
};
