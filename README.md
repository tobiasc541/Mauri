# MAURI — Sistema de Vendedores

Proyecto independiente en **Next.js + Supabase**. Dos accesos separados:

- **Formulario para vendedores:** `https://TU-DOMINIO/` — sin usuario ni contraseña. Permite registrar teléfono, nombre y tipo (Dueño o Vendedor).
- **Administrador:** enlace secreto `https://TU-DOMINIO/acceso?token=VALOR_DE_ADMIN_ACCESS_TOKEN` — sin contraseña que escribir. Al abrirlo deja una cookie **HttpOnly** válida 7 días y redirige a `/admin` sin mostrar el secreto en la dirección. El administrador puede filtrar fechas, ver estadísticas y descargar todos los registros del rango seleccionado.

## Funciones del administrador

- Selección **Hoy, Ayer, Últimos 7 días, Este mes, Todos y Personalizado (desde/hasta)**.
- Hora de referencia: **Argentina (UTC−03:00)**, inclusive desde las 00:00 hasta antes de las 00:00 del día posterior.
- Cuatro indicadores: contactos del período, total de teléfonos únicos en la base, dueños del período y vendedores del período.
- Tabla paginada (50 por página), fecha y hora del primer registro y cantidad de veces que se volvió a registrar.
- **Exportar CSV**: todos los contactos del período, aun si hay muchas páginas en pantalla. CSV separado por punto y coma y UTF-8 con BOM para Excel. Importar la columna teléfono como **Texto** para preservar ceros iniciales.
- **Descargar PDF**: listado A4 multipágina de todos los contactos seleccionados, hasta **15.000 por exportación**. Para más registros usar CSV, para evitar límites de memoria de Vercel.
- Si se vuelve a registrar el mismo número, se actualizan los datos del contacto y no se duplica. El filtro de fecha representa **el primer alta de ese teléfono**; `actualizado_en` registra su última actualización.

### Seguridad importante

El panel **no tiene contraseña**, pero requiere un **enlace privado imposible de adivinar** configurado en el servidor. Tratalo como una contraseña: **no lo compartas con vendedores ni lo subas a GitHub, ni lo publiques en WhatsApp grupos**. Cualquiera que tenga ese enlace puede consultar y exportar tu base. Si se filtra, generá otro token en Vercel y redesplegá. Para datos sensibles o varios administradores se recomienda una autenticación real en lugar de un enlace secreto.

La clave de Supabase (`SUPABASE_SECRET_KEY`) vive exclusivamente en el servidor y **jamás** en el navegador ni en variables `NEXT_PUBLIC_*`. Las tablas usan RLS y no tienen permisos públicos de lectura. El formulario usa una API server-side con límite básico 40 envíos/minuto por huella de IP y antispam simple.

## 1. Configurar tablas de Supabase

1. Abrí el proyecto Supabase NUEVO elegido para Mauri (no confundir con MESA o Pawwise).
2. Abrí **SQL Editor** y ejecutá **todo** el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. En **Table Editor** comprobá que aparecen `contactos_vendedores` y `limites_contactos`.
4. En **Project Settings → API Keys / Connect** copiá la **Project URL** y la clave secreta `sb_secret_...`. Ponerla solo en variables privadas de Vercel, **nunca en este repositorio**.

Si ya ejecutaste el SQL original, podés ejecutarlo de nuevo: usa `IF NOT EXISTS` para tablas/índices y vuelve a definir la misma función, sin borrar contactos.

## 2. Importar GitHub en Vercel

Repositorio: [tobiasc541/Mauri](https://github.com/tobiasc541/Mauri)

1. En [vercel.com/new](https://vercel.com/new), importar `tobiasc541/Mauri` como **Next.js**, Node 20.9+.
2. Configurar las cuatro variables de entorno del proyecto, en Production (y Preview si se desea probar previews):

| Variable | Valor | Visibilidad |
|---|---|---|
| `SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` | Servidor |
| `SUPABASE_SECRET_KEY` | Secret key de tu proyecto `sb_secret_...` | Servidor **secreto** |
| `IP_HASH_SECRET` | Cadena aleatoria de al menos 24 caracteres | Servidor **secreto** |
| `ADMIN_ACCESS_TOKEN` | Cadena privada aleatoria larga (64 caracteres hex sugeridos) | Servidor **secreto** |

Generar un secreto en tu propia terminal, para cada una de las últimas dos variables:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

**Usá un secreto DISTINTO para `IP_HASH_SECRET` y para `ADMIN_ACCESS_TOKEN`.** No los publiques.

3. Desplegar o redesplegar después de cargar las variables.
4. Tu formulario es `https://DOMINIO/` y tu **enlace privado de administrador** es `https://DOMINIO/acceso?token=EL_VALOR_DE_ADMIN_ACCESS_TOKEN`.
5. Cuando ingresás con el enlace secreto, el navegador te manda a `https://DOMINIO/admin`, con sesión privada de 7 días.

## 3. Probar el sistema

1. Entrá al formulario y cargá un número de prueba con nombre y tipo.
2. Comprobá que aparece una fila en Supabase.
3. Ingresá con tu enlace privado a `/acceso?token=...` y abrí **Hoy**. Debe verse el registro y los indicadores.
4. Exportá CSV y PDF. Los archivos deben contener los mismos contactos que el filtro.
5. Repetí el mismo número en el formulario. Debe conservarse una sola fila con `veces_registrado` incrementado.
6. Abrí `/admin` en una ventana incógnita **sin** pasar por el enlace privado. Debe devolver 404, y `/api/admin/contactos` debe responder 401.
7. Comprobá que la clave anónima/publishable de Supabase **no puede leer** `contactos_vendedores` directamente.

### Desarrollo local

Copiá `.env.example` a `.env.local`, completá las cuatro variables y ejecutá:

```bash
npm install
npm run dev
```

## Estructura principal

- `app/page.tsx`: formulario público.
- `app/admin/page.tsx`, `app/admin/panel.tsx`: panel privado.
- `app/acceso/route.ts`: canje del enlace secreto por cookie HttpOnly.
- `app/api/contactos/route.ts`: alta de contactos, sin capacidad pública de consulta.
- `app/api/admin/contactos/route.ts`: listado, estadísticas y paginación, solo administrador.
- `app/api/admin/export/route.ts`: CSV y PDF según rango seleccionado, solo administrador.
- `lib/admin-auth.ts`: validación criptográfica de sesión.
- `lib/filtros.ts`: períodos con horarios de Argentina.
- `lib/pdf-simple.ts`: PDF multipágina sin librerías externas.
- `lib/supabase-server.ts`: cliente privilegiado exclusivo del servidor.
- `supabase/schema.sql`: tablas SQL, RPC, índices, RLS y permisos.

## Privacidad

Guardá únicamente contactos obtenidos de manera legítima, informá la finalidad y respetá solicitudes de baja. Esta aplicación NO incluye herramientas de envío masivo automático.
