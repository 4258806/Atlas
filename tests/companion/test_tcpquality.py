import csv
import importlib.util
import io
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('attachment', ROOT / 'companion/tcpquality/collector.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
UUID = '00000000-0000-4000-8000-000000000001'
HEADERS = ['网络','IP版本','省份','运营商','域名','IP','状态','发送','收到','丢包率(%)','平均延迟ms','线路']
ROW = ['三网','IPv4','上海','电信','test.example','192.0.2.1','OK','30','30','0','150','CN2GIA']
def source(rows):
    text = io.StringIO()
    writer = csv.writer(text)
    writer.writerow(HEADERS)
    writer.writerows(rows)
    return text.getvalue().encode('utf-8-sig')
def parse(rows):
    return module.project_csv(source(rows), UUID, '2026-07-25T11:00:00.000Z', False)
class Contract(unittest.TestCase):
    def test_preserves_independent_labels_and_unavailable_ipv6_without_raw_ips(self):
        udp = ['UDP线路','IPv4','上海','电信','test.example','','OK','','','','','CN2GIA']
        large = [*ROW]
        large[0], large[-1] = 'IPv4大包','163->4837'
        report = parse([ROW,udp,large])
        self.assertEqual(len(module.PROVINCES),31)
        self.assertEqual(report['variants']['ipv4']['carriers']['telecom']['groups'][0],{'label':'CN2GIA','provinces':[29]})
        self.assertEqual(report['variants']['large4']['carriers']['telecom']['groups'][0]['label'],'163->4837')
        self.assertEqual(report['variants']['ipv6'],{'status':'unavailable','carriers':{}})
        self.assertEqual(report['variants']['udp4']['carriers']['telecom']['latencyMs'],None)
        self.assertNotIn('192.0.2.1',str(report))
        self.assertNotIn('test.example',str(report))
    def test_rejects_duplicate_observations(self):
        with self.assertRaises(ValueError):parse([ROW,ROW])
    def test_rejects_unrelated_test_sections_and_bad_samples(self):
        for index,value in [(0,'Speedtest'),(1,'IPv7'),(2,'unknown'),(3,'other'),(9,'NaN'),(10,'-1'),(11,'<img>'),(11,'1.2.3.4')]:
            row=[*ROW];row[index]=value
            with self.subTest(index=index,value=value),self.assertRaises(ValueError):parse([row])
    def test_does_not_invent_udp_quality(self):
        row=[*ROW];row[0]='UDP线路'
        with self.assertRaises(ValueError):parse([ROW,row])
    def test_no_valid_ipv4_is_not_success(self):
        with self.assertRaises(ValueError):parse([])
if __name__ == '__main__':unittest.main()
