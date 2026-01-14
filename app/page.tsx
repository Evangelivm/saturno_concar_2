"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DocumentoRow,
  saveDocumentos,
  loadDocumentos,
  guardarYGenerarTxt,
  downloadTxt,
} from "@/lib/indexeddb";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptyRow(): DocumentoRow {
  return {
    id: generateId(),
    rucCliente: "",
    rucProveedor: "",
    tipoDocumento: "",
    nroDocumento: "",
    codInternoDoc: "",
    fechaEmision: "",
    fechaVencimiento: "",
    fechaConfirmacion: "",
    importe: "",
    moneda: "",
  };
}

interface DocumentoDB {
  id: number;
  correlativo: number;
  ruc_cliente: string;
  ruc_proveedor: string;
  tipo_documento: string;
  nro_documento: string;
  cod_interno_doc: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  fecha_confirmacion: string | null;
  importe: number;
  mon: string;
  nombre_archivo: string;
  created_at: string;
}

function formatDateFromDB(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-PE");
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"nuevo" | "historial">("nuevo");
  const [rows, setRows] = useState<DocumentoRow[]>([createEmptyRow()]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ filename: string; correlativo: number } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Estado para historial
  const [dbDocumentos, setDbDocumentos] = useState<DocumentoDB[]>([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbPage, setDbPage] = useState(0);
  const dbLimit = 50;

  useEffect(() => {
    loadDocumentos()
      .then((data) => {
        if (data.length > 0) {
          setRows(data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const fetchHistorial = useCallback(async (page: number = 0) => {
    setDbLoading(true);
    setDbError(null);
    try {
      const response = await fetch(`/api/documentos?limit=${dbLimit}&offset=${page * dbLimit}`);
      if (!response.ok) throw new Error("Error al cargar historial");
      const data = await response.json();
      setDbDocumentos(data.documentos);
      setDbTotal(data.total);
    } catch (error) {
      setDbError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "historial") {
      fetchHistorial(dbPage);
    }
  }, [activeTab, dbPage, fetchHistorial]);

  const saveData = useCallback(async (newRows: DocumentoRow[]) => {
    setSaveStatus("saving");
    try {
      await saveDocumentos(newRows);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving:", error);
      setSaveStatus("error");
    }
  }, []);

  const handleFieldChange = (
    id: string,
    field: keyof DocumentoRow,
    value: string
  ) => {
    const newRows = rows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    setRows(newRows);
    saveData(newRows);
  };

  const addRow = () => {
    const newRows = [...rows, createEmptyRow()];
    setRows(newRows);
    saveData(newRows);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((row) => row.id !== id);
    setRows(newRows);
    saveData(newRows);
  };

  const handleGenerateTxt = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const { filename, content, correlativo } = await guardarYGenerarTxt(rows);
      downloadTxt(content, filename);
      setLastGenerated({ filename, correlativo });

      // Limpiar el formulario despues de generar exitosamente
      const newRows = [createEmptyRow()];
      setRows(newRows);
      saveData(newRows);

      // Refrescar historial si estamos en esa pestaña
      if (activeTab === "historial") {
        fetchHistorial(0);
        setDbPage(0);
      }
    } catch (error) {
      console.error("Error al generar TXT:", error);
      setGenerateError(error instanceof Error ? error.message : "Error al generar el archivo");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAll = () => {
    const newRows = [createEmptyRow()];
    setRows(newRows);
    saveData(newRows);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Registro de Documentos</h1>
              <p className="text-xs text-slate-500">Sistema de gestion contable</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Guardando...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-red-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Error al guardar
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab("nuevo")}
              className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "nuevo"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Registro
            </button>
            <button
              onClick={() => setActiveTab("historial")}
              className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "historial"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Historial
              {dbTotal > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {dbTotal}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab: Nuevo Registro */}
        {activeTab === "nuevo" && (
          <>
            {/* Action Bar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {rows.length} {rows.length === 1 ? "registro" : "registros"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Fila
                </button>

                <button
                  onClick={handleGenerateTxt}
                  disabled={isGenerating || rows.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Generar TXT
                    </>
                  )}
                </button>

                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Limpiar
                </button>
              </div>
            </div>

            {/* Alertas */}
            {generateError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-red-800">{generateError}</p>
                  <button
                    onClick={() => setGenerateError(null)}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {lastGenerated && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-emerald-800">
                    <span className="font-medium">Archivo generado:</span> {lastGenerated.filename} (Correlativo: {lastGenerated.correlativo})
                  </p>
                  <button
                    onClick={() => setLastGenerated(null)}
                    className="ml-auto text-emerald-600 hover:text-emerald-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Table Card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">RUC Cliente</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">RUC Proveedor</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">TD</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nro Documento</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cod Interno</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">F. Emision</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">F. Venc</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">F. Confirm</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Importe</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mon</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="group transition-colors hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="text" value={row.rucCliente} onChange={(e) => handleFieldChange(row.id, "rucCliente", e.target.value)} className="w-[120px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="20100000001" maxLength={11} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="text" value={row.rucProveedor} onChange={(e) => handleFieldChange(row.id, "rucProveedor", e.target.value)} className="w-[120px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="20100000002" maxLength={11} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="text" value={row.tipoDocumento} onChange={(e) => handleFieldChange(row.id, "tipoDocumento", e.target.value)} className="w-[60px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 text-center placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="01" maxLength={2} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="text" value={row.nroDocumento} onChange={(e) => handleFieldChange(row.id, "nroDocumento", e.target.value)} className="w-[130px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="F001-00001" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="text" value={row.codInternoDoc} onChange={(e) => handleFieldChange(row.id, "codInternoDoc", e.target.value)} className="w-[100px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="COD001" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="date" value={row.fechaEmision} onChange={(e) => handleFieldChange(row.id, "fechaEmision", e.target.value)} className="w-[140px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="date" value={row.fechaVencimiento} onChange={(e) => handleFieldChange(row.id, "fechaVencimiento", e.target.value)} className="w-[140px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="date" value={row.fechaConfirmacion} onChange={(e) => handleFieldChange(row.id, "fechaConfirmacion", e.target.value)} className="w-[140px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="number" step="0.0001" value={row.importe} onChange={(e) => handleFieldChange(row.id, "importe", e.target.value)} className="w-[110px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 text-right tabular-nums placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0.0000" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <input type="text" inputMode="numeric" value={row.moneda} onChange={(e) => handleFieldChange(row.id, "moneda", e.target.value.replace(/\D/g, ""))} className="w-[60px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 text-center tabular-nums transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" maxLength={2} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-center">
                          <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0" title="Eliminar fila">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Los datos se guardan automaticamente en tu navegador</p>
                  <button onClick={addRow} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva fila
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{rows.length}</p>
                    <p className="text-xs text-slate-500">Total Registros</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">
                      {rows.reduce((sum, row) => sum + (parseFloat(row.importe) || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </p>
                    <p className="text-xs text-slate-500">Importe Total</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{rows.filter(r => r.fechaEmision).length}</p>
                    <p className="text-xs text-slate-500">Con Fecha Emision</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab: Historial */}
        {activeTab === "historial" && (
          <>
            {/* Action Bar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {dbTotal} registros en base de datos
                </span>
              </div>
              <button
                onClick={() => fetchHistorial(dbPage)}
                disabled={dbLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <svg className={`h-4 w-4 ${dbLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refrescar
              </button>
            </div>

            {dbError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">{dbError}</p>
              </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Corr.</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Archivo</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">RUC Cliente</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">RUC Proveedor</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">TD</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nro Documento</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">F. Emision</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Importe</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mon</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Creado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dbLoading ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                            <span className="text-sm text-slate-500">Cargando...</span>
                          </div>
                        </td>
                      </tr>
                    ) : dbDocumentos.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                          No hay registros en la base de datos
                        </td>
                      </tr>
                    ) : (
                      dbDocumentos.map((doc) => (
                        <tr key={doc.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-indigo-600">{doc.correlativo}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-600">{doc.nombre_archivo}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-900">{doc.ruc_cliente}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-900">{doc.ruc_proveedor}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-900">{doc.tipo_documento}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-900">{doc.nro_documento}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-600">{formatDateFromDB(doc.fecha_emision)}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-900 text-right tabular-nums">{doc.importe.toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-900">{doc.mon}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-500">{formatDateFromDB(doc.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {dbTotal > dbLimit && (
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Mostrando {dbPage * dbLimit + 1} - {Math.min((dbPage + 1) * dbLimit, dbTotal)} de {dbTotal}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDbPage(Math.max(0, dbPage - 1))}
                        disabled={dbPage === 0 || dbLoading}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setDbPage(dbPage + 1)}
                        disabled={(dbPage + 1) * dbLimit >= dbTotal || dbLoading}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-400">
            Sistema de Registro de Documentos Contables
          </p>
        </div>
      </footer>
    </div>
  );
}
