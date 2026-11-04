# Sistema de Vendedores — Registro de contactos

Aplicación web **sin login para vendedores**, pensada para funcionar desde celulares. Cada registro guarda teléfono, nombre de quien atendió, tipo **Dueño / Vendedor**, fecha y hora automática. Si cargan el mismo número nuevamente, se actualiza el contacto en lugar de duplicarse.

## Cómo funciona
- Formulario público mediante URL compartida.
- **No** hay página ni API pública que permita ver la base completa.
- Base de contactos en Supabase; el administrador puede consultar y exportar en **Supabase → Table Editor → contactos_vendedores**.
- Clave secreta Supabase exclusiva del servidor; nunca aparece en el navegador.
- Control básico de envíos repetidos (40 por minuto por IP) y campo antispam invisible.
- No se almacenan IPs legibles, sino una huella HMAC de corta utilidad. La tabla de límites puede limpiarse periódicamente.

> Importante: una URL compartida sin login **no es privada**. Cualquiera que obtenga el enlace puede enviar nuevos registros. Los datos no pueden consultarse desde el formulario, pero esto no reemplaza una autenticación ni protección avanzada frente al spam.

## 1. Crear proyecto en Supabase

1. Crear un proyecto nuevo en https://supabase.com/dashboard (o usar uno ya seleccionado).
2. Abrir **SQL Editor** y ejecutar **todo** `supabase/schema.sql`.
3. Confirmar que `contactos_vendedores` y `limites_contactos` aparecen en Table Editor.
4. Ir a **Project Settings → API Keys** o **Connect** y obtener la **URL** y una clave de servidor **Secret** (`sb_secret_...`). **Nunca compartir esa clave por chat ni subirla a GitHub**.

## 2. Configurar variables en Vercel

Importar este repositorio en https://vercel.com/new y definir, en Environment Variables (Production, Preview y Development si corresponde):

| Variable | Ejemplo / nota |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` (solo servidor) |
| `IP_HASH_SECRET` | Cadena aleatoria larga de 32+ caracteres |

Para generar `IP_HASH_SECRET` en tu propio ordenador: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

En Vercel, Framework = **Next.js**. Node.js >= 20.9. Desplegar. Al cambiar una variable, volver a desplegar.

## 3. Importar Mauri en Vercel

El proyecto está alojado en el repositorio **https://github.com/tobiasc541/Mauri**.

1. Abrí https://vercel.com/new, elegí la cuenta de GitHub con acceso a `tobiasc541/Mauri` e importá el repositorio.
2. Configurá las 3 variables del punto 2 (solo en el panel de Vercel, **no** en GitHub).
3. Desplegá la aplicación. El nombre visible del sistema será **Sistema de Vendedores**.

Para trabajar localmente, copiá `.env.example` como `.env.local`, completá sus valores y ejecutá `npm install && npm run dev`.

## 4. Comprobar que funciona

1. Desde la URL de Vercel, cargá un contacto de prueba.
2. En Supabase, abrí `contactos_vendedores` y verificá la fila.
3. Volvé a ingresar **el mismo número** con otro tipo: debería haber una sola fila, `veces_registrado = 2` y el último nombre/tipo.
4. Entrá en ventana privada: el formulario abre sin contraseña.
5. Intentá GET `/api/contactos`: debe devolver `405` (no lista los datos).
6. En Supabase con clave `anon`/publishable no debe poderse leer `contactos_vendedores`.

## Datos y privacidad

Guardá solo información de contactos obtenidos legítimamente para seguimiento comercial, informá de la finalidad y respetá solicitudes de baja. La base contiene teléfonos y nombres personales: protegé el acceso de administrador a Supabase. No se diseñó para enviar mensajes automáticos masivos sin consentimiento.

## Estructura

- `app/page.tsx`: pantalla de carga.
- `app/globals.css`: estilos responsivos.
- `app/api/contactos/route.ts`: guardado validado en el servidor.
- `supabase/schema.sql`: tablas, validaciones, bloqueo de lectura pública y procedimiento atómico.
- `.env.example`: variables que debe cargar el administrador en Vercel.
