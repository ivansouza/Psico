from flask import Flask, request, jsonify, send_file
from pathlib import Path
import tempfile
import uuid
import asyncio

app = Flask(__name__)
TMP_DIR = Path(tempfile.gettempdir()) / 'psico_edge_tts'
TMP_DIR.mkdir(parents=True, exist_ok=True)

PT_BR_VOICES = [
    {"id": "pt-BR-AntonioNeural", "label": "Antonio Neural (pt-BR)"},
    {"id": "pt-BR-BrendaNeural", "label": "Brenda Neural (pt-BR)"},
    {"id": "pt-BR-DonatoNeural", "label": "Donato Neural (pt-BR)"},
    {"id": "pt-BR-ElzaNeural", "label": "Elza Neural (pt-BR)"},
    {"id": "pt-BR-FabioNeural", "label": "Fabio Neural (pt-BR)"},
    {"id": "pt-BR-FranciscaNeural", "label": "Francisca Neural (pt-BR)"},
    {"id": "pt-BR-GiovannaNeural", "label": "Giovanna Neural (pt-BR)"},
    {"id": "pt-BR-HumbertoNeural", "label": "Humberto Neural (pt-BR)"},
    {"id": "pt-BR-JulioNeural", "label": "Julio Neural (pt-BR)"},
    {"id": "pt-BR-LeilaNeural", "label": "Leila Neural (pt-BR)"},
    {"id": "pt-BR-LeticiaNeural", "label": "Leticia Neural (pt-BR)"},
    {"id": "pt-BR-ManuelaNeural", "label": "Manuela Neural (pt-BR)"},
    {"id": "pt-BR-NicolauNeural", "label": "Nicolau Neural (pt-BR)"},
    {"id": "pt-BR-ValerioNeural", "label": "Valerio Neural (pt-BR)"},
    {"id": "pt-BR-YaraNeural", "label": "Yara Neural (pt-BR)"}
]

@app.get('/api/voices')
def voices():
    return jsonify(PT_BR_VOICES)

@app.post('/api/synthesize')
def synthesize():
    try:
        import edge_tts
    except Exception:
        return jsonify({'error': 'Dependência edge-tts não instalada. Rode: pip3 install edge-tts'}), 500

    data = request.get_json(force=True, silent=True) or {}
    text = (data.get('text') or '').strip()
    voice = (data.get('voice') or 'pt-BR-FranciscaNeural').strip()
    rate = (data.get('rate') or '+0%').strip()
    pitch = (data.get('pitch') or '+0Hz').strip()

    if not text:
        return jsonify({'error': 'Texto vazio.'}), 400
    if len(text) > 4000:
        return jsonify({'error': 'Texto muito longo. Limite: 4000 caracteres.'}), 400

    file_id = uuid.uuid4().hex
    out_path = TMP_DIR / f'{file_id}.mp3'

    async def run():
        communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
        await communicate.save(str(out_path))

    try:
        asyncio.run(run())
    except Exception as e:
        return jsonify({'error': f'Falha ao sintetizar: {e}'}), 500

    return jsonify({
        'ok': True,
        'audioUrl': f'/api/audio/{file_id}',
        'downloadUrl': f'/api/audio/{file_id}?download=1',
        'voice': voice
    })

@app.get('/api/audio/<file_id>')
def audio(file_id: str):
    path = TMP_DIR / f'{file_id}.mp3'
    if not path.exists():
        return jsonify({'error': 'Arquivo não encontrado.'}), 404
    as_attachment = request.args.get('download') == '1'
    return send_file(path, mimetype='audio/mpeg', as_attachment=as_attachment, download_name=f'edge-tts-{file_id}.mp3')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8765, debug=False)
