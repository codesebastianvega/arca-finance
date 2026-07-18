# Activar Web Push en Arca

La implementación ya incluye permiso por dispositivo, almacenamiento de suscripciones, envío de prueba, service worker y un cron diario de recordatorios.

## 1. Crear las tablas

Ejecuta en Supabase SQL Editor el archivo `supabase/arca-web-push.sql`.

## 2. Generar las claves VAPID

Ejecuta una sola vez:

```powershell
npm.cmd run generate:vapid
```

Guarda la clave pública y privada. No subas la clave privada al repositorio.

## 3. Configurar Vercel

Agrega estas variables al entorno Production:

- `VAPID_PUBLIC_KEY`: clave pública generada.
- `VAPID_PRIVATE_KEY`: clave privada generada.
- `VAPID_SUBJECT`: un correo en formato `mailto:correo@dominio.com`.
- `CRON_SECRET`: una cadena larga y aleatoria.

Después vuelve a desplegar. El cron definido en `vercel.json` se ejecuta diariamente a las 12:30 UTC, equivalentes a las 7:30 a. m. en Colombia.

## 4. Activar y probar en el celular

1. Abre Arca desde el icono instalado en la pantalla de inicio.
2. En Hoy, abre la campana.
3. Pulsa **Activar avisos** y acepta el permiso del sistema.
4. Pulsa **Enviar prueba**.

En iPhone se requiere iOS 16.4 o posterior y abrir Arca como PWA instalada. En Android funciona desde Chrome y desde la PWA.

## 5. Qué envía el cron

Arca crea un resumen diario cuando existen pagos vencidos, compromisos para hoy o pagos que vencen en los siguientes tres días. Cada dispositivo recibe como máximo un resumen financiero por día; los intentos quedan registrados para evitar duplicados y desactivar endpoints vencidos.
