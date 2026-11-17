#!/usr/bin/env python3
"""Enroll this Komari Agent attachment using existing credentials and cron."""
import argparse
import datetime as dt
import json
import os
import re
import shlex
from pathlib import Path
from collector import configuration, private, save_private, UUID

def enroll(agent_config, uuid, data, config, schedule):
    if os.getuid() != 0 or not UUID.fullmatch(uuid):
        raise ValueError('root and the verified native node UUID required')
    agent = json.loads(agent_config.read_text())
    if not all(isinstance(agent.get(k), str) and agent[k] for k in ('endpoint', 'token')):
        raise ValueError('existing native Agent endpoint/token required')
    if not data.is_absolute() or not config.is_absolute() or data.is_symlink() or config.is_symlink():
        raise ValueError('absolute non-symlink attachment directories required')
    data.mkdir(mode=0o700, parents=True, exist_ok=True)
    config.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    token = config.parent / 'node-token'
    expected = {'panel': agent['endpoint'].rstrip('/'), 'uuid': uuid, 'tokenFile': str(token), 'dataDirectory': str(data), 'enabled': True}
    if config.exists():
        if configuration(config) != expected or private(token).strip() != agent['token']:
            raise ValueError('existing attachment configuration differs; retained')
    else:
        if token.exists():
            raise ValueError('unknown existing attachment token retained')
        fd = os.open(token, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as stream:stream.write(agent['token'])
        save_private(config, expected)
        configuration(config)
    cron = Path('/etc/cron.d/komari-tcpquality')
    if schedule:
        code = Path(__file__).resolve().parent / 'collector.py'
        text = '# Managed Komari TcpQuality attachment; native policy enforces hourly collection.\nSHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n* * * * * root /usr/bin/python3 ' + shlex.quote(str(code)) + ' run --config ' + shlex.quote(str(config)) + ' >> ' + shlex.quote(str(data / 'cron.log')) + ' 2>&1\n'
        if cron.exists() and cron.read_text() != text:
            raise ValueError('existing scheduler file differs; retained')
        if not cron.exists():
            fd = os.open(cron, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
            with os.fdopen(fd, 'w') as stream:stream.write(text)
    print(json.dumps({'attachmentEnrolled': True, 'existingCredentialsRetained': True, 'scheduleEnabled': bool(schedule), 'nativePeriodMinutes': 60, 'newServiceCreated': False}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--agent-config', type=Path, required=True)
    parser.add_argument('--uuid', required=True)
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--enable-schedule', action='store_true')
    args = parser.parse_args()
    enroll(args.agent_config, args.uuid, args.data, args.config, args.enable_schedule)
