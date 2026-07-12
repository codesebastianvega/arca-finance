import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMonthlyReportPDF = (transactions: any[]) => {
  const doc = new jsPDF() as any;
  const brandColor: [number, number, number] = [198, 138, 69]; // #C68A45
  const darkColor: [number, number, number] = [20, 16, 11]; // #14100B

  // Title & Header
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('ARCA', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REPORTE MENSUAL DE MOVIMIENTOS', 20, 32);
  doc.text(new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase(), 190, 25, { align: 'right' });

  // Summary Logic
  const totalIn = transactions
    .filter(t => t.amount.startsWith('+'))
    .reduce((acc, t) => acc + parseInt(t.amount.replace(/[^0-9]/g, '')), 0);
  
  const totalOut = transactions
    .filter(t => t.amount.startsWith('-'))
    .reduce((acc, t) => acc + parseInt(t.amount.replace(/[^0-9]/g, '')), 0);

  // Summary Cards
  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.text('RESUMEN DEL PERIODO', 20, 55);
  
  // table for summary
  autoTable(doc, {
    startY: 60,
    head: [['Ingresos Totales', 'Gastos Totales', 'Balance Netto']],
    body: [[
      `$${totalIn.toLocaleString('es-CO')}`, 
      `$${totalOut.toLocaleString('es-CO')}`, 
      `$${(totalIn - totalOut).toLocaleString('es-CO')}`
    ]],
    theme: 'grid',
    headStyles: { fillColor: brandColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  // Transactions Table
  doc.setFontSize(12);
  doc.text('DETALLE DE TRANSACCIONES', 20, doc.lastAutoTable.finalY + 15);

  const tableData = transactions.map(t => [
    t.date,
    t.name,
    t.category.toUpperCase(),
    t.method,
    t.amount
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Fecha', 'Descripción', 'Categoría', 'Método', 'Monto']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: darkColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [243, 236, 220] }, // #F3ECDC
    styles: { fontSize: 9 },
    columnStyles: {
      4: { fontStyle: 'bold', halign: 'right' }
    },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw.startsWith('+')) {
          data.cell.styles.textColor = [143, 166, 106]; // #8FA66A
        } else {
          data.cell.styles.textColor = [193, 84, 58]; // #C1543A
        }
      }
    }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Documento generado por ARCA - Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  }

  doc.save(`Arca_Reporte_${new Date().toISOString().slice(0, 10)}.pdf`);
};
