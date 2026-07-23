import type { SavingsChain } from '../cadenas/types';

export function exportChainToCSV(chain: SavingsChain) {
  const headers = ['Turno', 'Nombre Integrante', 'Telefono', 'Es Usuario', 'Estado de Pago'];
  const rows = chain.members.map((m) => [
    m.turnNumber,
    `"${m.memberName.replace(/"/g, '""')}"`,
    `"${m.phone || ''}"`,
    m.isCurrentUser ? 'Sí' : 'No',
    m.payoutStatus === 'paid' ? 'Entregado' : 'Pendiente',
  ]);

  const csvContent = [
    `"REPORTE DE CADENA DE AHORRO / NATILLERA"`,
    `"Nombre:","${chain.name.replace(/"/g, '""')}"`,
    `"Cuota:","${chain.contributionAmount}"`,
    `"Bolsa Total:","${chain.totalPot}"`,
    `"Periodicidad:","${chain.frequency}"`,
    `"Fecha Inicio:","${chain.startDate}"`,
    ``,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Reporte_Cadena_${chain.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printChainSummaryHTML(chain: SavingsChain) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const totalPotFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(chain.totalPot);
  const quotaFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(chain.contributionAmount);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reporte: ${chain.name}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0c0a09; color: #f5f5f4; padding: 24px; }
          .card { border: 1px solid #27272a; background: #18181b; padding: 20px; border-radius: 16px; margin-bottom: 20px; }
          h1 { color: #f59e0b; margin-top: 0; font-size: 24px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #27272a; padding: 10px; text-align: left; font-size: 13px; }
          th { background: #27272a; color: #f59e0b; }
          .badge-paid { color: #10b981; font-weight: bold; }
          .badge-pending { color: #f59e0b; font-weight: bold; }
          @media print {
            body { background: #fff; color: #000; }
            .card { border: 1px solid #ccc; background: #fff; }
            th { background: #eee; color: #000; }
            th, td { border: 1px solid #ddd; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🏛️ Arca Finance — Reporte de Cadena de Ahorro</h1>
          <h2>${chain.name}</h2>
          <div class="grid">
            <div><strong>Bolsa Total:</strong> ${totalPotFormatted}</div>
            <div><strong>Cuota Periódoca:</strong> ${quotaFormatted}</div>
            <div><strong>Periodicidad:</strong> ${chain.frequency}</div>
            <div><strong>Fecha de Inicio:</strong> ${chain.startDate}</div>
          </div>
        </div>

        <h3>Matriz de Integrantes y Turnos (${chain.members.length} personas)</h3>
        <table>
          <thead>
            <tr>
              <th>Turno</th>
              <th>Nombre del Integrante</th>
              <th>Teléfono WhatsApp</th>
              <th>Estado de Cobro</th>
            </tr>
          </thead>
          <tbody>
            ${chain.members
              .map(
                (m) => `
              <tr>
                <td><strong>#${m.turnNumber}</strong> ${m.isCurrentUser ? '(Tú)' : ''}</td>
                <td>${m.memberName}</td>
                <td>${m.phone || 'N/A'}</td>
                <td class="${m.payoutStatus === 'paid' ? 'badge-paid' : 'badge-pending'}">
                  ${m.payoutStatus === 'paid' ? '✅ Bolsa Entregada' : '⏳ Pendiente'}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
