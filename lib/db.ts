import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "saturno_concar",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export interface DocumentoDB {
  ruc_cliente: string;
  ruc_proveedor: string;
  tipo_documento: string;
  nro_documento: string;
  cod_interno_doc: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_confirmacion: string;
  importe: number;
  mon: string;
}

function generarNombreArchivo(correlativo: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const correlativoStr = String(correlativo).padStart(3, "0");

  return `RCP${year}${month}${day}${correlativoStr}.txt`;
}

export async function guardarDocumentosConCorrelativo(
  documentos: DocumentoDB[]
): Promise<{ correlativo: number; nombreArchivo: string; success: boolean }> {
  const connection = await pool.getConnection();

  try {
    // Iniciar transaccion SERIALIZABLE
    await connection.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await connection.beginTransaction();

    // Obtener la fecha actual
    const fechaHoy = new Date().toISOString().split("T")[0];

    // Obtener o crear el correlativo para hoy
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT ultimo_correlativo FROM correlativos WHERE fecha = ? FOR UPDATE",
      [fechaHoy]
    );

    let nuevoCorrelativo: number;

    if (rows.length === 0) {
      // No existe registro para hoy, crear uno nuevo con correlativo 1
      nuevoCorrelativo = 1;
      await connection.query(
        "INSERT INTO correlativos (fecha, ultimo_correlativo) VALUES (?, ?)",
        [fechaHoy, nuevoCorrelativo]
      );
    } else {
      // Existe registro, incrementar correlativo
      nuevoCorrelativo = rows[0].ultimo_correlativo + 1;
      await connection.query(
        "UPDATE correlativos SET ultimo_correlativo = ? WHERE fecha = ?",
        [nuevoCorrelativo, fechaHoy]
      );
    }

    // Generar nombre del archivo con el correlativo
    const nombreArchivo = generarNombreArchivo(nuevoCorrelativo);

    // Insertar todos los documentos con el mismo correlativo
    for (const doc of documentos) {
      await connection.query(
        `INSERT INTO documentos
          (correlativo, ruc_cliente, ruc_proveedor, tipo_documento, nro_documento,
           cod_interno_doc, fecha_emision, fecha_vencimiento, fecha_confirmacion,
           importe, mon, nombre_archivo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nuevoCorrelativo,
          doc.ruc_cliente,
          doc.ruc_proveedor,
          doc.tipo_documento,
          doc.nro_documento,
          doc.cod_interno_doc || null,
          doc.fecha_emision || null,
          doc.fecha_vencimiento || null,
          doc.fecha_confirmacion || null,
          doc.importe || 0,
          doc.mon,
          nombreArchivo,
        ]
      );
    }

    // Insertar registro en transacciones
    const importeTotal = documentos.reduce((sum, doc) => sum + (doc.importe || 0), 0);
    await connection.query(
      `INSERT INTO transacciones (correlativo, nombre_archivo, cantidad_registros, importe_total)
       VALUES (?, ?, ?, ?)`,
      [nuevoCorrelativo, nombreArchivo, documentos.length, importeTotal]
    );

    // Confirmar transaccion
    await connection.commit();

    return { correlativo: nuevoCorrelativo, nombreArchivo, success: true };
  } catch (error) {
    // Revertir en caso de error
    await connection.rollback();
    console.error("Error en transaccion:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export interface DocumentoDBResult {
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

export interface TransaccionResult {
  id: number;
  correlativo: number;
  nombre_archivo: string;
  cantidad_registros: number;
  importe_total: number;
  created_at: string;
}

export async function obtenerDocumentos(limit: number = 100, offset: number = 0): Promise<{
  documentos: DocumentoDBResult[];
  total: number;
}> {
  const connection = await pool.getConnection();

  try {
    // Obtener total de registros
    const [countResult] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM documentos"
    );
    const total = countResult[0].total;

    // Obtener documentos con paginacion
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT * FROM documentos ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return {
      documentos: rows as DocumentoDBResult[],
      total,
    };
  } finally {
    connection.release();
  }
}

export async function obtenerTransacciones(limit: number = 50, offset: number = 0): Promise<{
  transacciones: TransaccionResult[];
  total: number;
}> {
  const connection = await pool.getConnection();

  try {
    // Obtener total de registros
    const [countResult] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM transacciones"
    );
    const total = countResult[0].total;

    // Obtener transacciones con paginacion
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT * FROM transacciones ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return {
      transacciones: rows as TransaccionResult[],
      total,
    };
  } finally {
    connection.release();
  }
}

export default pool;
