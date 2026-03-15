import os
import re

directories = ['app', 'components', 'utils', 'lib', 'types']
root_dir = 'b:/projects/siap-tempur'

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Revert accidental alias import path replacements
    new_content = content.replace('@/components/cpns/dashboard', '@/components/dashboard')
    new_content = new_content.replace('@/lib/cpns/dashboard', '@/lib/dashboard')
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Reverted in {file_path}")

for directory in directories:
    dir_path = os.path.join(root_dir, directory)
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                process_file(os.path.join(root, file))
