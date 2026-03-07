const grid = document.getElementById('grid');
const stats = document.getElementById('stats');
const statusText = document.getElementById('statusText');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const emptyState = document.getElementById('emptyState');
const tpl = document.getElementById('cardTpl');

let allDevices = [];

async function api(url, opts) {
  const res = await fetch(url, {
    headers: { 'content-type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro HTTP ${res.status}`);
  return data;
}

function setStatus(msg) {
  const now = new Date().toLocaleTimeString('pt-BR');
  statusText.textContent = `${msg} · ${now}`;
}

function getSwitchState(device) {
  const sw = device?.params?.switch;
  if (sw === 'on' || sw === 'off') return sw;
  return 'desconhecido';
}

function renderStats(devices) {
  const total = devices.length;
  const online = devices.filter((d) => d.online).length;
  const offline = total - online;
  const on = devices.filter((d) => getSwitchState(d) === 'on').length;

  stats.innerHTML = `
    <div class="stat">Total: <strong>${total}</strong></div>
    <div class="stat">Online: <strong>${online}</strong></div>
    <div class="stat">Offline: <strong>${offline}</strong></div>
    <div class="stat">Ligados: <strong>${on}</strong></div>
  `;
}

function getFilteredDevices(devices) {
  const term = (searchInput.value || '').trim().toLowerCase();
  const filter = filterSelect.value;

  return devices.filter((device) => {
    const byStatus =
      filter === 'all' ||
      (filter === 'online' && device.online) ||
      (filter === 'offline' && !device.online);

    if (!byStatus) return false;
    if (!term) return true;

    const name = String(device.name || '').toLowerCase();
    const id = String(device.id || '').toLowerCase();
    return name.includes(term) || id.includes(term);
  });
}

function renderDevices(devices) {
  grid.innerHTML = '';

  devices.forEach((device) => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    const name = node.querySelector('.name');
    const id = node.querySelector('.id');
    const state = node.querySelector('.state');
    const pill = node.querySelector('.pill');
    const onBtn = node.querySelector('.btn.on');
    const offBtn = node.querySelector('.btn.off');

    const switchState = getSwitchState(device);

    name.textContent = device.name || '(sem nome)';
    id.textContent = device.id || '';
    state.textContent = `Estado: ${switchState === 'on' ? 'Ligado' : switchState === 'off' ? 'Desligado' : 'Desconhecido'}`;

    pill.textContent = device.online ? 'online' : 'offline';
    pill.classList.add(device.online ? 'online' : 'offline');

    onBtn.disabled = !device.online || switchState === 'on';
    offBtn.disabled = !device.online || switchState === 'off';

    const setLoading = (loading) => {
      onBtn.disabled = loading || !device.online;
      offBtn.disabled = loading || !device.online;
      card.style.opacity = loading ? '.7' : '1';
    };

    const toggle = async (nextState) => {
      try {
        setLoading(true);
        setStatus(`Aplicando ${nextState} em ${device.name}...`);
        await api('/sonoff/api/set', {
          method: 'POST',
          body: JSON.stringify({ name: device.name, state: nextState }),
        });
        setStatus(`${device.name}: ${nextState === 'on' ? 'ligado' : 'desligado'} com sucesso`);
      } catch (e) {
        setStatus(`Falha em ${device.name}: ${e.message}`);
      } finally {
        setLoading(false);
        await loadDevices();
      }
    };

    onBtn.addEventListener('click', () => toggle('on'));
    offBtn.addEventListener('click', () => toggle('off'));

    grid.appendChild(node);
  });

  emptyState.hidden = devices.length > 0;
}

function refreshView() {
  const filtered = getFilteredDevices(allDevices);
  renderDevices(filtered);
}

async function loadDevices() {
  try {
    refreshBtn.disabled = true;
    setStatus('Atualizando lista...');
    const data = await api('/sonoff/api/devices');
    allDevices = data.devices || [];
    renderStats(allDevices);
    refreshView();
    setStatus(`Lista atualizada (${allDevices.length} dispositivos)`);
  } catch (e) {
    setStatus(`Erro ao carregar dispositivos: ${e.message}`);
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadDevices);
searchInput.addEventListener('input', refreshView);
filterSelect.addEventListener('change', refreshView);

loadDevices();
