#!/usr/bin/env python3
"""Build a deterministic, secret-free source archive using an explicit allowlist."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[1]
output = root / 'public' / 'exceptionpilot-option-b.zip'
output.parent.mkdir(parents=True, exist_ok=True)
root_files = ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'drizzle.config.ts', 'Dockerfile', 'docker-compose.yml', '.dockerignore', '.gitignore', '.env.example', 'README.md', 'VALIDATION.md']
files = [root / name for name in root_files if (root / name).is_file()]
for directory, extensions in [('src', {'.ts','.tsx','.css','.svg'}), ('docs', {'.md'}), ('drizzle', {'.sql','.json'}), ('scripts', {'.ts','.py'}), ('public', {'.svg','.png','.jpg','.jpeg'})]:
    files.extend(p for p in (root / directory).rglob('*') if p.is_file() and p.suffix in extensions)
files = sorted(set(p for p in files if p.is_file() and not p.is_symlink()))
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in files:
        relative = path.relative_to(root)
        if any(part in {'.env','node_modules','.next','.git'} for part in relative.parts):
            continue
        archive.write(path, Path('exceptionpilot-option-b') / relative)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None, 'Archive integrity check failed'
    assert not any(Path(name).name.startswith('.env') and not name.endswith('.env.example') for name in archive.namelist()), 'Secret environment file detected'
print(f'Created {output.relative_to(root)}: {len(files)} files, {output.stat().st_size:,} bytes')
print('SHA-256:', hashlib.sha256(output.read_bytes()).hexdigest())
