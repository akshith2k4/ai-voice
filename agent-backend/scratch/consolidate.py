import os
import sys

def consolidate_backend(root_dir, output_file):
    # Directories to completely exclude
    exclude_dirs = {
        'node_modules',
        'tests',
        'test',
        'scripts',
        'scratch',
        '.git',
        'dist',
        'build'
    }
    
    # Specific files to exclude
    exclude_files = {
        'package.json',
        'package-lock.json',
        'bun.lock',
        'tsconfig.json',
        '.env',
        '.gitignore',
        '.DS_Store',
        'consolidated_backend.txt',
        'consolidate.py'
    }
    
    # Allowed file extensions for backend code
    # We want to get the code, so TypeScript, JavaScript, and JSON (configurations/schemas) are relevant
    allowed_extensions = {'.ts', '.js', '.json'}
    
    print(f"Consolidating backend files from: {root_dir}")
    print(f"Excluding directories: {sorted(list(exclude_dirs))}")
    print(f"Excluding files: {sorted(list(exclude_files))}")
    print(f"Allowed extensions: {sorted(list(allowed_extensions))}")
    
    files_processed = 0
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Walk through directory
        for root, dirs, files in os.walk(root_dir):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in sorted(files):
                # Skip hidden files starting with . (except if allowed, but usually not needed)
                if file.startswith('.') and file not in allowed_extensions:
                    if file not in exclude_files:
                        print(f"Skipping hidden/config file: {file}")
                    continue
                
                if file in exclude_files:
                    print(f"Skipping excluded file: {file}")
                    continue
                
                # Check file extension
                _, ext = os.path.splitext(file)
                if ext not in allowed_extensions:
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)
                
                print(f"Adding: {rel_path}")
                
                # Write a clear separator and file header
                outfile.write("=" * 80 + "\n")
                outfile.write(f"FILE: {rel_path}\n")
                outfile.write("=" * 80 + "\n\n")
                
                try:
                    with open(full_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        outfile.write(content)
                        if not content.endswith('\n'):
                            outfile.write('\n')
                    outfile.write("\n\n")
                    files_processed += 1
                except Exception as e:
                    outfile.write(f"[ERROR READING FILE: {e}]\n\n\n")
                    print(f"Error reading {full_path}: {e}")
                    
    print(f"Successfully consolidated {files_processed} files into: {output_file}")

if __name__ == "__main__":
    # Get the directory of this script, which is workspace/agent-backend/scratch
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level to agent-backend
    backend_dir = os.path.dirname(script_dir)
    
    output_path = os.path.join(backend_dir, 'consolidated_backend.txt')
    consolidate_backend(backend_dir, output_path)
