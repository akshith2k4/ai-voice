import os

def extract_code(source_dir, output_file):
    # Directories to ignore completely
    ignore_dirs = {'node_modules', '.git', 'dist', 'build', '.tscache', '__pycache__'}
    
    # Specific files to ignore
    ignore_files = {'package.json', 'package-lock.json', 'yarn.lock'}
    
    # Allowed extensions for code files
    allowed_exts = {'.ts', '.js', '.tsx', '.jsx', '.json'}

    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.')]
            
            for file in files:
                # Skip ignored files
                if file in ignore_files:
                    continue
                    
                # Skip hidden files
                if file.startswith('.'):
                    continue
                    
                ext = os.path.splitext(file)[1]
                if ext not in allowed_exts:
                    continue
                    
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                    # Write file path as a header
                    outfile.write(f"\n{'='*80}\n")
                    outfile.write(f"File: {file_path}\n")
                    outfile.write(f"{'='*80}\n\n")
                    
                    # Write content
                    outfile.write(content)
                    outfile.write("\n")
                except Exception as e:
                    print(f"Could not read {file_path}: {e}")

if __name__ == "__main__":
    # Point this to the agent-backend directory
    source_directory = "agent-backend"
    output_filename = "agent_backend_all_code.txt"
    
    print(f"Extracting code from {source_directory} to {output_filename}...")
    extract_code(source_directory, output_filename)
    print("Done!")
