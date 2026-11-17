#!/usr/bin/env python3
"""Prepare only the private attachment rootfs. Never installs a host service."""
import argparse
import hashlib
import json
import os
import platform
import tarfile
import urllib.request
from pathlib import Path

ASSETS = {
    'x86_64': ('amd64', '0014d3b6f352ad74f5b0dfa93bc2137aaefc6dd1ec06e381cea7f1b6e5d29046'),
    'aarch64': ('arm64', '9d2a0de52fbb36e0294360dd19ed45684e7f28b7d32801b6d7869a4b8337e994'),
}

def prepare(data):
    if not data.is_absolute() or data.is_symlink():
        raise ValueError('absolute private attachment data directory required')
    data.mkdir(mode=0o700, parents=True, exist_ok=True)
    if data.stat().st_mode & 0o077:
        raise ValueError('attachment data directory must be 0700')
    target = data / 'rootfs'
    if target.exists():
        raise ValueError('existing rootfs retained; refusing overwrite')
    arch, digest = ASSETS[platform.machine()]
    archive = data / ('tcpquality-rootfs-' + arch + '.tar.xz')
    if not archive.exists():
        request = urllib.request.Request('https://github.com/ibsgss/TcpQuality/releases/download/v1beta.latest/' + archive.name, headers={'User-Agent': 'Atlas-Komari-TcpQuality/0.4.0'})
        with urllib.request.urlopen(request, timeout=90) as response, archive.open('xb') as stream:
            archive.chmod(0o600)
            size = 0
            while block := response.read(1024 * 1024):
                size += len(block)
                if size > 160000000:
                    raise ValueError('rootfs download exceeds bound')
                stream.write(block)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != digest:
        raise ValueError('upstream rootfs checksum mismatch; retained without execution')
    target.mkdir(mode=0o700)
    def safe_member(member, destination):
        if member.isdev() or member.isfifo():
            return None
        return tarfile.data_filter(member, destination)
    with tarfile.open(archive, 'r:xz') as package:
        package.extractall(target, filter=safe_member)
    marker = data / 'rootfs-prepared.json'
    fd = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump({'sha256': digest, 'architecture': arch, 'upstreamCommit': 'db52fc60523320fc4a34b5c369f28be38df21d13'}, stream)
    print(json.dumps({'rootfsPrepared': True, 'sha256': digest, 'hostPackagesInstalled': False, 'systemdUnitCreated': False}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, required=True)
    prepare(parser.parse_args().data)
