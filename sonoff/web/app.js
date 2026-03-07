const grid = document.getElementById('grid');
const stats = document.getElementById('stats');
const statusText = document.getElementById('statusText');
const refreshBtn = document.getElementById('refreshBtn');
const tpl = document.getElementById('cardTpl');

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

function renderStats(devices) {
  const total = devices.length;
  const online = devices.filter(d => d.online).length;
  const offline = total - online;
  stats.innerHTML = `
    <div class="stat">Total: <strong>${total}</strong></div>
    <div class="stat">Online: <strong>${online}</strong></div>
    <div class="stat">Offline: <strong>${offline}</strong></div>
  `;
}

function renderDevices(devices) {
  grid.innerHTML = '';
  devices.forEach((device) => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    const name = node.querySelector('.name');
    const id = node.querySelector('.id');
    const pill = node.querySelector('.pill');
    const onBtn = node.querySelector('.btn.on');
    const offBtn = node.querySelector('.btn.off');

    name.textContent = device.name || '(sem nome)';
    id.textContent = device.id || '';
    pill.textContent = device.online ? 'online' : 'offline';
    pill.classList.add(device.online ? 'online' : 'offline');

    const setLoading = (loading) => {
      onBtn.disabled = loading;
      offBtn.disabled = loading;
      card.style.opacity = loading ? '.7' : '1';
    };

    const toggle = async (state) => {
      try {
        setLoading(true);
        setStatus(`Aplicando ${state} em ${device.name}...`);
        await api('/sonoff/api/set', {
          method: 'POST',
          body: JSON.stringify({ name: device.name, state }),
        });
        setStatus(`${device.name}: ${state === 'on' ? 'ligado' : 'desligado'} com sucesso`);
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
}

async function loadDevices() {
  try {
    refreshBtn.disabled = true;
    setStatus('Atualizando lista...');
    const data = await api('/sonoff/api/devices');
    const devices = data.devices || [];
    renderStats(devices);
    renderDevices(devices);
    setStatus(`Lista atualizada (${devices.length} dispositivos)`);
  } catch (e) {
    setStatus(`Erro ao carregar dispositivos: ${e.message}`);
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadDevices);
loadDevices();
