# Configuración de Azure DevOps

Este directorio contiene archivos de configuración para la integración con Azure DevOps.

## Archivos

### `azure-pat.js` (REQUERIDO - Configurar manualmente)

**Propósito**: Almacena tu Personal Access Token (PAT) de Azure DevOps de forma estática.

**Configuración inicial**:

1. **Abre el archivo** `azure-pat.js` en tu editor
2. **Reemplaza** `"TU_PAT_AQUI"` con tu token real de Azure DevOps
3. **Guarda** el archivo

**Generar un PAT en Azure DevOps**:

1. Ve a: `https://dev.azure.com/{tu-organizacion}/_usersSettings/tokens`
2. Haz clic en **"New Token"**
3. Configura los permisos:
   - ✅ **Work Items**: Read, Write, Manage
   - ✅ **Wiki**: Read & Write
4. Establece una fecha de expiración (recomendado: 90 días)
5. Copia el token generado
6. Pégalo en `azure-pat.js` reemplazando `"TU_PAT_AQUI"`

**Ejemplo**:

```javascript
module.exports = {
  AZURE_DEVOPS_PAT: "abc123xyz456...",  // ← Tu token real aquí
  DEFAULT_ORGANIZATION: "hebmexico",
  DEFAULT_PROJECT: "Dev - Product and Technology"
};
```

**⚠️ SEGURIDAD**:

- ✅ Este archivo está en `.gitignore` y NO se subirá a git
- ✅ Nunca compartas este archivo públicamente
- ✅ Renueva tu PAT regularmente (cada 90 días)
- ✅ Si tu PAT expira, actualízalo en este archivo

---

### `productos.json`

**Propósito**: Define la configuración de productos y equipos para Azure DevOps.

**Estructura**: Ver documentación en `/docs/tba-architecture.md`

Este archivo SÍ se puede versionar en git (no contiene información sensible).

---

## Verificar Configuración

Para verificar que tu PAT está configurado correctamente:

```bash
# Verificar que el archivo existe
ls azure-pat.js

# Ejecutar el script de prueba (si existe)
node ../scripts/test-connection.js
```

Si ves errores como:

- `"TU_PAT_AQUI"` → Necesitas configurar tu PAT
- `401 Unauthorized` → Tu PAT es inválido o expiró
- `403 Forbidden` → Tu PAT no tiene los permisos requeridos

---

## Soporte

Si tienes problemas con la configuración del PAT:

1. Verifica que el token no haya expirado
2. Verifica que tenga los permisos correctos (Work Items + Wiki)
3. Asegúrate de copiar el token completo sin espacios
4. Prueba generando un nuevo PAT si persiste el problema
