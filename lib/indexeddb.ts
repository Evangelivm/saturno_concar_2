const DB_NAME = "saturno_concar_db";
const DB_VERSION = 2;
const STORE_NAME = "documentos";
const CORRELATIVO_STORE = "correlativo";

export interface DocumentoRow {
  id: string;
  rucCliente: string;
  rucProveedor: string;
  tipoDocumento: string;
  nroDocumento: string;
  codInternoDoc: string;
  fechaEmision: string;
  fechaVencimiento: string;
  fechaConfirmacion: string;
  importe: string;
  moneda: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CORRELATIVO_STORE)) {
        db.createObjectStore(CORRELATIVO_STORE, { keyPath: "fecha" });
      }
    };
  });
}

export async function saveDocumentos(documentos: DocumentoRow[]): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  // Clear existing data
  store.clear();

  // Add all documents
  for (const doc of documentos) {
    store.put(doc);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function loadDocumentos(): Promise<DocumentoRow[]> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// Convierte fecha de YYYY-MM-DD a DD/MM/YYYY
function formatFecha(fecha: string): string {
  if (!fecha) return "          "; // 10 espacios
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

// Padding a la derecha con espacios
function padRight(str: string, length: number): string {
  return str.padEnd(length, " ");
}

// Padding a la izquierda con espacios
function padLeft(str: string, length: number): string {
  return str.padStart(length, " ");
}

export function generateTxtContent(documentos: DocumentoRow[]): string {
  const lines: string[] = [];

  for (const doc of documentos) {
    // Formato: (ruc cliente 11)(ruc proveedor 11)(TD 2)(nro documento 25)(fecha emision 10)(fecha venc 10)(fecha confirm 10)(importe 15)(mon 2)
    const line = [
      padRight(doc.rucCliente, 11),           // RUC Cliente: 11 chars
      padRight(doc.rucProveedor, 11),         // RUC Proveedor: 11 chars
      padRight(doc.tipoDocumento, 2),         // TD: 2 chars
      padRight(doc.nroDocumento, 25),         // Nro Documento: 25 chars
      formatFecha(doc.fechaEmision),          // Fecha Emisión: 10 chars (DD/MM/YYYY)
      formatFecha(doc.fechaVencimiento),      // Fecha Venc: 10 chars
      formatFecha(doc.fechaConfirmacion),     // Fecha Confirm: 10 chars
      padLeft(doc.importe, 15),               // Importe: 15 chars (alineado derecha)
      padRight(doc.moneda, 2),                // Mon: 2 chars
    ].join("");

    lines.push(line);
  }

  return lines.join("\n");
}

export interface GuardarDocumentosResponse {
  success: boolean;
  correlativo: number;
  nombreArchivo: string;
  mensaje: string;
  error?: string;
}

export async function guardarYGenerarTxt(documentos: DocumentoRow[]): Promise<{
  filename: string;
  content: string;
  correlativo: number;
}> {
  // Preparar documentos para la API
  const documentosParaAPI = documentos.map((doc) => ({
    ruc_cliente: doc.rucCliente,
    ruc_proveedor: doc.rucProveedor,
    tipo_documento: doc.tipoDocumento,
    nro_documento: doc.nroDocumento,
    cod_interno_doc: doc.codInternoDoc,
    fecha_emision: doc.fechaEmision || null,
    fecha_vencimiento: doc.fechaVencimiento || null,
    fecha_confirmacion: doc.fechaConfirmacion || null,
    importe: parseFloat(doc.importe) || 0,
    mon: doc.moneda,
  }));

  // Llamar a la API para guardar en BD y obtener correlativo
  const response = await fetch("/api/documentos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documentos: documentosParaAPI,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al guardar documentos");
  }

  const resultado: GuardarDocumentosResponse = await response.json();

  // Generar contenido del TXT
  const content = generateTxtContent(documentos);

  return {
    filename: resultado.nombreArchivo,
    content,
    correlativo: resultado.correlativo,
  };
}

export function downloadTxt(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
