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