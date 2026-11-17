#!/usr/bin/env python3
"""Komari attachment CLI: pinned upstream process, bounded result projection.

Atlas adapter is MIT; vendor/ retains upstream GPL-3.0-only. No daemon or listener.
"""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import io
import ipaddress
import json
import math
import os
import re
import signal
import statistics
import shutil
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

UPSTREAM = 'db52fc60523320fc4a34b5c369f28be38df21d13'
VARIANTS = ('ipv4', 'ipv6', 'udp4', 'udp6', 'large4')
CARRIERS = {'电信': 'telecom', '联通': 'unicom', '移动': 'mobile'}
PROVINCES = '河北 山西 辽宁 吉林 黑龙江 江苏 浙江 安徽 福建 江西 山东 河南 湖北 湖南 广东 海南 四川 贵州 云南 陕西 甘肃 青海 内蒙古 广西 西藏 宁夏 新疆 北京 天津 上海 重庆'.split()
LABEL = re.compile(r'^[A-Za-z0-9][A-Za-z0-9 ._+>/-]{0,47}$')
IP_TEXT = re.compile(r'(?:\d{1,3}\.){3}\d{1,3}')
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
ROOT = Path(__file__).resolve().parent
VERSION = json.loads((ROOT / 'attachment.json').read_text())['version']

def private(path, limit=20000):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        info = os.fstat(fd)
        if info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_size > limit:
            raise ValueError('attachment file is not private')
        return os.read(fd, limit + 1).decode('utf8')
    finally:
        os.close(fd)

def save_private(path, value):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w', encoding='utf8') as stream:
        json.dump(value, stream, ensure_ascii=False, separators=(',', ':'))

def configuration(path):
    cfg = json.loads(private(path))
    if set(cfg) != {'panel', 'uuid', 'tokenFile', 'dataDirectory', 'enabled'} or cfg['enabled'] is not True or not UUID.fullmatch(cfg['uuid']):
        raise ValueError('attachment configuration invalid or disabled')
    url = urllib.parse.urlsplit(cfg['panel'])
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ('', '/'):
        raise ValueError('existing HTTPS Agent origin required')
    if any(c.isspace() or ord(c) < 32 for c in cfg['panel']) or '\\' in cfg['panel'] or '%' in url.netloc:
        raise ValueError('invalid Agent origin')
    for key in ('tokenFile', 'dataDirectory'):
        if not Path(cfg[key]).is_absolute():
            raise ValueError('absolute local attachment paths required')
    cfg['panel'] = cfg['panel'].rstrip('/')
    return cfg

def statistic(value, maximum):
    if not value or value in ('-', 'N/A'):
        return None
    number = float(value)
    if not math.isfinite(number) or not 0 <= number <= maximum:
        raise ValueError('invalid observed statistic')
    return number

def project_csv(content, uuid, collected_at, ipv6_available):
    """No reclassification: keep upstream labels grouped by protocol/province."""
    if len(content) > 2000000 or not UUID.fullmatch(uuid):
        raise ValueError('invalid bounded CSV/identity')
    rows = {v: {c: {} for c in CARRIERS.values()} for v in VARIANTS}
    reader = csv.DictReader(io.StringIO(content.decode('utf-8-sig')))
    required = {'网络', 'IP版本', '省份', '运营商', '状态', '线路', '平均延迟ms', '丢包率(%)'}
    if not reader.fieldnames or not required.issubset(reader.fieldnames):
        raise ValueError('unknown upstream CSV format')
    for raw in reader:
        network, family = raw['网络'], raw['IP版本']
        if network not in ('三网', 'UDP线路', 'IPv4大包') or family not in ('IPv4', 'IPv6'):
            raise ValueError('out-of-scope test appeared in upstream output')
        if network == 'IPv4大包' and family != 'IPv4':
            raise ValueError('invalid large-packet family')
        variant = 'large4' if network == 'IPv4大包' else ('udp' if network == 'UDP线路' else 'ipv') + family[-1]
        if raw['省份'] not in PROVINCES or raw['运营商'] not in CARRIERS:
            raise ValueError('unexpected province/carrier')
        province, carrier = PROVINCES.index(raw['省份']), CARRIERS[raw['运营商']]
        if province in rows[variant][carrier]:
            raise ValueError('duplicate province observation')
        label = raw['线路'] or 'Hidden'
        if raw['状态'] != 'OK':
            label = 'Hidden' if raw['状态'] == 'SKIP' else 'failed'
        if not LABEL.fullmatch(label) or IP_TEXT.search(label):
            raise ValueError('invalid upstream route label')
        latency = statistic(raw['平均延迟ms'], 120000)
        loss = statistic(raw['丢包率(%)'], 100)
        if network == 'UDP线路' and (latency is not None or loss is not None):
            raise ValueError('UDP route identification must not invent quality metrics')
        rows[variant][carrier][province] = (label, latency, loss)
    variants = {}
    for variant, carriers in rows.items():
        if not any(carriers.values()):
            variants[variant] = {'status': 'unavailable' if variant in ('ipv6', 'udp6') and not ipv6_available else 'failed', 'carriers': {}}
            continue
        result = {}
        for carrier, observations in carriers.items():
            groups = collections.defaultdict(list)
            for province, row in observations.items():
                groups[row[0]].append(province)
            def median(column):
                values = [v[column] for v in observations.values() if v[column] is not None]
                return round(statistics.median(values), 3) if values else None
            result[carrier] = {'total': len(observations), 'groups': [{'label': label, 'provinces': sorted(values)} for label, values in sorted(groups.items())], 'latencyMs': median(1), 'retransmissionPercent': median(2)}
        variants[variant] = {'status': 'measured', 'carriers': result}
    if variants['ipv4']['status'] != 'measured':
        raise ValueError('no measured IPv4 observations')
    report = {'schema': 1, 'uuid': uuid, 'source': 'TcpQuality', 'scope': 'three-carrier', 'collectedAt': collected_at, 'upstreamCommit': UPSTREAM, 'collectorVersion': VERSION, 'reportHash': hashlib.sha256(content).hexdigest(), 'variants': variants}
    if len(json.dumps(report, separators=(',', ':')).encode()) > 14500:
        raise ValueError('bounded report exceeded; raw artifacts retained privately')
    return report

def verify_vendor():
    lock = json.loads((ROOT / 'upstream-lock.json').read_text())
    if lock['commit'] != UPSTREAM:
        raise ValueError('upstream source binding mismatch')
    for name, digest in lock['files'].items():
        if Path(name).name != name or hashlib.sha256((ROOT / 'vendor' / name).read_bytes()).hexdigest() != digest:
            raise ValueError('upstream file checksum mismatch')

def process_memory(root_pid):
    """Sample only this foreground command's descendant RSS, never argv/env."""
    parents, rss = {}, {}
    for directory in Path('/proc').iterdir():
        if not directory.name.isdigit():
            continue
        try:
            fields = (directory / 'stat').read_text().rsplit(')', 1)[1].split()
            pid = int(directory.name)
            parents[pid], rss[pid] = int(fields[1]), int(fields[21]) * os.sysconf('SC_PAGE_SIZE')
        except (OSError, ValueError, IndexError):
            continue
    selected = {root_pid}
    for _ in range(30):
        updated = selected | {pid for pid, parent in parents.items() if parent in selected}
        if updated == selected:
            break
        selected = updated
    return sum(rss.get(pid, 0) for pid in selected)

def collect(cfg):
    import fcntl
    import resource
    verify_vendor()
    data = Path(cfg['dataDirectory'])
    if data.is_symlink() or data.stat().st_mode & 0o077:
        raise ValueError('private attachment data directory required')
    lock_fd = os.open(data / 'collection.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    rootfs = data / 'rootfs'
    from prepare import ASSETS
    prepared = json.loads(private(data / 'rootfs-prepared.json'))
    import platform
    if not (rootfs / 'bin/bash').exists() or prepared.get('sha256') != ASSETS[platform.machine()][1] or prepared.get('upstreamCommit') != UPSTREAM:
        raise ValueError('prepare the verified private rootfs first')
    run_dir = data / ('run-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    run_dir.mkdir(mode=0o700)
    save_private(run_dir / 'ownership.json', {'component': 'komari-tcpquality-attachment', 'uuid': cfg['uuid']})
    subprocess.run(['/usr/bin/unshare', '--mount', '--propagation', 'private', '/bin/true'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    env = {'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': str(data), 'TERM': 'dumb', 'LANG': 'C.UTF-8', 'LC_ALL': 'C.UTF-8', 'TCPQUALITY_MOUNT_NS': '1', 'TCPQUALITY_RAW_BASE': 'https://raw.githubusercontent.com/ibsgss/TcpQuality/' + UPSTREAM}
    args = ['/usr/bin/unshare', '--mount', '--propagation', 'private', '/bin/bash', str(ROOT / 'vendor/runTcpQuality-rootfs.sh'), '--rootfs', str(rootfs), '--output', str(run_dir), '--', '--no-rank-upload', '--debug', '-p', '4', '-c', '30']
    ipv6 = bool(subprocess.check_output(['ip', '-6', 'route', 'show', 'default']).strip())
    def limits():
        os.nice(10)
        resource.setrlimit(resource.RLIMIT_CPU, (180, 180))
    start = time.monotonic()
    cpu_before = resource.getrusage(resource.RUSAGE_CHILDREN)
    peak, exceeded = 0, False
    with (run_dir / 'upstream.log').open('xb') as log:
        os.chmod(run_dir / 'upstream.log', 0o600)
        process = subprocess.Popen(args, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True, preexec_fn=limits)
        while process.poll() is None:
            peak = max(peak, process_memory(process.pid))
            if time.monotonic() - start > 1800 or peak > 384 * 1024**2:
                exceeded = True
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=20)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                break
            time.sleep(0.25)
        code = process.wait()
    if exceeded or code:
        raise ValueError('bounded upstream collection failed; private artifacts retained')
    paths = list(run_dir.glob('zstatic_nping_*.csv'))
    if len(paths) != 1:
        raise ValueError('expected exactly one upstream CSV')
    for artifact in run_dir.iterdir():
        if artifact.is_file():
            artifact.chmod(0o600)
    at = dt.datetime.now(dt.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    report = project_csv(paths[0].read_bytes(), cfg['uuid'], at, ipv6)
    save_private(run_dir / 'report.json', report)
    cpu_after = resource.getrusage(resource.RUSAGE_CHILDREN)
    measurement = {'seconds': round(time.monotonic() - start, 2), 'sampledPeakDescendantRSSBytes': peak, 'childCPUSeconds': round(cpu_after.ru_utime + cpu_after.ru_stime - cpu_before.ru_utime - cpu_before.ru_stime, 3), 'exitCode': code, 'newSystemdUnit': False, 'scope': 'three-carrier-only', 'upstreamReportUpload': False, 'speedTests': False, 'ipv6DefaultRoutePresent': ipv6}
    save_private(run_dir / 'measurement.json', measurement)
    os.close(lock_fd)
    # Retain 24 app-owned runs; never traverse/delete operator or legacy folders.
    history = sorted(data.glob('run-*'), reverse=True)
    for old in history[24:]:
        if old.is_symlink() or old.resolve().parent != data.resolve() or not re.fullmatch(r'run-\d{8}T\d{6}Z', old.name):
            continue
        marker = old / 'ownership.json'
        if marker.is_file() and json.loads(private(marker)) == {'component': 'komari-tcpquality-attachment', 'uuid': cfg['uuid']}:
            shutil.rmtree(old)
    return {'report': str(run_dir / 'report.json'), 'measurement': measurement}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Agent gateway redirect rejected')

def native(cfg, action, fields):
    payload = json.dumps({**fields, 'token': private(cfg['tokenFile'], 4096).strip()}, separators=(',', ':')).encode()
    if len(payload) > 16000:
        raise ValueError('Agent body exceeds bound')
    req = urllib.request.Request(cfg['panel'] + '/api/enhanced-route-probe/v1/' + action, data=payload, headers={'Content-Type': 'application/json', 'User-Agent': 'Atlas-Komari-TcpQuality/' + VERSION})
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as response:
        body = response.read(16385)
        if len(body) > 16384:
            raise ValueError('Agent response exceeds bound')
        return json.loads(body)

def publish(cfg, path, job_id):
    report = json.loads(private(path))
    if report.get('uuid') != cfg['uuid'] or report.get('upstreamCommit') != UPSTREAM or report.get('scope') != 'three-carrier':
        raise ValueError('report identity/provenance mismatch')
    if not re.fullmatch(r'[a-f0-9]{48}', job_id):
        raise ValueError('native job binding required')
    result = native(cfg, 'result', {'kind': 'tcpquality', 'report': report, 'job_id': job_id})
    if result.get('accepted') is not True:
        raise ValueError('native Komari plugin did not durably accept result')
    return {'accepted': True, 'collector': 'TcpQuality'}

def run_due(cfg):
    verify_vendor()
    response = native(cfg, 'poll', {'helper_version': VERSION})
    job = response.get('job')
    if job is None:
        return {'state': 'not-due', 'networkProbeStarted': False}
    if set(job) != {'id', 'kind', 'expiresAt', 'scope'} or job['kind'] != 'tcpquality-three-carrier' or job['scope'] != 'three-carrier' or not re.fullmatch(r'[a-f0-9]{48}', job['id']) or not time.time() * 1000 < job['expiresAt'] <= (time.time() + 2000) * 1000:
        raise ValueError('unexpected native attachment job; no probe started')
    result = collect(cfg)
    save_private(Path(result['report']).parent / 'native-job.json', job)
    result.update(publish(cfg, result['report'], job['id']))
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('collect', 'publish', 'run'))
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--job-id')
    args = parser.parse_args()
    cfg = configuration(args.config)
    if args.action == 'collect':
        if args.report:
            parser.error('collect does not accept a report path')
        print(json.dumps(collect(cfg)))
    elif args.action == 'run':
        if args.report or args.job_id:
            parser.error('scheduled run accepts no caller-provided job or report')
        print(json.dumps(run_due(cfg)))
    else:
        if not args.report or not args.job_id:
            parser.error('publish requires --report and --job-id')
        print(json.dumps(publish(cfg, args.report, args.job_id)))

if __name__ == '__main__':
    main()
