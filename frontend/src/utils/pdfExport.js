import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAndShareFile } from "./mobileFiles.js";

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

function drawPageNumber(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, 285, 205, { align: "right" });
  }
}

export async function exportInventarioPdf({
  items = [],
  fecha = "",
  areaName = "TODAS",
  catName = "TODAS",
  filtroTexto = "",
  logoLeftUrl,
  logoRightUrl,
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  let leftImg = null;
  let rightImg = null;

  try {
    [leftImg, rightImg] = await Promise.all([
      imageUrlToBase64(logoLeftUrl),
      imageUrlToBase64(logoRightUrl),
    ]);
  } catch (e) {
    console.warn("No se pudieron cargar logos para PDF:", e);
  }

  if (leftImg) doc.addImage(leftImg, "PNG", 8, 6, 28, 14);
  if (rightImg) doc.addImage(rightImg, "PNG", 266, 5, 16, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "SERVICIOS DE SALUD DEL INSTITUTO MEXICANO DEL SEGURO SOCIAL PARA EL BIENESTAR",
    148,
    10,
    { align: "center" }
  );
  doc.text("UNIDAD DE INFRAESTRUCTURA", 148, 15, { align: "center" });
  doc.text(
    "COORDINACIÓN DE EQUIPAMIENTO PARA ESTABLECIMIENTOS DE SALUD",
    148,
    20,
    { align: "center" }
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Fecha: ${fecha}`, 8, 28);
  doc.text(`Área: ${areaName}`, 55, 28);
  doc.text(`Categoría: ${catName}`, 120, 28);
  doc.text(`Búsqueda: ${filtroTexto || "Sin filtro"}`, 190, 28);
  doc.text(`Registros: ${items.length}`, 260, 28);

  const head = [[
    "N.P.",
    "NO. INVENTARIO",
    "ENTIDAD",
    "CLUES",
    "UNIDAD MÉDICA",
    "ESPECIALIDAD/ÁREA",
    "UBICACIÓN",
    "CATEGORÍA",
    "CLAVE CNIS",
    "EQUIPO MÉDICO",
    "MARCA",
    "MODELO",
    "NÚMERO DE SERIE",
    "ESTATUS",
  ]];

  const body = items.map((it, idx) => [
    idx + 1,
    it.numero_inventario ?? "",
    "NAYARIT",
    "NTIMB001246",
    "HOSPITAL CIVIL DR. ANTONIO GONZÁLEZ GUEVARA",
    it.nombre_area ?? it.id_area ?? "",
    it.ubicacion_especifica ?? "",
    it.nombre_categoria ?? it.id_categoria ?? "",
    it.clave_cnis ?? "S/N",
    it.nombre_equipo ?? "",
    it.marca ?? "",
    it.modelo ?? "",
    it.numero_serie ?? "",
    it.activo ? "PROPIO" : "BAJA",
  ]);

  autoTable(doc, {
    startY: 32,
    head,
    body: body.length ? body : [["", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
    theme: "grid",
    margin: { left: 5, right: 5 },
    styles: {
      font: "helvetica",
      fontSize: 6.4,
      cellPadding: 1.2,
      overflow: "linebreak",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [47, 117, 181],
      textColor: [255, 255, 255],
      halign: "center",
      valign: "middle",
      fontStyle: "bold",
      fontSize: 6.6,
    },
    bodyStyles: {
      textColor: [20, 20, 20],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 18 },
      2: { cellWidth: 13, halign: "center" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 28 },
      5: { cellWidth: 21 },
      6: { cellWidth: 22 },
      7: { cellWidth: 18 },
      8: { cellWidth: 18, halign: "center" },
      9: { cellWidth: 31 },
      10: { cellWidth: 16 },
      11: { cellWidth: 16 },
      12: { cellWidth: 22 },
      13: { cellWidth: 14, halign: "center" },
    },
    didDrawPage: () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    },
  });

  drawPageNumber(doc);

  const buffer = doc.output("arraybuffer");
  await saveAndShareFile({
    buffer,
    filename: `inventario_${fecha}_FILTRADO.pdf`,
    mimeType: "application/pdf",
  });
}

export async function exportBitacoraPdf({
  bitacora,
  logoLeftUrl,
  logoRightUrl,
}) {
  const rows = bitacora?.items?.length ? bitacora.items : [];
  const fecha = bitacora?.fecha || new Date().toISOString().slice(0, 10);
  const nombre = (bitacora?.nombre || "BITÁCORA DE REVISIÓN").toUpperCase();

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  let leftImg = null;
  let rightImg = null;

  try {
    [leftImg, rightImg] = await Promise.all([
      imageUrlToBase64(logoLeftUrl),
      imageUrlToBase64(logoRightUrl),
    ]);
  } catch (e) {
    console.warn("No se pudieron cargar logos para PDF:", e);
  }

  if (leftImg) doc.addImage(leftImg, "PNG", 8, 6, 28, 14);
  if (rightImg) doc.addImage(rightImg, "PNG", 266, 5, 16, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text('HOSPITAL DE ESPECIALIDADES "DR. ANTONIO GONZALEZ GUEVARA"', 148, 10, {
    align: "center",
  });
  doc.text("AREA DE MANTENIMIENTO", 148, 15, { align: "center" });
  doc.text(nombre, 148, 20, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Fecha: ${fecha}`, 8, 28);
  doc.text(`Nº de artículos: ${rows.length}`, 55, 28);

  const head = [[
    "NO. INVENTARIO",
    "EQUIPO MÉDICO",
    "MARCA",
    "MODELO",
    "NÚMERO DE SERIE",
    "UBICACIÓN ESPECÍFICA",
    "FUNC. CORRECTO",
    "FUNC. INCORRECTO",
    "SENS. CORRECTO",
    "SENS. INCORRECTO",
    "REP. SÍ",
    "REP. NO",
    "FECHA",
    "OBSERVACIONES",
  ]];

  const body = rows.map((r) => [
    r.numero_inventario || r.inventario || r.inv || "",
    r.equipo || r.nombre_equipo || r.nombre || "",
    r.marca || "",
    r.modelo || "",
    r.numero_serie || r.serie || "",
    r.ubicacion_especifica || r.ubicacion || "",
    r.funcionamiento_correcto ? "X" : "",
    r.funcionamiento_incorrecto ? "X" : "",
    r.sensores_correcto ? "X" : "",
    r.sensores_incorrecto ? "X" : "",
    r.requiere_reparacion_si ? "X" : "",
    r.requiere_reparacion_no ? "X" : "",
    fecha,
    r.observaciones || "",
  ]);

  autoTable(doc, {
    startY: 32,
    head,
    body: body.length ? body : [["", "", "", "", "", "", "", "", "", "", "", "", fecha, ""]],
    theme: "grid",
    margin: { left: 5, right: 5 },
    styles: {
      font: "helvetica",
      fontSize: 6.4,
      cellPadding: 1.2,
      overflow: "linebreak",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [217, 217, 217],
      textColor: [20, 20, 20],
      halign: "center",
      valign: "middle",
      fontStyle: "bold",
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 34 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 20 },
      5: { cellWidth: 23 },
      6: { cellWidth: 13, halign: "center" },
      7: { cellWidth: 13, halign: "center" },
      8: { cellWidth: 13, halign: "center" },
      9: { cellWidth: 13, halign: "center" },
      10: { cellWidth: 10, halign: "center" },
      11: { cellWidth: 10, halign: "center" },
      12: { cellWidth: 16, halign: "center" },
      13: { cellWidth: 29 },
    },
  });

  drawPageNumber(doc);

  const buffer = doc.output("arraybuffer");
  await saveAndShareFile({
    buffer,
    filename: `bitacora_${nombre.replaceAll(" ", "_")}_${fecha}.pdf`,
    mimeType: "application/pdf",
  });
}


export async function exportServicioPdf({
  servicio,
  fechaTermino,
  logoLeftUrl,
  logoRightUrl,
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const s = servicio || {};

  const toText = (v) => String(v ?? "").trim();
  const up = (v) => toText(v).toUpperCase();

  const fmtDate = (value) => {
    const v = toText(value);
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [yy, mm, dd] = v.split("-");
      return `${dd}/${mm}/${yy}`;
    }
    return v;
  };

  const safeInv = toText(s.inv || s.inventario || "S/N");
  const fechaBase = fechaTermino || new Date().toISOString().slice(0, 10)
const fechaInicio = fmtDate(s.inicio)
const fechaFin = fmtDate(fechaBase)
const fechaDoc = fmtDate(fechaBase)

  let leftImg = null;
  let rightImg = null;

  try {
    [leftImg, rightImg] = await Promise.all([
      imageUrlToBase64(logoLeftUrl),
      imageUrlToBase64(logoRightUrl),
    ]);
  } catch (e) {
    console.warn("No se pudieron cargar los logos:", e);
  }

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.5);

  // Helpers
  const rect = (x, y, w, h) => doc.rect(x, y, w, h);

  const textCenter = (txt, x, y, w, h, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 9);
    doc.text(String(txt || ""), x + w / 2, y + h / 2 + 1.3, { align: "center" });
  };

  const textLeft = (txt, x, y, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 9);
    doc.text(String(txt || ""), x, y);
  };

  const drawPairRow = (y, leftLabel, leftValue, rightLabel, rightValue) => {
    const x = 12;
    const h = 10;
    const w1 = 38;
    const w2 = 55;
    const w3 = 46;
    const w4 = 47;

    rect(x, y, w1, h);
    rect(x + w1, y, w2, h);
    rect(x + w1 + w2, y, w3, h);
    rect(x + w1 + w2 + w3, y, w4, h);

    textLeft(up(leftLabel), x + 2, y + 6.2, { bold: true, size: 8.8 });
    textLeft(up(leftValue), x + w1 + 2, y + 6.2, { bold: true, size: 8.8 });

    textLeft(up(rightLabel), x + w1 + w2 + 2, y + 6.2, { bold: true, size: 8.8 });
    textLeft(up(rightValue), x + w1 + w2 + w3 + 2, y + 6.2, { bold: true, size: 8.8 });
  };

  const drawTopRow = (y) => {
    const x = 12;
    const h = 18;
    const w1 = 38;
    const w2 = 82;
    const w3 = 20;
    const w4 = 46;

    rect(x, y, w1, h);
    rect(x + w1, y, w2, h);
    rect(x + w1 + w2, y, w3, h);
    rect(x + w1 + w2 + w3, y, w4, h);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("ÁREA A REALIZAR EL", x + 2, y + 7);
    doc.text("SERVICIO", x + 2, y + 13);

    textLeft(up(s.area), x + w1 + 2, y + 10.8, { bold: true, size: 9.5 });
    textCenter("FECHA", x + w1 + w2, y, w3, h, { bold: true, size: 8.8 });
    textLeft(fechaDoc, x + w1 + w2 + w3 + 2, y + 10.8, { bold: true, size: 9.5 });
  };

  const drawFullRow = (y, h, label, value, valueX = 62) => {
    rect(12, y, 186, h);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${up(label)}:`, 15, y + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);

    const lines = doc.splitTextToSize(up(value), 198 - valueX - 6);
    doc.text(lines, valueX, y + 6.5);
  };

  const drawBottomBoxes = (y) => {
    const x = 12;
    const h = 24;
    const w = 93;

    rect(x, y, w, h);
    rect(x + w, y, w, h);

    textCenter("NOMBRE DE QUIEN REALIZA EL SERVICIO", x, y + 2, w, 8, {
      bold: true,
      size: 8.5,
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(up(s.tecnico || ""), x + 4, y + 18);

    textCenter("FIRMA DE CONFORMIDAD CON EL SERVICIO", x + w, y + 2, w, 8, {
      bold: true,
      size: 8.2,
    });

    // línea para firma
    doc.line(x + w + 10, y + 18, x + w + 83, y + 18);
  };

  // Logos
  if (leftImg) doc.addImage(leftImg, "PNG", 14, 9, 42, 13);
  if (rightImg) doc.addImage(rightImg, "PNG", 174, 8, 16, 16);

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("HOSPITAL DE ESPECIALIDADES", 105, 12, { align: "center" });
  doc.text('"DR. ANTONIO GONZALEZ GUEVARA"', 105, 18, { align: "center" });
  doc.text("ORDEN DE SERVICIO", 105, 26, { align: "center" });

  let y = 34;

  drawTopRow(y);
  y += 20;

  rect(12, y, 38, 10);
  rect(50, y, 148, 10);
  textLeft("NOMBRE DEL EQUIPO", 14, y + 6.2, { bold: true, size: 8.8 });
  textLeft(up(s.equipo || s.nombre), 52, y + 6.2, { bold: true, size: 8.8 });
  y += 12;

  drawPairRow(y, "MARCA", s.marca, "MODELO", s.modelo);
  y += 12;

  drawPairRow(y, "SERIE", s.serie || "/", "NUMERO DE INVENTARIO", safeInv);
  y += 12;

  drawPairRow(y, "INICIO", fechaInicio, "TERMINO", fechaFin);
  y += 12;

  drawFullRow(y, 10, "FALLA REPORTADA", s.falla, 64);
  y += 12;

  drawFullRow(y, 24, "ACTIVIDADES REALIZADAS", s.actividades, 77);
  y += 26;

  drawFullRow(y, 10, "REFACCIONES UTILIZADAS", s.refacciones, 78);
  y += 12;

  drawFullRow(y, 10, "OBSERVACIONES", s.observaciones, 58);
  y += 12;

  drawBottomBoxes(y);

  const filename = `orden_servicio_${safeInv || "sin_inventario"}_${(fechaTermino || new Date().toISOString().slice(0, 10))}.pdf`;

  const buffer = doc.output("arraybuffer");
  await saveAndShareFile({
    buffer,
    filename,
    mimeType: "application/pdf",
  });
}