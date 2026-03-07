#!/usr/bin/env bash
set -euo pipefail
export PATH="/home/isouza/.nvm/versions/node/v22.22.1/bin:$PATH"

# Carrega configuração persistente compartilhada entre sessões (se existir)
ENV_FILE="${SONOFF_ENV_FILE:-/home/isouza/.openclaw/workspace/.sonoff.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

# Required env vars:
# EWELINK_APP_ID
# EWELINK_API_SECRET
# EWELINK_REGION (default: us)
# EWELINK_ACCESS_TOKEN

: "${EWELINK_APP_ID:=}"
: "${EWELINK_API_SECRET:=}"
: "${EWELINK_REGION:=us}"
: "${EWELINK_ACCESS_TOKEN:=}"
: "${EWELINK_REFRESH_TOKEN:=}"

persist_env_value() {
  local key="$1"
  local value="$2"
  local file="$ENV_FILE"

  python3 - "$file" "$key" "$value" <<'PY'
import pathlib, re, sys
file, key, value = sys.argv[1:4]
p = pathlib.Path(file)
line = f'{key}="{value}"\n'
if p.exists():
    txt = p.read_text()
    pat = re.compile(rf'^{re.escape(key)}=.*$', re.M)
    if pat.search(txt):
        txt = pat.sub(line.strip(), txt)
    else:
        if txt and not txt.endswith('\n'):
            txt += '\n'
        txt += line
else:
    txt = line
p.write_text(txt)
PY
}

auto_refresh_token() {
  [[ -n "${EWELINK_REFRESH_TOKEN:-}" ]] || return 0

  local out
  if ! out=$(node - <<'NODE'
(async () => {
  const e = require('ewelink-api-next').default;
  const c = new e.WebAPI({
    appId: process.env.EWELINK_APP_ID,
    appSecret: process.env.EWELINK_API_SECRET,
    region: process.env.EWELINK_REGION || 'us'
  });
  const r = await c.user.refreshToken({ rt: process.env.EWELINK_REFRESH_TOKEN });
  const at = r?.data?.at || r?.at;
  const rt = r?.data?.rt || r?.rt;
  if (!at || !rt) {
    console.log(JSON.stringify({ ok: false, raw: r }));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, at, rt }));
})().catch(() => process.exit(1));
NODE
); then
    return 0
  fi

  local new_at new_rt
  read -r new_at new_rt < <(python3 - <<'PY' "$out"
import json, sys
try:
    d=json.loads(sys.argv[1])
    print((d.get('at') or '') + ' ' + (d.get('rt') or ''))
except Exception:
    print(' ')
PY
)
  [[ -n "$new_at" && -n "$new_rt" ]] || return 0

  export EWELINK_ACCESS_TOKEN="$new_at"
  export EWELINK_REFRESH_TOKEN="$new_rt"
  persist_env_value "EWELINK_ACCESS_TOKEN" "$new_at"
  persist_env_value "EWELINK_REFRESH_TOKEN" "$new_rt"
}

cmd="${1:-}"
name_or_id="${2:-}"
state="${3:-}"

if [[ -z "$cmd" ]]; then
  echo "uso: $0 [list|status|set] [NOME_OU_ID] [on|off]"
  exit 1
fi

# Auto-refresh opcional (desligado por padrão para evitar trocar contexto sem querer).
if [[ "${EWELINK_AUTO_REFRESH:-0}" == "1" ]]; then
  auto_refresh_token
fi

node_cmd() {
  node - "$@"
}

case "$cmd" in
  list)
    node_cmd <<'NODE'
(async () => {
  const e = require('ewelink-api-next').default;
  const c = new e.WebAPI({
    appId: process.env.EWELINK_APP_ID,
    appSecret: process.env.EWELINK_API_SECRET,
    region: process.env.EWELINK_REGION || 'us'
  });
  c.at = process.env.EWELINK_ACCESS_TOKEN;
  const r = await c.device.getAllThingsAllPages({ num: 0, beginIndex: 0 });
  const list = r?.data?.thingList || r?.thingList || [];
  const out = list.map(t => ({
    name: t?.name || t?.itemData?.name || null,
    id: t?.itemData?.deviceid || t?.deviceid || t?.id || null,
    online: t?.itemData?.online ?? t?.online ?? null,
    params: {
      switch: t?.itemData?.params?.switch ?? t?.params?.switch ?? null
    }
  }));
  console.log(JSON.stringify({ total: out.length, devices: out }, null, 2));
})();
NODE
    ;;

  status)
    if [[ -z "$name_or_id" ]]; then echo "informe nome ou id"; exit 1; fi
    export TARGET="$name_or_id"
    node_cmd <<'NODE'
(async () => {
  const e = require('ewelink-api-next').default;
  const c = new e.WebAPI({
    appId: process.env.EWELINK_APP_ID,
    appSecret: process.env.EWELINK_API_SECRET,
    region: process.env.EWELINK_REGION || 'us'
  });
  c.at = process.env.EWELINK_ACCESS_TOKEN;

  const all = await c.device.getAllThingsAllPages({ num: 0, beginIndex: 0 });
  const list = all?.data?.thingList || all?.thingList || [];
  const target = process.env.TARGET.toLowerCase();
  const found = list.find(t => {
    const name = (t?.name || t?.itemData?.name || '').toLowerCase();
    const id = (t?.itemData?.deviceid || t?.deviceid || t?.id || '').toLowerCase();
    return name === target || id === target;
  });
  if (!found) {
    console.log(JSON.stringify({ error: 'device_not_found', target: process.env.TARGET }, null, 2));
    return;
  }

  const id = found?.itemData?.deviceid || found?.deviceid || found?.id;
  const resp = await c.device.getThingStatus({ type: 1, id });
  console.log(JSON.stringify({
    name: found?.name || found?.itemData?.name,
    id,
    online: found?.itemData?.online ?? found?.online ?? null,
    status: resp
  }, null, 2));
})();
NODE
    ;;

  set)
    if [[ -z "$name_or_id" || -z "$state" ]]; then echo "uso: $0 set <nome|id> <on|off>"; exit 1; fi
    if [[ "$state" != "on" && "$state" != "off" ]]; then echo "estado inválido: use on/off"; exit 1; fi
    if [[ "${SONOFF_CONFIRM:-}" != "YES" ]]; then
      echo "bloqueado: use SONOFF_CONFIRM=YES para aplicar"
      exit 1
    fi
    export TARGET="$name_or_id" TARGET_STATE="$state"
    node_cmd <<'NODE'
(async () => {
  const e = require('ewelink-api-next').default;
  const c = new e.WebAPI({
    appId: process.env.EWELINK_APP_ID,
    appSecret: process.env.EWELINK_API_SECRET,
    region: process.env.EWELINK_REGION || 'us'
  });
  c.at = process.env.EWELINK_ACCESS_TOKEN;

  const all = await c.device.getAllThingsAllPages({ num: 0, beginIndex: 0 });
  const list = all?.data?.thingList || all?.thingList || [];
  const target = process.env.TARGET.toLowerCase();
  const found = list.find(t => {
    const name = (t?.name || t?.itemData?.name || '').toLowerCase();
    const id = (t?.itemData?.deviceid || t?.deviceid || t?.id || '').toLowerCase();
    return name === target || id === target;
  });
  if (!found) {
    console.log(JSON.stringify({ error: 'device_not_found', target: process.env.TARGET }, null, 2));
    return;
  }

  const id = found?.itemData?.deviceid || found?.deviceid || found?.id;

  const before = await c.device.getThingStatus({ type: 1, id });
  const write = await c.device.setThingStatus({ type: 1, id, params: { switch: process.env.TARGET_STATE } });
  const after = await c.device.getThingStatus({ type: 1, id });

  console.log(JSON.stringify({
    name: found?.name || found?.itemData?.name,
    id,
    requested: process.env.TARGET_STATE,
    before,
    write,
    after
  }, null, 2));
})();
NODE
    ;;

  *)
    echo "comando inválido: $cmd"
    exit 1
    ;;
esac
