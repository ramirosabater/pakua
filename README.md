# Academia de Pakua

Aplicación de gestión para una academia de Pakua: login de alumnos y profesores,
informes privados de clases especiales, control de asistencia y registro de pagos
con comprobante. Frontend en React (Vite) + Supabase, para desplegar en Netlify.

## Qué hace cada rol

- **Alumno**: escribe informes de sus clases especiales (sólo los ve él y los
  profesores), consulta su asistencia y registra pagos adjuntando el comprobante.
- **Profesor**: toma asistencia de las clases que tiene asignadas, lee los informes
  de los alumnos y aprueba o rechaza los pagos.
- **Dirección (admin)**: además de lo anterior, crea clases, asigna profesores y
  gestiona las inscripciones de los alumnos.

---

## 1. Configurar Supabase

1. Creá un proyecto en https://supabase.com
2. Entrá a **SQL Editor > New query**, pegá el contenido de
   `pakua_supabase_schema.sql` y ejecutá (Run). Eso crea las tablas, las políticas
   de seguridad (RLS) y el bucket de comprobantes.
3. En **Project Settings > API** copiá el `Project URL` y la `anon public key`.

## 2. Correr localmente

```bash
npm install
cp .env.example .env    # y completá las dos variables con tus datos de Supabase
npm run dev
```

Abrí http://localhost:5173

## 3. Crear el primer usuario y volverlo admin

1. Registrate desde la app (queda como `alumno`).
2. En Supabase, **Authentication > Users**, copiá tu UUID.
3. En **SQL Editor** corré (reemplazando el UUID):

   ```sql
   update profiles set role = 'admin' where id = 'TU-UUID';
   ```

4. Volvé a entrar: ahora ves el panel de Dirección para crear clases,
   asignar profesores e inscribir alumnos.

Para convertir a alguien en profesor, hacé lo mismo con `role = 'profesor'`.

## 4. Desplegar en Netlify

1. Subí el proyecto a un repositorio de GitHub.
2. En Netlify: **Add new site > Import from Git** y elegí el repo.
   El `netlify.toml` ya define `npm run build` y la carpeta `dist`.
3. En **Site settings > Environment variables** cargá `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY`.
4. Deploy. El archivo `netlify.toml` incluye el redirect para que el ruteo de
   React Router funcione en todas las rutas.

---

## Notas de seguridad

- La privacidad de los informes y los comprobantes no depende del frontend: está
  garantizada por las políticas RLS de Supabase. Aunque alguien manipule la app,
  la base de datos no le devuelve datos ajenos.
- La clave que usa el frontend es la `anon key`, pensada para ser pública. Nunca
  pongas la `service_role key` en el frontend.
- Los comprobantes viven en un bucket privado; los profesores los ven mediante
  URLs firmadas de corta duración.

## Estructura

```
src/
  supabaseClient.js        cliente de Supabase
  context/AuthContext.jsx  sesión + rol del usuario
  components/              Layout, ProtectedRoute, emblema octogonal
  pages/Login.jsx          ingreso y registro
  pages/student/           informes, asistencia y pagos del alumno
  pages/teacher/           asistencia, informes, pagos y clases del staff
```
