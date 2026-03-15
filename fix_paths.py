import os
import re

directories = ['app', 'components', 'utils', 'lib', 'types']
root_dir = 'b:/projects/siap-tempur'

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to replace `/dashboard` with `/cpns/dashboard`
    # But ONLY if it's not already `/cpns/dashboard`
    # Regex: replace `/dashboard` not preceded by `/cpns`
    
    # Simple regex: (?<!/cpns)/dashboard
    # also handle things like `href="/dashboard"` -> `href="/cpns/dashboard"`
    # `redirect('/dashboard')` -> `redirect('/cpns/dashboard')`
    
    new_content = re.sub(r'(?<!/cpns)/dashboard', r'/cpns/dashboard', content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")

for directory in directories:
    dir_path = os.path.join(root_dir, directory)
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                process_file(os.path.join(root, file))
