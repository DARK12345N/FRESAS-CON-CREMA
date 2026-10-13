const http = require('http');
const crypto = require('crypto');

const port = Number(process.env.PORT || 3000);
const verifyToken = process.env.META_VERIFY_TOKEN || '';
const messages = [];

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(JSON.stringify(payload));
}

function addMessage(message) {
  messages.unshift({ ...message, id: crypto.randomUUID() });
  messages.splice(100);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function handleWhatsAppEvent(payload) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const value of change.value?.messages || []) {
        const contact = value.from ? (change.value.contacts || []).find((item) => item.wa_id === value.from) : null;
        addMessage({
          from: value.from || 'Desconocido',
          name: contact?.profile?.name || value.from || 'Cliente de WhatsApp',
          text: value.text?.body || `[Mensaje ${value.type}]`,
          timestamp: value.timestamp ? Number(value.timestamp) * 1000 : Date.now(),
          channel: 'whatsapp',
        });
      }
    }
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'GET' && url.pathname === '/webhook') {
    const valid = url.searchParams.get('hub.verify_token') === verifyToken;
    if (url.searchParams.get('hub.mode') === 'subscribe' && valid) {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end(url.searchParams.get('hub.challenge'));
    } else {
      response.writeHead(403);
      response.end('Token de verificacion invalido');
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/webhook') {
    try {
      const payload = JSON.parse(await readBody(request));
      if (payload.object === 'whatsapp_business_account') handleWhatsAppEvent(payload);
      sendJson(response, 200, { received: true });
    } catch {
      sendJson(response, 400, { error: 'JSON invalido' });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/messages') {
    sendJson(response, 200, { messages });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true, messages: messages.length });
    return;
  }

  response.writeHead(404);
  response.end('No encontrado');
});

server.listen(port, () => {
  console.log(`Webhook de WhatsApp escuchando en http://localhost:${port}`);
});