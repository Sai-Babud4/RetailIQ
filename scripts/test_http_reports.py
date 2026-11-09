import urllib.request
import json

types = ['sales', 'valuation', 'stockouts', 'overstocking', 'turnover', 'expenditure', 'suppliers', 'forecasts', 'errors', 'agent']
for t in types:
    url = f'http://127.0.0.1:8000/api/reports/{t}'
    try:
        res = urllib.request.urlopen(url)
        data = json.loads(res.read().decode())
        print(f"[OK] {t}: name='{data.get('report_name')}', keys={list(data.keys())[:5]}")
    except Exception as e:
        print(f"[FAIL] {t}: {e}")

