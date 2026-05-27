# blindsafe.spec — PyInstaller spec para BlindSafe Contratos
block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('frontend/dist',                   'frontend/dist'),
        ('templates/proposta.pptx',         'templates'),
        ('templates/contrato_veiculo.docx', 'templates'),
        ('templates/procuracao.docx',       'templates'),
        ('templates/procuracao_pj.docx',    'templates'),
        ('templates/emprestimo.docx',       'templates'),
        ('templates/veiculo.docx',          'templates'),
        ('templates/hipo.docx',             'templates'),
    ],
    hiddenimports=[
        'webview.platforms.edgechromium',
        'backend.api',
        'backend.document_generator',
        'pptx',
        'pptx.util',
        'pptx.enum.shapes',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BlindSafe',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    icon='blindsafe_icon.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name='BlindSafe',
)
