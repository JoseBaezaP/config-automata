---
name: Implement Code
description: Ejecuta un plan de implementacion (implementation-plan.json) file por file, escribiendo codigo de produccion y tests que respetan la arquitectura detectada y los escenarios Gherkin de las HUs. Desencadenar cuando el plan de implementacion este aprobado y se necesite escribir el codigo, implementar los cambios, crear archivos y tests, o cuando el flujo Automata entre en la fase de ejecucion Track B.
---

# Skill: Implement Code

## Proposito

Ejecutar un plan de implementacion previamente aprobado, escribiendo codigo de produccion y tests fase por fase. Este skill NO toma decisiones arquitectonicas — sigue el plan al pie de la letra.

La separacion plan/implementacion existe porque:
1. El plan fue validado por el usuario y el orquestador
2. El implementor puede enfocarse solo en escribir codigo correcto
3. Si algo falla, se puede re-ejecutar sin re-planear

## Cuando Usar

- Despues de que el usuario apruebe `implementation-plan.json` (Gate 3)
- En la fase de ejecucion paralela (Track B)
- Cuando se pida "implementar el plan", "escribir el codigo", "ejecutar la implementacion"

## Entrada / Salida

**Entrada**:
- `nombre_iniciativa`: Nombre de la iniciativa
- **Requerido**: `tba-output/{nombre}/implementation-plan.json`
- **Requerido**: `tba-output/{nombre}/iniciativa.json` (para escenarios Gherkin)
- **Requerido**: `tba-output/{nombre}/architecture-constraints.json` (reglas + contexto del proyecto)

**Salida**:
- Archivos de codigo creados/modificados en el proyecto
- `tba-output/{nombre}/implementation-report.json`

---

## Proceso

### 1. Cargar Plan y Contexto

```
[Read: tba-output/{nombre}/implementation-plan.json]
[Read: tba-output/{nombre}/iniciativa.json]
[Read: tba-output/{nombre}/architecture-constraints.json]
```

Si `architecture-constraints.json` tiene `skillPath` y `referencePaths`, leer los archivos de referencia del skill de arquitectura para tener las convenciones completas.

### 2. Preparar Contexto de Patrones

Antes de escribir cualquier archivo, construir un "contexto de patrones" leyendo archivos similares existentes en el proyecto:

1. Para cada `layer` en el plan, buscar 2-3 archivos existentes en la misma capa:
   ```
   [Glob: src/modules/*/domain/entities/*.ts]     // para entender patron entity
   [Glob: src/modules/*/application/use-cases/*.ts]  // para entender patron use case
   [Glob: src/tests/modules/**/*.test.ts]           // para entender patron test
   ```

2. Leer esos archivos para extraer:
   - Imports comunes
   - Decoradores y patrones
   - Estructura de clases/funciones
   - Naming local
   - Patrones de export

3. El codigo generado DEBE mimetizar estos patrones. No inventar estilos nuevos.

### 3. Ejecutar Fase por Fase

Para cada `phase` en `implementationOrder`:

#### 3a. Para cada archivo en la fase:

**Si `action: "create"`:**
1. Verificar que el directorio padre existe (crear si no)
2. Leer `contentGuidance` y `architectureNotes` del plan
3. Leer `SugerenciaCodigo` de la tarea referenciada en HUs.json (si existe)
4. Escribir el archivo siguiendo:
   - Patrones observados en archivos similares
   - Reglas de `architecture-constraints.json`
   - Guidance del plan
   - Sugerencia de codigo de la HU (como base, no copiar ciegamente)
5. Validar que el archivo cumple con `criticalRules`

**Si `action: "modify"`:**
1. Leer el archivo existente completo
2. Identificar donde hacer el cambio segun `contentGuidance`
3. Aplicar el cambio preservando la estructura existente
4. Validar que no se rompio nada existente

#### 3b. Validacion post-fase:

Despues de completar todos los archivos de una fase:

1. Si hay archivos TypeScript, verificar que no hay errores de tipos:
   ```bash
   npx tsc --noEmit --pretty 2>&1 | head -50
   ```
   (Solo como verificacion, no bloquear si hay errores pre-existentes)

2. Registrar progreso en el report

### 4. Implementar Tests (Fase 6)

Los tests son especiales porque traducen Gherkin a codigo:

#### Traduccion Gherkin -> Test

Para cada test en `testPlan`:

1. Leer los `gherkinScenarios` del plan
2. Leer los escenarios completos en `iniciativa.json → grupos[].escenariosPrueba[]`
3. Traducir cada escenario:

```
Gherkin (espanol):
  Dado que busco un CP con cobertura en 1 tienda
  Cuando ejecuto el use case
  Entonces retorna 1 tienda

Test (jest):
  describe('LookupStoreByZipUseCase', () => {
    it('should return 1 store when zip code has coverage in 1 store', () => {
      // Arrange (Dado que)
      const mockRepo = { findByZipCode: jest.fn().mockResolvedValue([mockStore]) };
      const useCase = new LookupStoreByZipUseCase(mockRepo);

      // Act (Cuando)
      const result = await useCase.execute('25280');

      // Assert (Entonces)
      expect(result.stores).toHaveLength(1);
      expect(result.stores[0].name).toBe('HEB Saltillo Republica');
    });
  });
```

4. Usar `testingRules.patterns` para determinar:
   - Si mockear o no (domain = sin mocks, use case = mocks)
   - Que framework de mock usar
   - Estructura del describe/it

#### Ejecutar tests:

```bash
npx jest --testPathPattern="src/tests/modules/{module}" --passWithNoTests 2>&1
```

Si tests fallan:
1. Leer el error
2. Intentar corregir (maximo 2 reintentos)
3. Si no se puede corregir, registrar en report como `failed` con el error

### 5. Generar Report

Guardar `tba-output/{nombre}/implementation-report.json`:

```json
{
  "iniciativa": "consulta-tienda-por-cp",
  "status": "completed",
  "totalFilesPlanned": 12,
  "totalFilesCreated": 10,
  "totalFilesModified": 2,
  "totalTestsPlanned": 4,
  "totalTestsPassing": 4,
  "totalTestsFailing": 0,
  "phases": [
    {
      "phase": 1,
      "phaseName": "Domain Layer",
      "status": "completed",
      "files": [
        {
          "id": "FILE-001",
          "path": "src/modules/stores/domain/contracts/store-lookup.interface.ts",
          "status": "created",
          "linesOfCode": 42
        }
      ]
    }
  ],
  "testResults": [
    {
      "id": "FILE-T02",
      "testFile": "src/tests/modules/stores/domain/value-objects/zip-code.test.ts",
      "status": "passing",
      "testsRun": 6,
      "testsPassed": 6,
      "testsFailed": 0,
      "coverage": "95%"
    }
  ],
  "deviations": [],
  "errors": []
}
```

---

## Reglas Criticas de Implementacion

### Codigo de Produccion

1. **Mimetizar patrones**: Antes de escribir, LEER archivos similares en el proyecto. Copiar estilo, imports, decoradores.

2. **Respetar arquitectura**: Si `criticalRules` dice "Domain is pure", NO importar nada de frameworks en domain.

3. **Codigo real, no pseudocodigo**: El codigo debe compilar y funcionar. Usar tipos correctos, imports validos, exports apropiados.

4. **No sobre-ingeniar**: Implementar exactamente lo que pide el plan. No agregar features extras, no refactorear codigo adyacente.

5. **Preservar existente**: Al modificar archivos, no cambiar codigo que no necesita cambios. Agregar, no reemplazar.

### Tests

1. **Cobertura de Gherkin**: Cada escenario Gherkin de la tarea [QA] DEBE tener al menos un test case.

2. **Happy path + edge cases**: Minimo 1 happy path + 1 edge case por test file.

3. **Tests que pasan**: Los tests DEBEN pasar. Si no pasan, corregir el codigo (no el test) a menos que el test este mal escrito.

4. **Independientes**: Cada test debe poder ejecutarse independientemente. No depender de orden de ejecucion.

5. **Patrones del proyecto**: Usar los mismos helpers de test, factories, y mocks que el proyecto ya usa.

### Deteccion de Problemas

Si durante la implementacion se detecta un problema con el plan:
- **Problema menor** (typo en path, import incorrecto): Corregir silenciosamente y registrar en `deviations`
- **Problema mayor** (archivo no puede existir, dependencia circular): DETENER y reportar al orquestador via el report

---

## Validaciones

**Pre-implementacion**:
- `implementation-plan.json` existe y es JSON valido
- El proyecto existe en la ruta especificada
- Git esta limpio o los cambios son del flujo actual

**Post-implementacion**:
- Todos los archivos del plan fueron creados/modificados
- Tests ejecutados y resultados registrados
- `implementation-report.json` generado con status final
- No hay archivos huerfanos (creados pero no en el plan)

## Manejo de Errores

| Error | Accion |
|-------|--------|
| Archivo ya existe (action: create) | Verificar contenido, si es diferente agregar en `deviations` y continuar |
| Archivo no existe (action: modify) | Registrar error, crear el archivo como fallback |
| Tests fallan despues de 2 reintentos | Registrar como `failed`, continuar con siguiente test |
| Error de TypeScript | Registrar warning, no bloquear (puede ser pre-existente) |
| Dependencia circular detectada | DETENER fase, reportar al orquestador |

## Conexion con Otros Skills

**Input de**: `plan-implementation` (implementation-plan.json), `analyze-initiative` (iniciativa.json), `detect-architecture` (architecture-constraints.json)
**Output para**: `git-manager` (archivos listos para commit)

---

## Ejemplo de Referencia

Ver [examples/implementation-report.json](./examples/implementation-report.json) para un reporte completo de implementacion.
