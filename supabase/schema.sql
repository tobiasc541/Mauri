-- Sistema de Vendedores - Esquema para un proyecto NUEVO de Supabase.
-- Ejecutar una sola vez en el SQL Editor de TU proyecto.
-- El formulario es público para ingresar; las tablas NO son públicas para consultar.

create table if not exists public.contactos_vendedores (
    id uuid primary key default gen_random_uuid(),
    nombre text not null check (char_length(trim(nombre)) between 2 and 100),
    telefono text not null unique check (telefono ~ '^[0-9]{7,15}$'),
    tipo text not null check (tipo in ('dueno', 'vendedor')),
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now(),
    veces_registrado integer not null default 1 check (veces_registrado >= 1)
);

create index if not exists contactos_vendedores_fecha_idx on public.contactos_vendedores (creado_en desc);
create index if not exists contactos_vendedores_tipo_idx on public.contactos_vendedores (tipo);

-- Fingerprint HMAC de la IP por minuto para un límite de carga básico.
-- No almacena direcciones IP en texto claro.
create table if not exists public.limites_contactos (
    fingerprint text not null,
    minuto timestamptz not null,
    intentos integer not null default 1,
    primary key (fingerprint, minuto)
);
create index if not exists limites_contactos_minuto_idx on public.limites_contactos (minuto);

-- Activar RLS sin crear políticas abiertas. Solo el servidor con clave secreta
-- podrá invocar la función y operar estas tablas.
alter table public.contactos_vendedores enable row level security;
alter table public.limites_contactos enable row level security;
revoke all on table public.contactos_vendedores from anon, authenticated;
revoke all on table public.limites_contactos from anon, authenticated;
grant select, insert, update on table public.contactos_vendedores to service_role;
grant select, insert, update, delete on table public.limites_contactos to service_role;

create or replace function public.registrar_contacto(
    p_nombre text,
    p_telefono text,
    p_tipo text,
    p_fingerprint text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_intentos integer;
    v_minuto timestamptz := date_trunc('minute', now());
begin
    if p_nombre is null or char_length(trim(p_nombre)) not between 2 and 100
        or p_telefono is null or p_telefono !~ '^[0-9]{7,15}$'
        or p_tipo is null or p_tipo not in ('dueno', 'vendedor')
        or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
        raise exception 'Datos de contacto inválidos' using errcode = '22023';
    end if;

    insert into public.limites_contactos (fingerprint, minuto, intentos)
    values (p_fingerprint, v_minuto, 1)
    on conflict (fingerprint, minuto) do update
        set intentos = public.limites_contactos.intentos + 1
    returning intentos into v_intentos;

    if v_intentos > 40 then
        raise exception 'LIMIT_CONTACTOS' using errcode = 'P0001';
    end if;

    insert into public.contactos_vendedores (nombre, telefono, tipo)
    values (trim(p_nombre), p_telefono, p_tipo)
    on conflict (telefono) do update set
        nombre = excluded.nombre,
        tipo = excluded.tipo,
        actualizado_en = now(),
        veces_registrado = public.contactos_vendedores.veces_registrado + 1;
end;
$$;

-- Una función en schema public recibe EXECUTE a PUBLIC por defecto: revocarlo.
revoke all on function public.registrar_contacto(text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_contacto(text, text, text, text) to service_role;

-- Verificación (SQL Editor):
-- select count(*) from public.contactos_vendedores;
-- Para exportar: Table Editor -> contactos_vendedores -> Export to CSV.
-- Mantenimiento opcional, manual (borra solo límites, no contactos):
-- delete from public.limites_contactos where minuto < now() - interval '2 days';

-- PANEL ADMINISTRADOR (sin contraseña, con enlace secreto):
-- Este panel usa las mismas tablas existentes; NO requiere crear usuarios
-- ni habilitar lectura pública. Las consultas y exportaciones se realizan
-- solamente desde las rutas privadas del servidor (clave SUPABASE_SECRET_KEY).
-- No habilitar políticas SELECT para "anon" ni "authenticated".
-- Índice recomendado para consultar el período más reciente:
create index if not exists contactos_vendedores_fecha_id_idx
    on public.contactos_vendedores (creado_en desc, id desc);

-- NOTA: creado_en corresponde al primer registro de ese número; volver a
-- cargar el mismo teléfono actualiza actualizado_en y veces_registrado.
