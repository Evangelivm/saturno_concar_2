import { NextRequest, NextResponse } from "next/server";
import { guardarDocumentosConCorrelativo, obtenerDocumentos, DocumentoDB } from "@/lib/db";

function generarNombreArchivo(correlativo: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const correlativoStr = String(correlativo).padStart(3, "0");

  return `RCP${year}${month}${day}${correlativoStr}.txt`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentos, fechaCliente } = body as {
      documentos: DocumentoDB[];
      fechaCliente?: string;
    };

    if (!documentos || !Array.isArray(documentos) || documentos.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron documentos" },
        { status: 400 }
      );
    }

    const resultado = await guardarDocumentosConCorrelativo(documentos, fechaCliente);
    const nombreArchivo = generarNombreArchivo(resultado.correlativo);

    return NextResponse.json({
      success: true,
      correlativo: resultado.correlativo,
      nombreArchivo,
      mensaje: `Se guardaron ${documentos.length} documentos con correlativo ${resultado.correlativo}`,
    });
  } catch (error) {
    console.error("Error al guardar documentos:", error);
    return NextResponse.json(
      { error: "Error al guardar los documentos en la base de datos" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const fechaDesde = searchParams.get("fechaDesde") || undefined;
    const fechaHasta = searchParams.get("fechaHasta") || undefined;

    const resultado = await obtenerDocumentos(limit, offset, fechaDesde, fechaHasta);

    return NextResponse.json({
      success: true,
      documentos: resultado.documentos,
      total: resultado.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error al obtener documentos:", error);
    return NextResponse.json(
      { error: "Error al obtener los documentos de la base de datos" },
      { status: 500 }
    );
  }
}
