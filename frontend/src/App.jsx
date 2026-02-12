import React, { useMemo, useState, useEffect } from "react";
import Header from "./components/Header.jsx";
import Modal from "./components/Modal.jsx";
import { useLocalStorageState } from "./components/useLocalStorageState.js";

import HomeView from "./views/HomeView.jsx";
import InventarioView from "./views/InventarioView.jsx";
import BitacoraView from "./views/BitacoraView.jsx";
import FormularioView from "./views/FormularioView.jsx";
import LoginView from "./views/LoginView.jsx";
import PerfilUsuariosView from "./views/PerfilUsuariosView";
import { apiFetch } from "./services/api.js";

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Convención del backend para el grupo "sin fecha"
const NULL_DATE_TOKEN = "__NULL__";

function BitacoraSheet({ sheet, onChangeRow }) {
  // sheet: { nombre, fecha|null, items: [...] }
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div><strong>{sheet?.nombre}</strong></div>
        <div className="small muted">Fecha: {sheet?.fecha || "SIN FECHA"} · Equipos: {sheet?.items?.length || 0}</div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th>Inventario</th>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>No. serie</th>
              <th>Ubicación</th>
              <th>Funcionamiento</th>
              <th>Sensores</th>
              <th>¿Requiere reparación?</th>
              <th>Observaciones</th>
            </tr>
          </thead>

          <tbody>
            {(sheet?.items || []).map((row, idx) => (
              <tr key={row.id_bitacora || `${row.id_equipo}-${idx}`}>
                <td>{row.numero_inventario || "—"}</td>
                <td>{row.equipo || "—"}</td>
                <td>{row.marca || "—"}</td>
                <td>{row.modelo || "—"}</td>
                <td>{row.numero_serie || "—"}</td>
                <td>{row.ubicacion_especifica || "—"}</td>

                <td>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={`func-${idx}`}
                        checked={!!row.funcionamiento_correcto}
                        onChange={() => onChangeRow(idx, { funcionamiento_correcto: true, funcionamiento_incorrecto: false })}
                      />
                      Correcto
                    </label>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={`func-${idx}`}
                        checked={!!row.funcionamiento_incorrecto}
                        onChange={() => onChangeRow(idx, { funcionamiento_correcto: false, funcionamiento_incorrecto: true })}
                      />
                      Incorrecto
                    </label>
                  </div>
                </td>

                <td>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={`sens-${idx}`}
                        checked={!!row.sensores_correcto}
                        onChange={() => onChangeRow(idx, { sensores_correcto: true, sensores_incorrecto: false })}
                      />
                      Correcto
                    </label>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={`sens-${idx}`}
                        checked={!!row.sensores_incorrecto}
                        onChange={() => onChangeRow(idx, { sensores_correcto: false, sensores_incorrecto: true })}
                      />
                      Incorrecto
                    </label>
                  </div>
                </td>

                <td>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={`rep-${idx}`}
                        checked={!!row.requiere_reparacion_si}
                        onChange={() => onChangeRow(idx, { requiere_reparacion_si: true, requiere_reparacion_no: false })}
                      />
                      Sí
                    </label>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={`rep-${idx}`}
                        checked={!!row.requiere_reparacion_no}
                        onChange={() => onChangeRow(idx, { requiere_reparacion_si: false, requiere_reparacion_no: true })}
                      />
                      No
                    </label>
                  </div>
                </td>

                <td style={{ minWidth: 240 }}>
                  <textarea
                    value={row.observaciones || ""}
                    onChange={(e) => onChangeRow(idx, { observaciones: e.target.value })}
                    rows={2}
                    style={{ width: "100%", resize: "vertical" }}
                    placeholder="Escribe observaciones..."
                  />
                </td>
              </tr>
            ))}

            {!sheet?.items?.length ? (
              <tr>
                <td colSpan={10} className="small muted">No hay registros para esta bitácora.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  // iniciar en login
  const [view, setView] = useState("login");

  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  });

  // Datos
  const [inventario, setInventario] = useState([]);

  // Bitácoras desde BD: agrupadas por fecha + sección sin fecha
  const [bitacorasIndex, setBitacorasIndex] = useState({ withFecha: [], sinFecha: [], nullToken: NULL_DATE_TOKEN });
  const [bitacoraSheet, setBitacoraSheet] = useState(null);

  // Otras secciones se quedan local (como ya las traías)
  const [formularios, setFormularios] = useLocalStorageState("formularios", []);
  const [pendientes, setPendientes] = useLocalStorageState("pendientes", []);
  const [terminados, setTerminados] = useLocalStorageState("terminados", []);

  // Modal
  const [modal, setModal] = useState({ open: false, title: "", body: null });
  function openModal(title, body) {
    setModal({ open: true, title, body });
  }
  function closeModal() {
    setModal({ open: false, title: "", body: null });
  }

  async function loadInventario() {
    const r = await apiFetch("/api/equipos");
    const mapped = (r.data || []).map((x) => ({
      id_equipo: x.id_equipo,
      numero_inventario: x.numero_inventario,
      nombre: x.nombre_equipo,
      marca: x.marca,
      area: x.nombre_area,
      activo: x.activo ? 1 : 0,
    }));
    setInventario(mapped);
  }

  async function loadBitacorasIndex() {
    const r = await apiFetch("/api/bitacoras");
    setBitacorasIndex(r.data || { withFecha: [], sinFecha: [], nullToken: NULL_DATE_TOKEN });
  }

  useEffect(() => {
    if (!auth) return;
    loadInventario().catch((e) => console.error("ERROR loadInventario:", e));
    loadBitacorasIndex().catch((e) => console.error("ERROR loadBitacoras:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  // Seeds opcionales para pendientes/terminados si vienen vacíos
  useEffect(() => {
    if (pendientes.length === 0) {
      setPendientes([
        { serie: "SN-001", nombre: "Monitor de signos vitales", fecha: isoDate(), area: "Urgencias", inventario: "INV-1001", reporto: "Enfermería" },
      ]);
    }
    if (terminados.length === 0) {
      setTerminados([
        { serie: "SN-010", nombre: "Cuna térmica", fecha_termino: isoDate(), area: "Neonatología", inventario: "INV-2001", tecnico: "Ing. López" },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inventario demo (sin backend)
  function upsertInventario(existing) {
    const initial = existing || { numero_inventario: "", nombre: "", marca: "", area: "", activo: 1 };
    let draft = { ...initial };

    openModal(existing ? "Editar inventario" : "Crear inventario", (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const inv = (draft.numero_inventario || "").trim();
          if (!inv) return alert("Ingrese número de inventario");

          setInventario((prev) => {
            const idx = prev.findIndex((x) => String(x.numero_inventario) === inv);
            const record = { ...draft, numero_inventario: inv, id_equipo: draft.id_equipo || Date.now() };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = record;
              return next;
            }
            return [record, ...prev];
          });
          closeModal();
          alert("Inventario guardado.");
        }}
      >
        <div><label>Número de inventario</label><input defaultValue={draft.numero_inventario} onChange={(e) => (draft.numero_inventario = e.target.value)} /></div>
        <div><label>Equipo</label><input defaultValue={draft.nombre} onChange={(e) => (draft.nombre = e.target.value)} /></div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><label>Marca</label><input defaultValue={draft.marca} onChange={(e) => (draft.marca = e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Área</label><input defaultValue={draft.area} onChange={(e) => (draft.area = e.target.value)} /></div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="nav-btn" onClick={closeModal}>Cancelar</button>
          <button type="submit" className="btn">{existing ? "Guardar" : "Crear"}</button>
        </div>
      </form>
    ));
  }

  function openInventarioDetail(item) {
    openModal(`Inventario ${item.numero_inventario || item.id_equipo}`, (
      <div>
        <strong>{item.nombre || "—"}</strong><br />
        Marca: {item.marca || "—"}<br />
        Área: {item.area || "—"}<br />
        Estado: {item.activo ? "Activado" : "Desactivado"}<br />
      </div>
    ));
  }

  function deleteInventario(item) {
    const key = item?.id_equipo || item?.numero_inventario;
    if (!key) return;
    setInventario((prev) => prev.filter((x) => (x?.id_equipo || x?.numero_inventario) !== key));
    alert("Inventario eliminado.");
  }

  function deleteInventarioMany(keys) {
    const setKeys = new Set(keys || []);
    setInventario((prev) => prev.filter((x) => !setKeys.has(x?.id_equipo || x?.numero_inventario)));
    alert("Inventarios eliminados.");
  }

  function downloadInventario(item) {
    const tipo = (prompt("¿Descargar como PDF o Excel? (pdf / excel)") || "").toLowerCase();
    if (tipo === "pdf") {
      const w = window.open("", "_blank");
      w.document.write(`<h2>Inventario ${item.numero_inventario || item.id_equipo}</h2>
        <p><strong>${item.nombre || ""}</strong></p>
        <p>Marca: ${item.marca || ""}</p>
        <p>Área: ${item.area || ""}</p>
        <p>Estado: ${item.activo ? "Activado" : "Desactivado"}</p>`);
      w.document.close();
      w.print();
      return;
    }

    if (tipo === "excel") {
      const rows = [["Inv", "Equipo", "Marca", "Área", "Estado"], [item.numero_inventario || item.id_equipo, item.nombre || "", item.marca || "", item.area || "", item.activo ? "Activado" : "Desactivado"]];
      const csv = rows.map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventario_${item.numero_inventario || item.id_equipo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // --- BITÁCORAS (BD) ---
  async function openBitacora(b) {
    const fechaToken = b.id || (b.fecha || NULL_DATE_TOKEN);
    const r = await apiFetch(`/api/bitacoras/sheet?fecha=${encodeURIComponent(fechaToken)}`);
    setBitacoraSheet(r.data);

    openModal(r.data?.nombre || "Bitácora", (
      <BitacoraSheet
        sheet={r.data}
        onChangeRow={(idx, patch) => updateBitacoraRow(idx, patch)}
      />
    ));
  }

  function createNewBitacora() {
    alert("En esta versión, las bitácoras se agrupan automáticamente por FECHA según los registros en la BD.");
  }

  function downloadBitacora() {
    alert("Descarga de bitácora: pendiente (si quieres, lo hacemos a PDF/Excel).");
  }

  async function updateBitacoraRow(idx, patch) {
    // Actualiza UI primero
    setBitacoraSheet((prev) => {
      if (!prev) return prev;
      const items = [...(prev.items || [])];
      const row = { ...items[idx], ...patch };

      // si cambian radios, mantenemos consistencia
      if (patch.funcionamiento_correcto) row.funcionamiento_incorrecto = false;
      if (patch.funcionamiento_incorrecto) row.funcionamiento_correcto = false;
      if (patch.sensores_correcto) row.sensores_incorrecto = false;
      if (patch.sensores_incorrecto) row.sensores_correcto = false;
      if (patch.requiere_reparacion_si) row.requiere_reparacion_no = false;
      if (patch.requiere_reparacion_no) row.requiere_reparacion_si = false;

      items[idx] = row;
      return { ...prev, items };
    });

    // Guarda en BD
    const row = bitacoraSheet?.items?.[idx];
    const payload = { ...row, ...patch, id_bitacora: row?.id_bitacora };
    if (!payload.id_bitacora) return; // esta UI solo edita registros existentes

    try {
      await apiFetch("/api/bitacoras/entry", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      // refresca índice para conteos (opcional)
      loadBitacorasIndex().catch(() => {});
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el cambio en la BD.");
    }
  }

  const bitacorasCount = (bitacorasIndex.withFecha?.length || 0) + (bitacorasIndex.sinFecha?.length || 0);
  const bitacorasForHome = useMemo(() => new Array(bitacorasCount).fill(null), [bitacorasCount]);

  const content = useMemo(() => {
    if (view === "home") {
      return <HomeView inventario={inventario} bitacoras={bitacorasForHome} onGoForm={() => setView("formulario")} onUpsertInventario={upsertInventario} />;
    }
    if (view === "inventario") {
      return (
        <InventarioView
          inventario={inventario}
          onOpenDetail={openInventarioDetail}
          onDownload={downloadInventario}
          onUpsert={upsertInventario}
          onDelete={deleteInventario}
          onDeleteMany={deleteInventarioMany}
        />
      );
    }
    if (view === "bitacora") {
      return (
        <BitacoraView
          bitacorasWithFecha={bitacorasIndex.withFecha || []}
          bitacorasSinFecha={bitacorasIndex.sinFecha || []}
          onNew={createNewBitacora}
          onOpen={openBitacora}
          onDownload={downloadBitacora}
        />
      );
    }
    if (view === "perfil") {
      return <PerfilUsuariosView />;
    }
    return <FormularioView pendientes={pendientes} setPendientes={setPendientes} terminados={terminados} setTerminados={setTerminados} />;
  }, [view, inventario, bitacorasForHome, bitacorasIndex, pendientes, terminados]);

  if (view === "login" || !auth) {
    return (
      <LoginView
        onLogin={() => {
          let nextAuth = null;
          try {
            nextAuth = JSON.parse(localStorage.getItem("auth") || "null");
          } catch {
            // ignore
          }
          setAuth(nextAuth);
          setView("home");
        }}
      />
    );
  }

  return (
    <>
      <Header
        view={view}
        setView={setView}
        onTrashClick={() => alert("Papelera (demo)")}
        onAddClick={() => setView("formulario")}
      />

      <main className="container">
        {content}
        <div className="footer small muted">Aplicación React · Inventario/Bitácoras conectadas a API.</div>
      </main>

      <Modal open={modal.open} title={modal.title} onClose={closeModal}>
        {modal.body}
      </Modal>
    </>
  );
}
