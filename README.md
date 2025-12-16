# Admitio - Sistema de Gestión de Admisiones

Sistema CRM para instituciones educativas. Gestiona leads, automatiza seguimientos y aumenta tu tasa de conversión.

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

Copia `.env.example` a `.env` y agrega tus credenciales de Supabase:

```bash
cp .env.example .env
```

Edita `.env`:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

### 4. Build para Producción

```bash
npm run build
```

## 📊 Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `schema.sql`
3. Copiar credenciales de **Settings > API** al archivo `.env`

## 🔐 Credenciales por Defecto (Modo Local)

Si no configuras Supabase, el sistema funciona en modo local con estos usuarios:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@projazz.cl | admin123 | Key Master |
| maria@projazz.cl | 123456 | Encargado |
| pedro@projazz.cl | 123456 | Encargado |

## 📁 Estructura

```
src/
├── pages/
│   ├── Landing.jsx      # Página pública
│   ├── Login.jsx        # Inicio de sesión
│   ├── Signup.jsx       # Registro de instituciones
│   └── Dashboard.jsx    # Panel principal (protegido)
├── lib/
│   ├── store.js         # Estado local + sync
│   ├── storeSync.js     # Sincronización con Supabase
│   └── supabase.js      # Cliente Supabase
├── context/
│   └── AuthContext.jsx  # Autenticación
└── components/
    └── Icon.jsx         # Iconos SVG
```

## 🌐 Deploy en Render

1. Conectar repositorio GitHub
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Agregar variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 📝 Licencia

MIT © 2024 Admitio
