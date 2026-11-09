import urllib.request
import json

types = ['valuation', 'stockouts', 'overstocking', 'turnover', 'expenditure']
for t in types:
    url = f'http://127.0.0.1:8000/api/reports/{t}'
    res = urllib.request.urlopen(url)
    data = json.loads(res.read().decode())
    print(f"=== {t.upper()} ===")
    for k, v in data.items():
        if isinstance(v, list):
            print(f"  {k}: list of {len(v)} items. Sample[0]: {v[0] if v else 'EMPTY'}")
        elif isinstance(v, dict):
            print(f"  {k}: dict with keys {list(v.keys())}")
        else:
            print(f"  {k}: {type(v).__name__} = {v}")

