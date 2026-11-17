#!/usr/bin/env python3
"""Create stable companion artifacts; no network, install or publishing."""
import gzip
import hashlib
import io
import json
import subprocess
import tarfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results/release'
PLUGIN = ['komari-plugin.json', 'script.js', 'protocol.cjs', 'storage.cjs', 'request-limits.cjs', 'public-summary.cjs', 'tcpquality.cjs', 'LICENSE']
HELPER = ['enhanced_route_helper.py', 'enhanced_probe_v2.py', 'install.py', 'helper-version.json', 'enhanced-route-helper.service', 'enhanced-route-helper.openrc', 'helper.example.json', 'README.md', 'LICENSE']

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    short = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=ROOT, text=True).strip())
    plugin_manifest = json.loads((ROOT / 'companion/enhanced-route-probe/komari-plugin.json').read_text())
    helper_manifest = json.loads((ROOT / 'companion/helper/helper-version.json').read_text())
    plugin_base, helper_base = plugin_manifest['version'], helper_manifest['version']
    plugin_manifest['version'] += '+git.' + short
    helper_manifest['version'] += '+git.' + short
    def metadata(version):
        return json.dumps({'commit': commit, 'dirty': dirty, 'kind': 'stable-release', 'channel': 'stable', 'version': version}, sort_keys=True).encode() + b'\n'
    plugin = OUTPUT / f'enhanced-route-probe-{plugin_base}.zip'
    with zipfile.ZipFile(plugin, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in PLUGIN:
            source = ROOT / 'companion/enhanced-route-probe' / name
            if source.is_symlink() or not source.is_file():
                raise ValueError('missing or unsafe plugin asset')
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, json.dumps(plugin_manifest, indent=2).encode() + b'\n' if name == 'komari-plugin.json' else source.read_bytes())
        info = zipfile.ZipInfo('BUILD.json', date_time=(2026, 1, 1, 0, 0, 0))
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, metadata(plugin_manifest['version']))
    helper = OUTPUT / f'enhanced-route-helper-{helper_base}.tar.gz'
    with helper.open('wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as compressed, tarfile.open(fileobj=compressed, mode='w') as archive:
        for name in HELPER + ['BUILD.json']:
            source = ROOT / 'companion/helper' / name
            content = metadata(helper_manifest['version']) if name == 'BUILD.json' else json.dumps(helper_manifest).encode() + b'\n' if name == 'helper-version.json' else source.read_bytes()
            if name != 'BUILD.json' and source.is_symlink():
                raise ValueError('unsafe helper asset')
            info = tarfile.TarInfo(f'enhanced-route-helper-{helper_base}/' + name)
            info.size = len(content)
            info.mode = 0o755 if name.endswith('.openrc') else 0o644
            info.mtime = 0
            archive.addfile(info, io.BytesIO(content))
    assets = [plugin, helper]
    # Native plugin and standalone helper ZIPs for the Atlas release page.
    helper_zip = OUTPUT / f'atlas-route-helper-{helper_base}.zip'
    with tarfile.open(helper, 'r:gz') as source, zipfile.ZipFile(helper_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
        for member in source.getmembers():
            if member.isfile():
                name = member.name.split('/', 1)[1]
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.external_attr = member.mode << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, source.extractfile(member).read())
    assets.append(helper_zip)
    attachment_dir = ROOT / 'companion/tcpquality'
    attachment_manifest = json.loads((attachment_dir / 'attachment.json').read_text())
    attachment_base = attachment_manifest['version']
    attachment_manifest['version'] += '+git.' + short
    attachment = OUTPUT / f'atlas-komari-tcpquality-{attachment_base}.zip'
    attachment_files = ['attachment.json', 'attachment.example.json', 'collector.py', 'prepare.py', 'enroll.py', 'README.md', 'LICENSE', 'upstream-lock.json']
    attachment_files += ['vendor/' + name for name in ('runTcpQuality.sh', 'runTcpQuality-core.sh', 'runTcpQuality-rootfs.sh', 'LICENSE', 'README.md')]
    with zipfile.ZipFile(attachment, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in attachment_files + ['BUILD.json']:
            source = attachment_dir / name
            if name == 'BUILD.json':
                content = metadata(attachment_manifest['version'])
            else:
                if source.is_symlink() or not source.is_file():
                    raise ValueError('missing or unsafe attachment asset')
                content = json.dumps(attachment_manifest, indent=2).encode() + b'\n' if name == 'attachment.json' else source.read_bytes()
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content)
    assets.append(attachment)
    theme = ROOT / ('komari-theme-Atlas-build-' + subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip() + '.zip')
    if theme.is_file():
        assets.append(theme)
    records = [{'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size} for path in assets]
    report = {'commit': commit, 'dirty': dirty, 'artifacts': records, 'published': False}
    (OUTPUT / 'artifacts.json').write_text(json.dumps(report, indent=2) + '\n')
    (OUTPUT / 'SHA256SUMS').write_text(''.join(row['sha256'] + '  ' + Path(row['path']).name + '\n' for row in records))
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
