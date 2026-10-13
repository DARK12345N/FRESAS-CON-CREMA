const toast = document.getElementById('toast');
const orderModal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const ordersBody = document.querySelector('.orders-panel tbody');
const products = {
  'Fresas Clásicas': 9,
  'Especial + topping': 12.5,
  'Mini Fresas': 8,
  'Helado de fresa': 10,
  'Copa de helado de fresa': 13,
  'Sundae de fresa y chocolate': 14.5,
  'Malteada de fresa': 15
};
const ordersStorageKey = 'fresita-orders';
const connectionsStorageKey = 'fresita-connections';
const messagesApiUrl = 'http://localhost:3000/api/messages';
const dataVersionKey = 'fresita-data-version';
function updateWelcomeGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('currentDate').textContent = now.toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toLocaleUpperCase('es-BO');
  document.getElementById('greeting').firstChild.textContent = `${greeting}, Kiara `;
}

if (localStorage.getItem(dataVersionKey) !== '2') {
  localStorage.removeItem(ordersStorageKey);
  localStorage.setItem(dataVersionKey, '2');
}
let orders = JSON.parse(localStorage.getItem(ordersStorageKey) || '[]');
let connections = JSON.parse(localStorage.getItem(connectionsStorageKey) || '{}');
let toastTimer;
let menuElement;
let whatsappMessages = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function closeMenu() {
  menuElement?.remove();
  menuElement = null;
}

function closeOrderModal() {
  orderModal.hidden = true;
}

function updateOrderTotal() {
  const product = orderForm.elements.product.value;
  const quantity = Number(orderForm.elements.quantity.value) || 1;
  orderForm.elements.total.value = (products[product] * quantity).toFixed(2);
}

function updateMetrics(total) {
  const values = document.querySelectorAll('.metric-value');
  values[0].textContent = orders.length;
  values[1].textContent = `Bs. ${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}`;
}

function saveOrders() {
  localStorage.setItem(ordersStorageKey, JSON.stringify(orders));
}

function saveConnections() {
  localStorage.setItem(connectionsStorageKey, JSON.stringify(connections));
}

function renderConnections() {
  document.querySelectorAll('.channel-row').forEach((row) => {
    const channel = row.querySelector('.channel-logo').classList.contains('whatsapp') ? 'whatsapp' : 'messenger';
    const status = row.querySelector('strong');
    status.textContent = connections[channel] ? 'Vinculado' : 'No vinculado';
    row.title = connections[channel] || 'Canal pendiente de vinculación';
  });
}

function renderMessages() {
  const list = document.querySelector('.conversation-list');
  const button = document.querySelector('.conversation-strip .text-button');
  if (!whatsappMessages.length) {
    list.innerHTML = '<div class="empty-state">No hay mensajes de WhatsApp recibidos.</div>';
    button.disabled = true;
    document.querySelectorAll('.nav-count')[0].textContent = '0';
    return;
  }
  list.innerHTML = whatsappMessages.map((message) => `<article class="conversation-item"><span class="avatar avatar-green">WA</span><div class="conversation-copy"><div><strong>${escapeHtml(message.name)}</strong><span class="time">${new Date(message.timestamp).toLocaleString('es-BO')}</span></div><p>${escapeHtml(message.text)}</p></div><span class="unread"></span></article>`).join('');
  button.disabled = false;
  document.querySelectorAll('.nav-count')[0].textContent = whatsappMessages.length;
  list.querySelectorAll('.conversation-item').forEach((conversation, index) => conversation.addEventListener('click', () => {
    conversation.querySelector('.unread')?.remove();
    const message = whatsappMessages[index];
    showInfoModal(message.name, `<p>${escapeHtml(message.text)}</p><p>WhatsApp: ${escapeHtml(message.from)}</p><button class="primary-button reply-button">Marcar como atendido</button>`);
    document.querySelector('.reply-button').onclick = () => { conversation.querySelector('.unread')?.remove(); showToast('Mensaje marcado como atendido'); };
  }));
}

async function loadWhatsAppMessages() {
  if (!connections.whatsapp) return;
  try {
    const response = await fetch(messagesApiUrl);
    if (!response.ok) return;
    whatsappMessages = (await response.json()).messages || [];
    renderMessages();
  } catch {
    document.querySelector('.conversation-strip .section-heading p').textContent = 'Inicia el webhook para recibir mensajes de WhatsApp.';
  }
}

function renderOrders() {
  ordersBody.innerHTML = orders.length ? orders.map((order) => `<tr data-order-id="${order.id}"><td><div class="customer"><span class="avatar avatar-pink">${escapeHtml(order.initials)}</span><span><strong>${escapeHtml(order.customer)}</strong><small>${escapeHtml(order.time)}</small></span></div></td><td>${order.quantity}x ${escapeHtml(order.product)}</td><td><span class="channel-tag ${order.channel}">${order.channel === 'whatsapp' ? '◔ WhatsApp' : '● Messenger'}</span></td><td><span class="status ${order.status}">${order.statusLabel}</span></td><td><strong>Bs. ${order.total.toFixed(2)}</strong></td><td><button class="row-more" aria-label="Más opciones">•••</button></td></tr>`).join('') : '<tr class="empty-row"><td colspan="6">Aún no hay pedidos. Registra el primero para verlo aquí.</td></tr>';
  document.querySelectorAll('.nav-count')[1].textContent = orders.length;
  updateMetrics();
  bindOrderActions();
}

function renderEmptyConversations() {
  const list = document.querySelector('.conversation-list');
  list.innerHTML = '<div class="empty-state">No hay conversaciones pendientes.</div>';
  document.querySelector('.conversation-strip .text-button').disabled = true;
}

function resetDemoData() {
  document.querySelectorAll('.metric-value')[0].textContent = '0';
  document.querySelectorAll('.metric-value')[1].textContent = 'Bs. 0.00';
  document.querySelectorAll('.metric-value')[2].textContent = 'Sin datos';
  document.querySelectorAll('.metric-value')[3].textContent = 'Sin datos';
  document.querySelectorAll('.metric-card .trend, .metric-card .stars').forEach((element) => { element.textContent = 'Sin datos'; });
  document.querySelectorAll('.nav-count').forEach((count) => { count.textContent = '0'; });
  document.querySelector('.orders-panel tbody').innerHTML = '';
  renderMessages();
  document.querySelector('.conversation-strip .text-button').disabled = true;
  document.querySelector('.bot-score span').firstChild.textContent = '0';
  document.querySelectorAll('.bot-stats strong').forEach((stat) => { stat.textContent = '0'; });
}

function bindOrderActions() {
  ordersBody.querySelectorAll('.row-more').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      closeMenu();
      const row = button.closest('tr');
      const menu = document.createElement('div');
      menu.className = 'action-menu';
      menu.innerHTML = '<button data-status="preparing">En preparación</button><button data-status="ready">Listo para entregar</button><button data-status="delivered">Entregado</button><button data-delete="true">Eliminar pedido</button>';
      document.body.appendChild(menu);
      const rect = button.getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
      menu.style.left = `${Math.max(8, rect.right + window.scrollX - 176)}px`;
      menuElement = menu;
      menu.querySelectorAll('[data-status]').forEach((statusButton) => {
        statusButton.onclick = () => {
          const status = row.querySelector('.status');
          const order = orders.find((item) => item.id === row.dataset.orderId);
          order.status = statusButton.dataset.status;
          order.statusLabel = statusButton.textContent;
          saveOrders();
          status.className = `status ${order.status}`;
          status.textContent = order.statusLabel;
          closeMenu();
          showToast(`Pedido actualizado: ${statusButton.textContent}`);
        };
      });
      menu.querySelector('[data-delete]').onclick = () => {
        orders = orders.filter((item) => item.id !== row.dataset.orderId);
        saveOrders();
        renderOrders();
        closeMenu();
        showToast('Pedido eliminado');
      };
    };
  });
}

function showMenu(anchor, items) {
  closeMenu();
  const menu = document.createElement('div');
  menu.className = 'action-menu';
  items.forEach((item) => {
    const button = document.createElement('button');
    button.textContent = item.label;
    button.onclick = () => { item.action(); closeMenu(); };
    menu.appendChild(button);
  });
  document.body.appendChild(menu);
  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.left = `${Math.max(8, rect.right + window.scrollX - 190)}px`;
  menuElement = menu;
}

function showInfoModal(title, body) {
  let infoModal = document.getElementById('infoModal');
  if (!infoModal) {
    infoModal = document.createElement('div');
    infoModal.id = 'infoModal';
    infoModal.className = 'modal-backdrop';
    document.body.appendChild(infoModal);
  }
  infoModal.innerHTML = `<section class="order-modal info-modal" role="dialog" aria-modal="true"><div class="modal-header"><div><p class="eyebrow">FRESITA BOT</p><h2>${escapeHtml(title)}</h2></div><button class="modal-close" type="button" aria-label="Cerrar">×</button></div><div class="info-content">${body}</div></section>`;
  infoModal.hidden = false;
  infoModal.querySelector('.modal-close').onclick = () => { infoModal.hidden = true; };
}

function openConnectionForm(channel) {
  const isWhatsapp = channel === 'whatsapp';
  const label = isWhatsapp ? 'número de WhatsApp Business' : 'enlace de tu página de Messenger';
  const inputType = isWhatsapp ? 'tel' : 'url';
  const placeholder = isWhatsapp ? '+591 70000000' : 'https://m.me/tu-pagina';
  const currentValue = connections[channel] || '';
  showInfoModal(isWhatsapp ? 'Vincular WhatsApp' : 'Enlazar Messenger', `<p>Registra el ${label} para asociarlo a este panel.</p><form id="connectionForm"><label>${isWhatsapp ? 'Número de WhatsApp' : 'Enlace de Messenger'}<input name="value" type="${inputType}" value="${escapeHtml(currentValue)}" placeholder="${placeholder}" required></label><div class="modal-actions"><button class="cancel-button" type="button" id="cancelConnection">Cancelar</button><button class="primary-button" type="submit">${currentValue ? 'Actualizar vínculo' : 'Vincular canal'}</button></div></form><p class="connection-note">La conexión real con Meta requiere configurar las credenciales en un servidor seguro.</p>`);
  const form = document.getElementById('connectionForm');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = String(new FormData(form).get('value')).trim();
    connections[channel] = value;
    saveConnections();
    renderConnections();
    if (isWhatsapp) loadWhatsAppMessages();
    document.getElementById('infoModal').hidden = true;
    showToast(`${isWhatsapp ? 'WhatsApp' : 'Messenger'} vinculado correctamente`);
  });
  document.getElementById('cancelConnection').onclick = () => { document.getElementById('infoModal').hidden = true; };
  form.elements.value.focus();
}

function openSettings() {
  showInfoModal('Configuración', `<div class="settings-list"><label><input type="checkbox" checked> Respuestas automáticas activas</label><label><input type="checkbox" checked> Confirmar pedidos por WhatsApp</label><label><input type="checkbox"> Solicitar atención humana</label></div><div class="connection-list"><div class="connection-item"><div><strong>WhatsApp Business</strong><small>${connections.whatsapp ? escapeHtml(connections.whatsapp) : 'No vinculado'}</small></div><button class="outline-button" data-connect="whatsapp">${connections.whatsapp ? 'Actualizar' : 'Vincular número'}</button></div><div class="connection-item"><div><strong>Messenger</strong><small>${connections.messenger ? escapeHtml(connections.messenger) : 'No vinculado'}</small></div><button class="outline-button" data-connect="messenger">${connections.messenger ? 'Actualizar' : 'Enlazar página'}</button></div></div>`);
  document.querySelectorAll('[data-connect]').forEach((button) => { button.onclick = () => openConnectionForm(button.dataset.connect); });
}

document.getElementById('newOrderBtn').addEventListener('click', () => {
  orderModal.hidden = false;
  updateOrderTotal();
  orderForm.elements.customer.focus();
});
document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
document.getElementById('cancelOrder').addEventListener('click', closeOrderModal);
orderForm.elements.product.addEventListener('change', updateOrderTotal);
orderForm.elements.quantity.addEventListener('input', updateOrderTotal);
orderModal.addEventListener('click', (event) => { if (event.target === orderModal) closeOrderModal(); });

document.addEventListener('click', (event) => {
  if (menuElement && !menuElement.contains(event.target) && !event.target.closest('.row-more, .workspace-switcher, .user-profile, .notification')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeOrderModal();
    const infoModal = document.getElementById('infoModal');
    if (infoModal) infoModal.hidden = true;
    closeMenu();
  }
});

orderForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(orderForm);
  const customer = String(data.get('customer')).trim();
  const quantity = Number(data.get('quantity'));
  const product = String(data.get('product'));
  const channel = String(data.get('channel'));
  const total = Number(data.get('total'));
  const initials = customer.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  orders.unshift({ id: crypto.randomUUID(), customer, quantity, product, channel, total, initials, time: 'Ahora', status: 'new', statusLabel: 'Nuevo' });
  saveOrders();
  renderOrders();
  closeOrderModal();
  orderForm.reset();
  updateOrderTotal();
  showToast(`Pedido de ${customer} registrado correctamente`);
});

document.getElementById('botSettings').addEventListener('click', () => {
  document.getElementById('automatizaciones').scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('Panel de automatizaciones seleccionado');
});

document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', (event) => {
  const target = item.getAttribute('href').slice(1);
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
  item.classList.add('active');
  if (target === 'catalogo') {
    event.preventDefault();
    const catalog = Object.entries(products).map(([name, price]) => `<div><strong>${escapeHtml(name)}</strong><span>Bs. ${price.toFixed(2)} por unidad</span></div>`).join('');
    showInfoModal('Catálogo', `<div class="catalog-list">${catalog}</div>`);
  }
  if (target === 'configuracion') {
    event.preventDefault();
    openSettings();
  }
}));

document.querySelectorAll('.text-button').forEach((button) => button.addEventListener('click', () => {
  const target = button.closest('.orders-panel') ? document.getElementById('pedidos') : document.getElementById('conversaciones');
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast(button.dataset.toast || 'Vista actualizada');
}));

document.querySelectorAll('.conversation-item').forEach((conversation) => conversation.addEventListener('click', () => {
  conversation.querySelector('.unread')?.remove();
  showInfoModal(conversation.querySelector('strong').textContent, `<p>${escapeHtml(conversation.querySelector('p').textContent)}</p><button class="primary-button reply-button">Responder conversación</button>`);
  document.querySelector('.reply-button').onclick = () => showToast('Conversación asignada a Kiara');
}));

document.querySelector('[aria-label="Buscar"]').addEventListener('click', () => {
  showInfoModal('Buscar pedidos', '<input class="global-search" type="search" placeholder="Nombre, producto o canal" autofocus><div class="search-results">Escribe para buscar en tus pedidos.</div>');
  const input = document.querySelector('.global-search');
  input.focus();
  input.addEventListener('input', () => {
    const term = input.value.toLowerCase();
    const matches = [...ordersBody.rows].filter((row) => row.textContent.toLowerCase().includes(term));
    document.querySelector('.search-results').textContent = term ? `${matches.length} pedido(s) encontrado(s)` : 'Escribe para buscar en tus pedidos.';
  });
});
document.querySelector('[aria-label="Notificaciones"]').addEventListener('click', (event) => showMenu(event.currentTarget, orders.length ? [{ label: `${orders.length} pedido(s) registrados`, action: () => document.getElementById('pedidos').scrollIntoView({ behavior: 'smooth' }) }] : [{ label: 'No hay notificaciones nuevas', action: () => showToast('No hay novedades por ahora') }]));
document.querySelector('.help-button').addEventListener('click', () => showInfoModal('Centro de ayuda', '<p>Consulta pedidos, responde conversaciones y administra automatizaciones desde este panel.</p><button class="primary-button reply-button">Entendido</button>'));
document.querySelector('.workspace-switcher').addEventListener('click', (event) => showMenu(event.currentTarget, [{ label: 'Fresas con Crema', action: () => showToast('Espacio de trabajo activo') }, { label: 'Crear espacio de trabajo', action: () => showToast('Función disponible próximamente') }]));
document.querySelector('.user-profile').addEventListener('click', (event) => showMenu(event.currentTarget, [{ label: 'Mi perfil', action: () => showToast('Perfil de Kiara') }, { label: 'Cerrar sesión', action: () => showToast('La sesión de demostración sigue activa') }]));

function normalizeCurrencyLabels() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => { node.nodeValue = node.nodeValue.replace(/\$\)/g, 'Bs.)').replace(/\$/g, 'Bs. '); });
}

updateWelcomeGreeting();
normalizeCurrencyLabels();
resetDemoData();
renderOrders();
renderConnections();
renderMessages();
setInterval(loadWhatsAppMessages, 5000);
loadWhatsAppMessages();