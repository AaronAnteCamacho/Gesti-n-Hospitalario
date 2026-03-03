import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../components/Modal.jsx";
import ExportPickerModal from "../components/ExportPickerModal.jsx";
import "../styles/ExportPickerModal.css";
import "../styles/Inventario.css";
import logoLeft from "../assets/logo_left.png";
import logoRight from "../assets/logo_right.png";
import reporteFallaIcon from "../assets/reporte_falla.png";
import editIcon from "../assets/edit_icon.png";
import recyclingIcon from "../assets/recycling_icon.png";
// import html2pdf from "html2pdf.js";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getScrollState(el) {
  const overflow = el.scrollWidth > el.clientWidth + 2;
  const canLeft = overflow && el.scrollLeft > 2;
  const canRight =
    overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
  return { overflow, canLeft, canRight };
}

const emptyForm = {
  id_equipo: null,
  numero_inventario: "",
  nombre_equipo: "",
  marca: "",
  modelo: "",
  numero_serie: "",
  ubicacion_especifica: "",
  id_area: "",
  id_categoria: "",
  activo: true,
};

export default function InventarioView({
  inventario: inventarioProp = [],
  areas = [],
  categorias = [],
  onReportFalla,

  // ✅ handlers desde App
  onAdd,
  onEdit,
  onTrash,

  // opcionales (fallback interno)
  onCreate,
  onUpdate,
  onDelete,
}) {
  useEffect(() => {
    // ✅ “marca” para confirmar que ESTE archivo es el que corre
    console.log("[InventarioView.jsx ACTIVO ✅]", {
      hasOnAdd: !!onAdd,
      hasOnEdit: !!onEdit,
      hasOnTrash: !!onTrash,
    });

    // ===== calcula altura del header y la guarda en CSS var =====
    const setHdr = () => {
      const hdr =
        document.querySelector(".hdr") ||
        document.querySelector("header") ||
        document.querySelector(".appHeader") ||
        document.querySelector(".header");

      const h = hdr ? Math.ceil(hdr.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty("--hdr-h", `${h}px`);
    };

    setHdr();
    window.addEventListener("resize", setHdr);
    return () => window.removeEventListener("resize", setHdr);
  }, [onAdd, onEdit, onTrash]);

  const [inventario, setInventario] = useState(inventarioProp);
  useEffect(() => setInventario(inventarioProp), [inventarioProp]);

  const [filterText, setFilterText] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  // ===== Modal interno fallback =====
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ✅ modal selector PDF/Excel
  const [openExport, setOpenExport] = useState(false);

  function openAdd() {
    setEditing(false);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(item) {
    setEditing(true);
    setForm({
      id_equipo: item.id_equipo,
      numero_inventario: item.numero_inventario ?? "",
      nombre_equipo: item.nombre_equipo ?? "",
      marca: item.marca ?? "",
      modelo: item.modelo ?? "",
      numero_serie: item.numero_serie ?? "",
      ubicacion_especifica: item.ubicacion_especifica ?? "",
      id_area: item.id_area ?? "",
      id_categoria: item.id_categoria ?? "",
      activo: !!item.activo,
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
  }

  async function save() {
    if (!String(form.numero_inventario).trim()) return alert("Falta Inventario");
    if (!String(form.nombre_equipo).trim())
      return alert("Falta Nombre del equipo");

    setSaving(true);
    try {
      const payload = {
        numero_inventario: form.numero_inventario,
        nombre_equipo: form.nombre_equipo,
        marca: form.marca,
        modelo: form.modelo,
        numero_serie: form.numero_serie,
        ubicacion_especifica: form.ubicacion_especifica,
        id_area: form.id_area ? Number(form.id_area) : null,
        id_categoria: form.id_categoria ? Number(form.id_categoria) : null,
        activo: !!form.activo,
      };

      if (!editing) {
        if (onCreate) {
          const created = await onCreate(payload);
          setInventario((prev) => [created, ...prev]);
        } else {
          const created = { ...payload, id_equipo: Date.now() };
          setInventario((prev) => [created, ...prev]);
        }
      } else {
        if (onUpdate) {
          const updated = await onUpdate(form.id_equipo, payload);
          setInventario((prev) =>
            prev.map((x) => (x.id_equipo === form.id_equipo ? updated : x))
          );
        } else {
          setInventario((prev) =>
            prev.map((x) =>
              x.id_equipo === form.id_equipo ? { ...x, ...payload } : x
            )
          );
        }
      }

      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!confirm("¿Borrar este equipo?")) return;
    try {
      if (onDelete) await onDelete(item.id_equipo);
      setInventario((prev) =>
        prev.filter((x) => x.id_equipo !== item.id_equipo)
      );
    } catch (e) {
      console.error(e);
      alert("Error al borrar");
    }
  }

  const list = useMemo(() => {
    const t = norm(filterText);
    return (inventario || []).filter((it) => {
      const okArea = !filterArea || String(it.id_area) === String(filterArea);
      const okCat =
        !filterCategoria || String(it.id_categoria) === String(filterCategoria);

      if (!t) return okArea && okCat;

      const hay =
        norm(it.numero_inventario).includes(t) ||
        norm(it.nombre_equipo).includes(t) ||
        norm(it.marca).includes(t) ||
        norm(it.modelo).includes(t) ||
        norm(it.numero_serie).includes(t) ||
        norm(it.ubicacion_especifica).includes(t) ||
        norm(it.nombre_area).includes(t) ||
        norm(it.nombre_categoria).includes(t);

      return okArea && okCat && hay;
    });
  }, [inventario, filterText, filterArea, filterCategoria]);

  // ===== flecha/scroll hint =====
  const tableWrapRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrollDir, setScrollDir] = useState("right");
  const hintRef = useRef(null);
  const tableWrapBoxRef = useRef(null); // para medir ancho/posición
  const [pinHint, setPinHint] = useState(false);
  const [pinStyle, setPinStyle] = useState({ top: 0, left: 0, width: 0 });
  const [hintH, setHintH] = useState(0);

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;

    const check = () => {
      const { overflow, canLeft, canRight } = getScrollState(el);
      setHasOverflow(overflow);

      if (overflow && !canRight && canLeft) setScrollDir("left");
      if (overflow && !canLeft && canRight) setScrollDir("right");
      if (!overflow) setScrollDir("right");
    };

    const onScroll = () => requestAnimationFrame(check);

    // ✅ recalcula después de renderizar la tabla (importante cuando cambian filtros)
    requestAnimationFrame(check);

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", check);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", check);
    };
  }, [list]); // ✅ antes: [list.length]

  function stepScroll() {
    const el = tableWrapRef.current;
    if (!el) return;

    const step = Math.floor(el.clientWidth * 0.85);
    const dir = scrollDir === "right" ? 1 : -1;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  // ✅ SOLO se ajustó para recibir "pdf" / "excel" desde el modal
  function downloadAllInventario(typeParam) {
    const type = String(typeParam || "").toLowerCase();
    if (!["pdf", "excel"].includes(type)) return;

    const safe = (v) =>
      String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    // Texto de filtros activos (para que salga en la cabecera)
    const areaName =
      areas?.find((a) => String(a.id_area) === String(filterArea))?.nombre_area ||
      (filterArea ? `ID ${filterArea}` : "TODAS");
    const catName =
      categorias?.find((c) => String(c.id_categoria) === String(filterCategoria))
        ?.nombre_categoria || (filterCategoria ? `ID ${filterCategoria}` : "TODAS");

    const filtroTexto = filterText?.trim() ? filterText.trim() : "";

    const fecha = new Date().toISOString().slice(0, 10);

    if (type === "excel") {
      // Cabecera tipo Excel (líneas arriba) + tabla
      const rows = [
        ['SERVICIOS DE SALUD DEL INSTITUTO MEXICANO DEL SEGURO SOCIAL PARA EL BIENESTAR'],
        ['UNIDAD DE INFRAESTRUCTURA'],
        ['COORDINACIÓN DE EQUIPAMIENTO PARA ESTABLECIMIENTOS DE SALUD'],
        [''],
        [`FECHA DESCARGA: ${fecha}`],
        [`FILTRO ÁREA: ${areaName} | FILTRO CATEGORÍA: ${catName}${filtroTexto ? " | BÚSQUEDA: " + filtroTexto : ""}`],
        [''],
        [
          "N.P.",
          "No. DE INVENTARIO",
          "ENTIDAD FEDERATIVA",
          "CLUES",
          "UNIDAD MÉDICA",
          "ESPECIALIDAD/ÁREA DEL HOSPITAL",
          "UBICACIÓN ESPECÍFICA",
          "CATEGORÍA",
          "CLAVE CNIS",
          "EQUIPO MÉDICO",
          "MARCA",
          "MODELO",
          "NÚMERO DE SERIE",
          "ESTATUS",
        ],
        ...list.map((it, idx) => [
          idx + 1,
          it.numero_inventario ?? "",
          "NAYARIT",
          "NTIMB001246",
          'HOSPITAL CIVIL DR. ANTONIO GONZÁLEZ GUEVARA NTIMB001246',
          it.nombre_area ?? it.id_area ?? "",
          it.ubicacion_especifica ?? "",
          it.nombre_categoria ?? it.id_categoria ?? "",
          it.clave_cnis ?? "S/N",
          it.nombre_equipo ?? "",
          it.marca ?? "",
          it.modelo ?? "",
          it.numero_serie ?? "",
          it.activo ? "PROPIO" : "BAJA",
        ]),
      ];

      const csv = rows
        .map((r) =>
          r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventario_${fecha}_FILTRADO.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (type === "pdf") {
      const w = window.open("", "_blank");
      if (!w) return alert("Permite ventanas emergentes para imprimir.");

      const headerHTML = `
  <div class="hdr">
  <img class="hdr-logo" src="${logoLeft}" alt="Logo izquierda" />

  <div class="hdr-center">
    <div class="h1">SERVICIOS DE SALUD DEL INSTITUTO MEXICANO DEL SEGURO SOCIAL PARA EL BIENESTAR</div>
    <div class="h2">UNIDAD DE INFRAESTRUCTURA</div>
    <div class="h3">COORDINACIÓN DE EQUIPAMIENTO PARA ESTABLECIMIENTOS DE SALUD</div>
  </div>

  <img class="hdr-logo" src="${logoRight}" alt="Logo derecha" />
</div>
`;

      const tableRows = list
        .map(
          (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${safe(it.numero_inventario)}</td>
          <td>NAYARIT</td>
          <td>NTIMB001246</td>
          <td>HOSPITAL CIVIL DR. ANTONIO GONZÁLEZ GUEVARA NTIMB001246</td>
          <td>${safe(it.nombre_area ?? it.id_area ?? "")}</td>
          <td>${safe(it.ubicacion_especifica ?? "")}</td>
          <td>${safe(it.nombre_categoria ?? it.id_categoria ?? "")}</td>
          <td>${safe(it.clave_cnis ?? "S/N")}</td>
          <td>${safe(it.nombre_equipo ?? "")}</td>
          <td>${safe(it.marca ?? "")}</td>
          <td>${safe(it.modelo ?? "")}</td>
          <td>${safe(it.numero_serie ?? "")}</td>
          <td>${it.activo ? "PROPIO" : "BAJA"}</td>
        </tr>`
        )
        .join("");

      w.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Inventario filtrado</title>
          <style>
            body{font-family:Arial,Helvetica,sans-serif;padding:18px;}
            .hdr{
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              width: 100%;
            }

            .hdr-logo{
              width: 70px;
              height: auto;
              object-fit: contain;
              flex: 0 0 auto;
            }

            .hdr-center{
              flex: 1;
              text-align: center;
            }
            .h1{font-weight:800;font-size:14px;}
            .h2{font-weight:800;font-size:13px;margin-top:3px;}
            .h3{font-weight:800;font-size:13px;margin-top:3px;}
            .meta{text-align:left;margin:10px auto 0;max-width:980px;font-size:12px;color:#222;}
            table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;}
            th,td{border:1px solid #333;padding:6px;vertical-align:top;}
            th{background:#f2f2f2}
            @media print{
              body{padding:0}
              .hdr{margin-bottom:8px}
            }
          </style>
        </head>
        <body>
          ${headerHTML}
          <table>
            <thead>
              <tr>
                <th>N.P.</th>
                <th>No. DE INVENTARIO</th>
                <th>ENTIDAD</th>
                <th>CLUES</th>
                <th>UNIDAD MÉDICA</th>
                <th>ESPECIALIDAD/ÁREA</th>
                <th>UBICACIÓN</th>
                <th>CATEGORÍA</th>
                <th>CLAVE CNIS</th>
                <th>EQUIPO MÉDICO</th>
                <th>MARCA</th>
                <th>MODELO</th>
                <th>NÚMERO DE SERIE</th>
                <th>ESTATUS</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="14">Sin registros para imprimir.</td></tr>`}
            </tbody>
          </table>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);
      w.document.close();
      return;
    }
  }

  return (
    <section className="card inventario">
      <div className="inventario__header">
        <h2 className="inventario__title">Inventario</h2>

        <div className="inventario__headerActions">
          <button className="btn" onClick={() => (onAdd ? onAdd() : openAdd())}>
            Agregar
          </button>

          {/* ✅ SOLO abre el modal selector */}
          <button className="btn" onClick={() => setOpenExport(true)}>
            <i className="fa-solid fa-download" style={{ marginRight: 8 }} />
            Descargar todo
          </button>
        </div>
      </div>

      <div className="card inventario__filters">
        <label>Buscar / filtrar</label>

        <div className="inventario__filtersRow">
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Inventario, nombre, marca, modelo, serie..."
          />

          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="">Área (todas)</option>
            {areas.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre_area}
              </option>
            ))}
          </select>

          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
          >
            <option value="">Categoría (todas)</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre_categoria}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="inventario__scrollHint">
        <span>Desliza para ver más columnas</span>

        <button
          type="button"
          className="inventario__scrollBtn"
          onClick={stepScroll}
          disabled={!hasOverflow}
          title={!hasOverflow ? "No hay más columnas por mostrar" : "Desplazar"}
        >
          <i
            className={
              scrollDir === "right"
                ? "fa-solid fa-arrow-right"
                : "fa-solid fa-arrow-left"
            }
          />
        </button>
      </div>

      <div className="inventario__tableWrap" ref={tableWrapRef}>
        <table className="table">
          <thead>
            <tr>
              <th>Inventario</th>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Serie</th>
              <th>Ubicación</th>
              <th>Área</th>
              <th>Categoría</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {list.map((it) => (
              <tr key={it.id_equipo}>
                <td>{it.numero_inventario}</td>
                <td>{it.nombre_equipo}</td>
                <td>{it.marca}</td>
                <td>{it.modelo}</td>
                <td>{it.numero_serie}</td>
                <td>{it.ubicacion_especifica}</td>
                <td>{it.nombre_area ?? it.id_area}</td>
                <td>{it.nombre_categoria ?? it.id_categoria}</td>
                <td>{it.activo ? "Sí" : "No"}</td>

                <td>
                  <div className="inventario__acciones">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onReportFalla?.(it)}
                      title="Reporte de falla"
                      aria-label="Reporte de falla"
                    >
                      <img src={reporteFallaIcon} alt="" />
                    </button>

                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => (onEdit ? onEdit(it) : openEdit(it))}
                      title="Editar"
                      aria-label="Editar"
                    >
                      <img src={editIcon} alt="" />
                    </button>

                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => (onTrash ? onTrash(it) : remove(it))}
                      title="Borrar"
                      aria-label="Borrar"
                    >
                      <img src={recyclingIcon} alt="" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!list.length && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 16 }}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ AQUÍ VA TU MODAL NUEVO (PDF/EXCEL) */}
      <ExportPickerModal
        open={openExport}
        title="Descargar inventario"
        onClose={() => setOpenExport(false)}
        onPick={(type) => {
          setOpenExport(false);
          downloadAllInventario(type);
        }}
      />

      <Modal
        open={open}
        title={editing ? `Editar equipo #${form.id_equipo}` : "Agregar equipo"}
        onClose={closeModal}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              className="btn ghost"
              onClick={closeModal}
              type="button"
              disabled={saving}
            >
              Cancelar
            </button>
            <button className="btn" onClick={save} type="button" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}