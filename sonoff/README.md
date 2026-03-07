# Sonoff Local (Auditado)

Fluxo local, sem skill de terceiros, para operar com segurança.

## Princípios
- Começar em **read-only**
- Confirmar dispositivo e modo (Cloud/LAN/DIY)
- Fazer **read-before-write** e **read-after-write**
- Nunca salvar token em arquivo versionado

## Variáveis de ambiente
```bash
export EWELINK_API_TOKEN="..."   # opcional, se usar cloud
export SONOFF_DEVICE_ID="..."    # id do dispositivo alvo
export SONOFF_BASE_URL="..."     # endpoint local, se LAN/DIY
```

## Comandos (helper)
```bash
bash sonoff/sonoff-safe.sh status
bash sonoff/sonoff-safe.sh dry-run on
bash sonoff/sonoff-safe.sh apply on
bash sonoff/sonoff-safe.sh apply off
```

## Web panel (Tailscale/local)
- URL local: `http://localhost:8787/sonoff` (ou `/sonoff/`)
- URL Tailscale: `http://<TAILSCALE_IP>:8787/sonoff`
- O frontend usa API absoluta em `/sonoff/api/*`, então funciona com e sem barra final.

Dependência Node necessária no workspace:
```bash
cd /home/isouza/.openclaw/workspace
npm init -y >/dev/null 2>&1 || true
npm install ewelink-api-next
```

## Modo seguro
- `dry-run` mostra o payload e não envia
- `apply` exige `SONOFF_CONFIRM=YES`

Exemplo:
```bash
SONOFF_CONFIRM=YES bash sonoff/sonoff-safe.sh apply on
```
