import ExcelJS from 'exceljs';
import logoLeftUrl from '../assets/logo_left.png';
import logoRightUrl from '../assets/logo_right.png';
import { saveAndShareFile } from './mobileFiles.js';


async function downloadBuffer(buffer, filename) {
  await saveAndShareFile({
    buffer,
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function baseStyle(cell, opts = {}) {
  cell.alignment = opts.alignment || { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.font = opts.font || { name: 'Arial', size: 10 };
  if (opts.fill) cell.fill = opts.fill;
  if (opts.border) cell.border = opts.border;
}

const thinBorder = {
  top: { style: 'thin', color: { argb: '000000' } },
  left: { style: 'thin', color: { argb: '000000' } },
  bottom: { style: 'thin', color: { argb: '000000' } },
  right: { style: 'thin', color: { argb: '000000' } },
};

const mediumBorder = {
  top: { style: 'medium', color: { argb: '000000' } },
  left: { style: 'medium', color: { argb: '000000' } },
  bottom: { style: 'medium', color: { argb: '000000' } },
  right: { style: 'medium', color: { argb: '000000' } },
};

function setRowBorders(ws, rowNumber, fromCol, toCol, border = thinBorder) {
  for (let c = fromCol; c <= toCol; c += 1) {
    ws.getCell(rowNumber, c).border = border;
  }
}

async function imageUrlToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function addInstitutionalImages(wb, ws, leftRange, rightRange) {
  try {
    const [leftBase64, rightBase64] = await Promise.all([
      imageUrlToBase64(logoLeftUrl),
      imageUrlToBase64(logoRightUrl),
    ]);

    const leftId = wb.addImage({ base64: leftBase64, extension: 'png' });
    const rightId = wb.addImage({ base64: rightBase64, extension: 'png' });

    ws.addImage(leftId, leftRange);
    ws.addImage(rightId, rightRange);
  } catch (err) {
    console.warn('No se pudieron incrustar los logos en Excel:', err);
  }
}

function styleCellRange(ws, fromRow, toRow, fromCol, toCol, styleCb) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let col = fromCol; col <= toCol; col += 1) {
      styleCb(ws.getCell(row, col), row, col);
    }
  }
}

export async function exportInventarioExcel({ items = [], fecha = '', areaName = 'TODAS', catName = 'TODAS', filtroTexto = '' }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inventario', {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 4.5 },
    { width: 4.5 },
    { width: 8.5 },
    { width: 13 },
    { width: 11 },
    { width: 7 },
    { width: 8 },
    { width: 31 },
    { width: 11 },
    { width: 14 },
    { width: 15 },
    { width: 7 },
    { width: 11 },
    { width: 10 },
    { width: 9 },
    { width: 20 },
  ];

  ws.getRow(1).height = 24;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 22;
  ws.getRow(6).height = 34;

  ws.mergeCells('I1:N1');
  ws.getCell('I1').value = 'SERVICIOS DE SALUD DEL INSTITUTO MEXICANO DEL SEGURO SOCIAL PARA EL BIENESTAR';
  baseStyle(ws.getCell('I1'), { font: { name: 'Arial', size: 10, bold: true } });

  ws.mergeCells('I2:N2');
  ws.getCell('I2').value = 'UNIDAD DE INFRAESTRUCTURA';
  baseStyle(ws.getCell('I2'), { font: { name: 'Arial', size: 10, bold: true } });

  ws.mergeCells('I3:N3');
  ws.getCell('I3').value = 'COORDINACIÓN DE EQUIPAMIENTO PARA ESTABLECIMIENTOS DE SALUD';
  baseStyle(ws.getCell('I3'), { font: { name: 'Arial', size: 10, bold: true } });

  ws.mergeCells('A5:D5');
  ws.getCell('A5').value = `Fecha de descarga: ${fecha}`;
  baseStyle(ws.getCell('A5'), {
    font: { name: 'Arial', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });

  ws.mergeCells('E5:R5');
  ws.getCell('E5').value = `Área: ${areaName}   |   Categoría: ${catName}${filtroTexto ? `   |   Búsqueda: ${filtroTexto}` : ''}`;
  baseStyle(ws.getCell('E5'), {
    font: { name: 'Arial', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
  });

  const headerRow = 6;
  const headers = [
    'N.P.',
    'No. DE\nINVENTARIO',
    'E. F.',
    'CLUES',
    'UNIDAD\nMÉDICA',
    'ESPECIALIDAD',
    'UBICACIÓN\nESPECÍFICA',
    'CATE\nGO',
    'CLAVE\nCNIS',
    'EQUIPO MÉDICO',
    'MARCA',
    'MODELO',
    'NÚMERO DE\nSERIE',
    'ESTATU\nS',
    'CONDICIO\nNES DEL',
    'FUNCI\nON',
    'GARAN\nTÍA',
    'ESPECIFICACIONES DE\nMANTENIMIENTO',
  ];
  ws.getRow(headerRow).values = headers;
  for (let c = 1; c <= headers.length; c += 1) {
    baseStyle(ws.getCell(headerRow, c), {
      font: { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F75B5' } },
      border: thinBorder,
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    });
  }

  items.forEach((it, idx) => {
    const row = ws.getRow(headerRow + 1 + idx);
    row.values = [
      idx + 1,
      it.numero_inventario ?? '',
      'NA\nYA\nRIT',
      'NTI\nMB\n001\n246',
      'HOSPITAL\nCIVIL DR.\nANTONIO\nGONZÁLEZ\nGUEVARA',
      it.nombre_area ?? it.id_area ?? '',
      it.ubicacion_especifica ?? '',
      it.nombre_categoria ?? it.id_categoria ?? '',
      it.clave_cnis ?? '513.164.3387',
      it.nombre_equipo ?? '',
      it.marca ?? '',
      it.modelo ?? '',
      it.numero_serie ?? '',
      it.activo ? 'PROPIO' : 'BAJA',
      it.condiciones ?? 'MALO',
      it.funcion ?? 'SI',
      it.garantia ?? 'NO',
      it.especificaciones_mantenimiento ?? 'COMPLETAR BARANDALES EN CASO DE SER NECESARIO, COMPLETAR BARANDALES EN CASO DE SER NECESARIO.',
    ];
    row.height = 42;
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 8, bold: false };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 10 || colNumber === 18 ? 'left' : 'center', wrapText: true };
    });
    ws.getCell(row.number, 2).font = { name: 'Arial', size: 12, bold: true };
    ws.getCell(row.number, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? '00B0F0' : '1EA7E1' } };
    ws.getCell(row.number, 13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD966' } };

    if (idx % 2 === 0) {
      [1,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18].forEach((col) => {
        ws.getCell(row.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
      });
    }
  });

  await addInstitutionalImages(
    wb,
    ws,
    { tl: { col: 1.1, row: 0.2 }, ext: { width: 140, height: 52 } },
    { tl: { col: 17.1, row: 0.2 }, ext: { width: 78, height: 70 } },
  );

  const buffer = await wb.xlsx.writeBuffer();
await downloadBuffer(buffer, `inventario_${fecha}_FILTRADO.xlsx`);
}

export async function exportBitacoraExcel({ bitacora }) {
  const rows = bitacora?.items?.length ? bitacora.items : [];
  const fecha = bitacora?.fecha || new Date().toISOString().slice(0, 10);
  const nombre = (bitacora?.nombre || 'BITACORA DE REVISION').toUpperCase();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bitácora', {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 14 }, // A No. inventario
    { width: 30 }, // B Equipo médico
    { width: 12 }, // C Marca
    { width: 12 }, // D Modelo
    { width: 14 }, // E Número de serie
    { width: 12 }, // F Ubicación específica
    { width: 8.5 }, // G Func correcto
    { width: 8.5 }, // H Func incorrecto
    { width: 8.5 }, // I Sens correcto
    { width: 8.5 }, // J Sens incorrecto
    { width: 8.5 }, // K Req sí
    { width: 8.5 }, // L Req no
    { width: 12 }, // M Fecha
    { width: 18 }, // N Observaciones
  ];

  ws.getRow(1).height = 28;
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 24;
  ws.getRow(5).height = 24;
  ws.getRow(6).height = 24;

  // ===== ENCABEZADO SUPERIOR =====
  ws.mergeCells('D1:K1');
  ws.getCell('D1').value = 'HOSPITAL DE ESPECIALIDADES "DR. ANTONIO GONZALEZ GUEVARA"';
  baseStyle(ws.getCell('D1'), {
    font: { name: 'Arial', size: 12, bold: true },
    border: thinBorder,
  });

  ws.mergeCells('D2:K2');
  ws.getCell('D2').value = 'AREA DE MANTENIMIENTO';
  baseStyle(ws.getCell('D2'), {
    font: { name: 'Arial', size: 11, bold: true },
    border: thinBorder,
  });

  ws.mergeCells('D3:K3');
  ws.getCell('D3').value = nombre;
  baseStyle(ws.getCell('D3'), {
    font: { name: 'Arial', size: 10, bold: true },
    border: thinBorder,
  });

  ws.mergeCells('A5:B5');
  ws.getCell('A5').value = `FECHA: ${fecha}`;
  baseStyle(ws.getCell('A5'), {
    font: { name: 'Arial', size: 10, bold: true },
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: thinBorder,
  });

  // ===== ENCABEZADOS DE TABLA =====
  ws.mergeCells('A6:A7');
  ws.getCell('A6').value = 'NO. DE\nINVENTARIO';

  ws.mergeCells('B6:B7');
  ws.getCell('B6').value = 'EQUIPO MÉDICO';

  ws.mergeCells('C6:C7');
  ws.getCell('C6').value = 'MARCA';

  ws.mergeCells('D6:D7');
  ws.getCell('D6').value = 'MODELO';

  ws.mergeCells('E6:E7');
  ws.getCell('E6').value = 'NÚMERO DE\nSERIE';

  ws.mergeCells('F6:F7');
  ws.getCell('F6').value = 'UBICACIÓN\nESPECÍFICA';

  ws.mergeCells('G6:H6');
  ws.getCell('G6').value = 'FUNCIONAMIENTO';

  ws.mergeCells('I6:J6');
  ws.getCell('I6').value = 'SENSORES';

  ws.mergeCells('K6:L6');
  ws.getCell('K6').value = 'REQUIERE\nREPARACIÓN';

  ws.mergeCells('M6:M7');
  ws.getCell('M6').value = 'FECHA';

  ws.mergeCells('N6:N7');
  ws.getCell('N6').value = 'OBSERVACIONES';

  ws.getCell('G7').value = 'CORRECTO';
  ws.getCell('H7').value = 'INCORRECTO';
  ws.getCell('I7').value = 'CORRECTO';
  ws.getCell('J7').value = 'INCORRECTO';
  ws.getCell('K7').value = 'SI';
  ws.getCell('L7').value = 'NO';

  styleCellRange(ws, 6, 7, 1, 14, (cell) => {
    cell.border = mediumBorder;
    cell.font = { name: 'Arial', size: 8.5, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };
  });

  // ===== DATOS =====
  rows.forEach((r, idx) => {
    const rowNumber = 8 + idx;
    const row = ws.getRow(rowNumber);

    row.values = [
      r.numero_inventario || r.inventario || r.inv || '',
      r.equipo || r.nombre_equipo || r.nombre || '',
      r.marca || '',
      r.modelo || '',
      r.numero_serie || r.serie || '',
      r.ubicacion_especifica || r.ubicacion || '',
      r.funcionamiento_correcto ? 'X' : '',
      r.funcionamiento_incorrecto ? 'X' : '',
      r.sensores_correcto ? 'X' : '',
      r.sensores_incorrecto ? 'X' : '',
      r.requiere_reparacion_si ? 'X' : '',
      r.requiere_reparacion_no ? 'X' : '',
      fecha,
      r.observaciones || '',
    ];

    row.height = 30;

    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [2, 14].includes(colNumber) ? 'left' : 'center',
        wrapText: true,
      };
    });
  });

  // si no hay filas, deja una vacía con borde
  if (!rows.length) {
    const row = ws.getRow(8);
    row.values = ['', '', '', '', '', '', '', '', '', '', '', '', fecha, ''];
    row.height = 28;
    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [2, 14].includes(colNumber) ? 'left' : 'center',
        wrapText: true,
      };
    });
  }

  // ===== LOGOS =====
  await addInstitutionalImages(
    wb,
    ws,
    { tl: { col: 0.5, row: 0.3 }, ext: { width: 130, height: 52 } },
    { tl: { col: 12.6, row: 0.25 }, ext: { width: 62, height: 62 } },
  );

  const buffer = await wb.xlsx.writeBuffer();
  await downloadBuffer(buffer, `bitacora_${nombre.replaceAll(' ', '_')}_${fecha}.xlsx`);
}