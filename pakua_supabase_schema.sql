-- =====================================================================
--  ACADEMIA DE PAKUA — Esquema de base de datos (Supabase / PostgreSQL)
--  Pegar en: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------
create type user_role   as enum ('alumno', 'profesor', 'admin');
create type pago_estado as enum ('pendiente', 'aprobado', 'rechazado');
create type pago_metodo as enum ('efectivo', 'transferencia', 'mercadopago', 'tarjeta', 'otro');

-- ---------------------------------------------------------------------
-- 2. PERFILES (extiende auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       user_role not null default 'alumno',
  telefono   text,
  created_at timestamptz default now()
);

-- Crear automáticamente un perfil cuando alguien se registra.
-- Todos entran como 'alumno'; a profesores/admin los promovés después.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'alumno');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: devuelve el rol del usuario actual SIN provocar recursión en RLS.
create or replace function public.get_user_role()
returns user_role language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 3. CLASES  (una clase tiene un profesor asignado; puede requerir informe)
-- ---------------------------------------------------------------------
create table clases (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  descripcion      text,
  profesor_id      uuid references profiles(id),
  requiere_informe boolean default false,   -- true = "clase especial"
  horario          text,
  created_at       timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 4. INSCRIPCIONES  (qué alumno está en qué clase)
-- ---------------------------------------------------------------------
create table inscripciones (
  id         uuid primary key default gen_random_uuid(),
  alumno_id  uuid references profiles(id) on delete cascade,
  clase_id   uuid references clases(id)  on delete cascade,
  created_at timestamptz default now(),
  unique (alumno_id, clase_id)
);

-- ---------------------------------------------------------------------
-- 5. ASISTENCIA  (la carga el profesor de la clase)
-- ---------------------------------------------------------------------
create table asistencia (
  id              uuid primary key default gen_random_uuid(),
  clase_id        uuid references clases(id)   on delete cascade,
  alumno_id       uuid references profiles(id) on delete cascade,
  fecha           date not null default current_date,
  presente        boolean not null default true,
  registrado_por  uuid references profiles(id),
  created_at      timestamptz default now(),
  unique (clase_id, alumno_id, fecha)
);

-- ---------------------------------------------------------------------
-- 6. INFORMES  (los escribe el alumno; los ven el alumno autor y el staff)
-- ---------------------------------------------------------------------
create table informes (
  id         uuid primary key default gen_random_uuid(),
  alumno_id  uuid references profiles(id) on delete cascade,
  clase_id   uuid references clases(id),
  titulo     text,
  contenido  text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 7. PAGOS  (el alumno declara medio de pago y adjunta comprobante)
-- ---------------------------------------------------------------------
create table pagos (
  id               uuid primary key default gen_random_uuid(),
  alumno_id        uuid references profiles(id) on delete cascade,
  monto            numeric(10,2) not null,
  metodo           pago_metodo not null,
  periodo          text,             -- ej: '2026-08'
  comprobante_url  text,             -- ruta al archivo en Storage
  estado           pago_estado default 'pendiente',
  revisado_por     uuid references profiles(id),
  created_at       timestamptz default now()
);

-- =====================================================================
--  ROW LEVEL SECURITY
-- =====================================================================

-- ----- PROFILES -----
alter table profiles enable row level security;
create policy "perfil propio: select" on profiles
  for select using (id = auth.uid());
create policy "staff ve perfiles" on profiles
  for select using (get_user_role() in ('profesor','admin'));
create policy "perfil propio: update" on profiles
  for update using (id = auth.uid());

-- ----- CLASES -----
alter table clases enable row level security;
create policy "autenticados ven clases" on clases
  for select using (auth.role() = 'authenticated');
create policy "admin gestiona clases" on clases
  for all using (get_user_role() = 'admin');

-- ----- INSCRIPCIONES -----
alter table inscripciones enable row level security;
create policy "ver inscripciones propias o staff" on inscripciones
  for select using (alumno_id = auth.uid() or get_user_role() in ('profesor','admin'));
create policy "staff gestiona inscripciones" on inscripciones
  for all using (get_user_role() in ('profesor','admin'));

-- ----- ASISTENCIA -----
alter table asistencia enable row level security;
create policy "alumno ve su asistencia" on asistencia
  for select using (alumno_id = auth.uid());
create policy "staff ve asistencia" on asistencia
  for select using (get_user_role() in ('profesor','admin'));
-- El profesor sólo puede cargar/editar asistencia de SUS clases asignadas.
create policy "profesor registra asistencia de su clase" on asistencia
  for insert with check (
    get_user_role() = 'admin'
    or exists (select 1 from clases c where c.id = clase_id and c.profesor_id = auth.uid())
  );
create policy "profesor edita asistencia de su clase" on asistencia
  for update using (
    get_user_role() = 'admin'
    or exists (select 1 from clases c where c.id = clase_id and c.profesor_id = auth.uid())
  );

-- ----- INFORMES (privacidad clave) -----
alter table informes enable row level security;
-- El alumno crea sus propios informes.
create policy "alumno crea informe" on informes
  for insert with check (alumno_id = auth.uid());
-- El alumno lee SÓLO los suyos.
create policy "alumno lee su informe" on informes
  for select using (alumno_id = auth.uid());
-- Los profesores/admin leen todos los informes.
create policy "staff lee informes" on informes
  for select using (get_user_role() in ('profesor','admin'));
-- El alumno puede editar los suyos (opcional; quitá si querés que sean inmutables).
create policy "alumno edita su informe" on informes
  for update using (alumno_id = auth.uid());

-- ----- PAGOS -----
alter table pagos enable row level security;
create policy "alumno crea su pago" on pagos
  for insert with check (alumno_id = auth.uid());
create policy "alumno ve sus pagos" on pagos
  for select using (alumno_id = auth.uid());
create policy "staff ve pagos" on pagos
  for select using (get_user_role() in ('profesor','admin'));
create policy "staff aprueba/rechaza pago" on pagos
  for update using (get_user_role() in ('profesor','admin'));

-- =====================================================================
--  STORAGE — comprobantes de pago
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- Convención de ruta: cada archivo se guarda como  {user_id}/nombre-archivo
-- El alumno sólo puede subir dentro de su propia carpeta.
create policy "alumno sube su comprobante" on storage.objects
  for insert with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- El alumno ve sus comprobantes; el staff ve todos.
create policy "ver comprobantes" on storage.objects
  for select using (
    bucket_id = 'comprobantes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or get_user_role() in ('profesor','admin')
    )
  );

-- =====================================================================
--  DESPUÉS DE CORRER ESTO:
--  1) Registrate con tu usuario desde la app.
--  2) Promovételo a admin manualmente (una sola vez):
--       update profiles set role = 'admin' where id = 'TU-UUID';
--     El UUID lo ves en Authentication > Users.
--  3) Desde ese admin ya podés crear clases, asignar profesores, etc.
-- =====================================================================
