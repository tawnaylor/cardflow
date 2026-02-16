"""
Download card images from pkmncards set pages and write an index JSON.

Usage:
  python download_images_from_pkmncards.py https://pkmncards.com/sets/<set-slug> ...

Notes:
- This is a best-effort scraper. If the site layout changes the script may need tweaks.
- Saved images go to `database/pkmn-images/<set-slug>/` and an `index.json` is created at `database/pkmn-images/index.json`.
- Run this locally (it obeys robots implicitly — use responsibly).
"""
import sys
import os
import json
from urllib.parse import urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print('Missing dependency. Install with: pip install requests beautifulsoup4')
    sys.exit(1)

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'database', 'pkmn-images')
os.makedirs(OUT_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'cardflow-image-downloader/1.0 (+https://github.com)'
}

def slug_from_url(u):
    p = urlparse(u).path.rstrip('/')
    return os.path.basename(p)

def download_set(set_url):
    slug = slug_from_url(set_url) or 'unknown-set'
    dest_dir = os.path.join(OUT_DIR, slug)
    os.makedirs(dest_dir, exist_ok=True)

    print(f'Fetching set page: {set_url}')
    r = requests.get(set_url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, 'html.parser')

    # Find image elements that look like card images
    imgs = []
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src')
        if not src: continue
        if 'pkmncards.com' in src or '/cards/' in src or src.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            imgs.append((img, src))

    mapping = {}
    count = 0
    for img, src in imgs:
        # normalize full URL
        src_url = src if src.startswith('http') else requests.compat.urljoin(set_url, src)
        fname = os.path.basename(urlparse(src_url).path)
        # try to extract a number from filename or alt text
        alt = (img.get('alt') or '').strip()
        number = None
        # common patterns: filenames like 001.jpg or 1.png or name-001.jpg
        import re
        m = re.search(r'([0-9]{1,4})', fname)
        if m:
            number = m.group(1)
        else:
            m2 = re.search(r'([0-9]{1,4})', alt)
            if m2:
                number = m2.group(1)
        if not number:
            # fallback to sequential index
            number = str(count + 1)

        out_path = os.path.join(dest_dir, f'{number}{os.path.splitext(fname)[1] or ".jpg"}')
        try:
            if os.path.exists(out_path):
                print(f'  Exists: {out_path} (skipping)')
            else:
                print(f'  Downloading {src_url} -> {out_path}')
                rr = requests.get(src_url, headers=HEADERS, timeout=20)
                rr.raise_for_status()
                with open(out_path, 'wb') as fh:
                    fh.write(rr.content)
            mapping[number] = os.path.relpath(out_path, os.path.join(os.path.dirname(__file__), '..'))
            count += 1
        except Exception as ex:
            print('  Failed to download', src_url, ex)

    return slug, mapping

def main():
    if len(sys.argv) < 2:
        print('Usage: python download_images_from_pkmncards.py <set-url> [<set-url> ...]')
        sys.exit(1)

    overall_index = {}
    for url in sys.argv[1:]:
        try:
            slug, mapping = download_set(url)
            overall_index[slug] = mapping
        except Exception as e:
            print('Error processing', url, e)

    index_path = os.path.join(OUT_DIR, 'index.json')
    with open(index_path, 'w', encoding='utf-8') as fh:
        json.dump(overall_index, fh, indent=2)

    print('\nWrote index to', index_path)
    print('Done.')

if __name__ == '__main__':
    main()
