# Fresita Bot

Panel web para centralizar pedidos de helado de fresas con crema recibidos desde WhatsApp Business y Messenger.

## Ejecutar

Abre `index.html` directamente en el navegador. Esta primera versión no necesita dependencias ni servidor.

## Incluye

- Resumen diario de pedidos, ventas, respuesta y satisfacción.
- Pedidos recientes con canal y estado.
- Estado de Fresita Bot y conversaciones pendientes.
- Diseño responsive para escritorio y móvil.
- Logotipo de Fresas con Crema visible en la barra lateral.
- Interacciones locales para registrar pedidos, calcular totales y actualizar métricas.
- Búsqueda de pedidos, gestión de estados, eliminación y menús de acciones.
- Bandeja de conversaciones, notificaciones, ayuda, catálogo y configuración.
- La aplicación inicia sin clientes ni pedidos ficticios y conserva los pedidos registrados localmente en el navegador.
- Configuración para vincular un número de WhatsApp Business y un enlace de Messenger, con estado persistente local.

## Recibir mensajes reales de WhatsApp

La página consulta el endpoint local `/api/messages`. Para recibir mensajes reales desde WhatsApp Cloud API, inicia el webhook con Node.js:

```powershell
$env:META_VERIFY_TOKEN="crea-un-token-largo"
$env:PORT="3000"
node server.js
```

En el panel de Meta configura como callback `https://TU-DOMINIO/webhook`, usa el mismo token de verificación y suscribe el campo `messages` de tu cuenta de WhatsApp Business. En producción el servidor debe usar HTTPS y las credenciales de Meta deben permanecer en variables de entorno; nunca las pongas en `index.html` o `app.js`.

La vinculación visual del número y la recepción del webhook son pasos distintos: vincular el número en Configuración guarda el dato local, mientras que Meta entrega los mensajes al servidor mediante el webhook.
