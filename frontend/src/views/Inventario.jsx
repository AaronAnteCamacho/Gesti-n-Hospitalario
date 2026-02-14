import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../components/Modal.jsx";
import "../styles/Inventario.css";

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
  // ✅ “marca” para confirmar que ESTE archivo es el que corre
  useEffect(() => {
    console.log("[InventarioView.jsx ACTIVO ✅]", {
      hasOnAdd: !!onAdd,
      hasOnEdit: !!onEdit,
      hasOnTrash: !!onTrash,
    });
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

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;

    const check = () => {
      const { overflow, canLeft, canRight } = getScrollState(el);
      setHasOverflow(overflow);

      if (overflow && !canRight && canLeft) setScrollDir("left");
      if (overflow && !canLeft && canRight) setScrollDir("right");
    };

    const onScroll = () => requestAnimationFrame(check);

    check();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", check);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", check);
    };
  }, [list.length]);

  function stepScroll() {
    const el = tableWrapRef.current;
    if (!el) return;

    const step = Math.floor(el.clientWidth * 0.85);
    const dir = scrollDir === "right" ? 1 : -1;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  function downloadAllInventario() {
    const type = prompt('Escribe "pdf" o "excel":', "pdf");
    if (!type) return;

    if (type.toLowerCase() === "excel") {
      const rows = [
        [
          "ID",
          "Inventario",
          "Equipo",
          "Marca",
          "Modelo",
          "Serie",
          "Ubicación",
          "Área",
          "Categoría",
          "Activo",
        ],
        ...list.map((it) => [
          it.id_equipo,
          it.numero_inventario,
          it.nombre_equipo,
          it.marca,
          it.modelo,
          it.numero_serie,
          it.ubicacion_especifica,
          it.nombre_area ?? it.id_area ?? "",
          it.nombre_categoria ?? it.id_categoria ?? "",
          it.activo ? "SI" : "NO",
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
      a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (type.toLowerCase() === "pdf") {
      const w = window.open("", "_blank");
      if (!w) return alert("Permite ventanas emergentes para imprimir.");
      w.document.write(`<h2>Inventario (${list.length})</h2>`);
      w.document.write("<pre>Usa imprimir del navegador</pre>");
      w.document.close();
      w.print();
      return;
    }

    alert('Escribe "pdf" o "excel".');
  }

  return (
    <section className="card inventario">
      <div className="inventario__header">
        <h2 className="inventario__title">Inventario</h2>

        <div className="inventario__headerActions">
          <button className="btn" onClick={() => (onAdd ? onAdd() : openAdd())}>
            Agregar
          </button>

          <button className="btn" onClick={downloadAllInventario}>
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

      {hasOverflow && (
        <div className="inventario__scrollHint">
          <span>Desliza para ver más columnas</span>

          <button type="button" className="inventario__scrollBtn" onClick={stepScroll}>
            <i
              className={
                scrollDir === "right"
                  ? "fa-solid fa-arrow-right"
                  : "fa-solid fa-arrow-left"
              }
            />
          </button>
        </div>
      )}

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
                      className="nav-btn inventario__sendBtn"
                      onClick={() => onReportFalla?.(it)}
                    >
                      Enviar a bitácora
                    </button>

                    <button className="btn" onClick={() => (onEdit ? onEdit(it) : openEdit(it))}>
                      Editar
                    </button>

                    <button className="btn danger" onClick={() => (onTrash ? onTrash(it) : remove(it))}>
                      Borrar
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

      <Modal
        open={open}
        title={editing ? `Editar equipo #${form.id_equipo}` : "Agregar equipo"}
        onClose={closeModal}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" onClick={closeModal} type="button" disabled={saving}>
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