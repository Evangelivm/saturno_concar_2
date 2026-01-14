-- =============================================
-- Base de datos: salomon
-- =============================================

-- Si necesitas crear la base de datos, descomenta las siguientes lineas:
-- CREATE DATABASE IF NOT EXISTS salomon
-- CHARACTER SET utf8mb4
-- COLLATE utf8mb4_unicode_ci;

USE salomon;

-- =============================================
-- Tabla: documentos
-- Almacena los registros de documentos contables
-- =============================================

CREATE TABLE IF NOT EXISTS documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    correlativo INT NOT NULL COMMENT 'Correlativo grupal de la transaccion',
    ruc_cliente VARCHAR(11) NOT NULL COMMENT 'RUC del cliente (11 digitos)',
    ruc_proveedor VARCHAR(11) NOT NULL COMMENT 'RUC del proveedor (11 digitos)',
    tipo_documento VARCHAR(2) NOT NULL COMMENT 'Tipo de documento (TD)',
    nro_documento VARCHAR(50) NOT NULL COMMENT 'Numero de documento',
    cod_interno_doc VARCHAR(50) DEFAULT NULL COMMENT 'Codigo interno del documento',
    fecha_emision DATE NOT NULL COMMENT 'Fecha de emision',
    fecha_vencimiento DATE DEFAULT NULL COMMENT 'Fecha de vencimiento',
    fecha_confirmacion DATE DEFAULT NULL COMMENT 'Fecha de confirmacion',
    importe DECIMAL(15, 4) NOT NULL COMMENT 'Importe del documento',
    mon VARCHAR(2) NOT NULL COMMENT 'Codigo de moneda',
    nombre_archivo VARCHAR(100) NOT NULL COMMENT 'Nombre del archivo TXT generado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creacion del registro',

    INDEX idx_correlativo (correlativo),
    INDEX idx_ruc_cliente (ruc_cliente),
    INDEX idx_ruc_proveedor (ruc_proveedor),
    INDEX idx_fecha_emision (fecha_emision),
    INDEX idx_nombre_archivo (nombre_archivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: correlativos
-- Control de correlativos por fecha
-- =============================================

CREATE TABLE IF NOT EXISTS correlativos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE COMMENT 'Fecha del correlativo',
    ultimo_correlativo INT NOT NULL DEFAULT 0 COMMENT 'Ultimo correlativo usado en esa fecha',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla: transacciones
-- Registro de transacciones/archivos generados
-- =============================================

CREATE TABLE IF NOT EXISTS transacciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    correlativo INT NOT NULL COMMENT 'Correlativo de la transaccion',
    nombre_archivo VARCHAR(100) NOT NULL COMMENT 'Nombre del archivo TXT generado',
    cantidad_registros INT NOT NULL COMMENT 'Cantidad de documentos en la transaccion',
    importe_total DECIMAL(15, 4) NOT NULL COMMENT 'Suma total de importes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creacion',

    INDEX idx_correlativo (correlativo),
    INDEX idx_nombre_archivo (nombre_archivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
