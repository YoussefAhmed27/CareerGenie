import os

def print_tree(directory, ignore_dirs):
    for root, dirs, files in os.walk(directory):
        
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        level = root.replace(directory, '').count(os.sep)
        indent = '│   ' * level
        print(f'{indent}├── {os.path.basename(root)}/')
        
        subindent = '│   ' * (level + 1)
        for f in files:
            if not f.startswith('.'):
                print(f'{subindent}├── {f}')

junk_folders = {'.git', 'node_modules', 'venv', 'env', '__pycache__', 'dist', 'build', '.next'}

print_tree(".", junk_folders)