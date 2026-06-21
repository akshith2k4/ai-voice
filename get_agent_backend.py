#!/usr/bin/env python3
import os
import argparse

def get_file_extension(filename):
    _, ext = os.path.splitext(filename)
    return ext.lower().replace('.', '')

def generate_dump(source_dir, output_file, exclude_dirs):
    if not os.path.isdir(source_dir):
        print(f"Error: The source directory '{source_dir}' does not exist.")
        return

    # Files to ignore (e.g. system files, binaries)
    ignore_files = {'.ds_store', 'thumbs.db', 'package-lock.json', 'bun.lock'}
    ignore_extensions = {'png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'wav'}

    files_to_process = []
    
    # Walk directory recursively
    for root, dirs, files in os.walk(source_dir):
        # Filter directories in-place to prevent os.walk from entering excluded folders
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            if file.lower() in ignore_files:
                continue
            
            ext = get_file_extension(file)
            if ext in ignore_extensions:
                continue

            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, source_dir)
            files_to_process.append((rel_path, full_path))

    # Sort files alphabetically by relative path
    files_to_process.sort(key=lambda x: x[0])

    print(f"Found {len(files_to_process)} backend files (excluding {', '.join(exclude_dirs)}) in '{source_dir}'. Generating '{output_file}'...")

    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("# Agent Backend Codebase Dump\n\n")
        out.write(f"This document consolidates backend source files from the `{source_dir}` directory (excluding tests and dependencies).\n\n")
        
        # Write Table of Contents
        out.write("## Table of Contents\n\n")
        for rel_path, _ in files_to_process:
            # Create a simple anchor link
            anchor = rel_path.lower().replace('/', '').replace('.', '').replace('_', '').replace('-', '')
            out.write(f"- [{rel_path}](#{anchor})\n")
        out.write("\n---\n\n")

        # Write each file's content
        for rel_path, full_path in files_to_process:
            ext = get_file_extension(rel_path)
            # Map extensions for markdown syntax highlighting
            lang = ext
            if ext in ['ts', 'tsx']:
                lang = 'typescript'
            elif ext in ['js', 'jsx']:
                lang = 'javascript'
            elif ext == 'json':
                lang = 'json'
            elif ext == 'md':
                lang = 'markdown'
            elif ext in ['env', 'gitignore']:
                lang = 'text'
            
            # Write header block
            anchor = rel_path.lower().replace('/', '').replace('.', '').replace('_', '').replace('-', '')
            out.write(f"## {rel_path} <a name=\"{anchor}\"></a>\n\n")
            out.write(f"**Path:** `{source_dir}/{rel_path}`  \n")
            out.write(f"**Size:** {os.path.getsize(full_path)} bytes\n\n")
            
            # Read and write content
            try:
                with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                
                out.write(f"```{lang}\n")
                out.write(content)
                # Ensure it ends with a newline
                if not content.endswith('\n'):
                    out.write('\n')
                out.write("```\n\n")
            except Exception as e:
                out.write(f"*Error reading file content: {e}*\n\n")
            
            out.write("---\n\n")

    print(f"Successfully generated {output_file}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Consolidate backend code files into a single markdown file, excluding tests.")
    parser.add_argument('--dir', default='agent-backend', help="Directory of the backend code (default: agent-backend)")
    parser.add_argument('--output', default='agent_backend_code.md', help="Output file path (default: agent_backend_code.md)")
    parser.add_argument('--exclude', nargs='+', default=['tests', 'node_modules', '.git', 'scratch', 'dist'], 
                        help="List of directory names to exclude (default: tests, node_modules, .git, scratch, dist)")
    
    args = parser.parse_args()
    
    generate_dump(args.dir, args.output, args.exclude)
