import os
import sys

def consolidate_folder(folder_path, output_file):
    """
    Reads all text files (js, jsx, ts, tsx) in the given folder and its subfolders,
    and writes them into a single consolidated output file.
    """
    valid_extensions = ('.js', '.jsx', '.ts', '.tsx', '.css', '.json')
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file.endswith(valid_extensions):
                    file_path = os.path.join(root, file)
                    
                    # Write a clear separator and file header
                    outfile.write(f"\n\n{'='*80}\n")
                    outfile.write(f"File: {os.path.relpath(file_path, folder_path)}\n")
                    outfile.write(f"{'='*80}\n\n")
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"Error reading file {file_path}: {e}\n")
                        
    print(f"✅ Consolidation complete. Output written to: {output_file}")

if __name__ == "__main__":
    # Ensure this runs from the correct base directory or uses absolute paths
    workspace_root = "/Users/akshith/LG/linengrass-linengrass-laundry-erp-0b8dcd1fa41b"
    agent_folder = os.path.join(workspace_root, "src", "agent")
    output_path = os.path.join(workspace_root, "consolidated_frontend_agent.txt")
    
    if not os.path.exists(agent_folder):
        print(f"Error: The target folder does not exist at {agent_folder}")
        sys.exit(1)
        
    print(f"Consolidating files from {agent_folder}...")
    consolidate_folder(agent_folder, output_path)
