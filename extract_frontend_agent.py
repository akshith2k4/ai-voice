import os

def extract_frontend_agent(output_file):
    # Base source directory
    base_dir = "src"
    
    # Specific files to include
    target_files = [
        os.path.join(base_dir, "App.jsx"),
        os.path.join(base_dir, "main.jsx")
    ]
    
    # Directory to include fully
    agent_dir = os.path.join(base_dir, "agent")
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # First, process the specific files
        for file_path in target_files:
            if os.path.exists(file_path):
                write_file_to_output(file_path, outfile)
            else:
                print(f"Warning: {file_path} not found.")
                
        # Next, process the agent directory
        if os.path.exists(agent_dir) and os.path.isdir(agent_dir):
            for root, dirs, files in os.walk(agent_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    write_file_to_output(file_path, outfile)
        else:
            print(f"Warning: {agent_dir} directory not found.")

def write_file_to_output(file_path, outfile):
    try:
        with open(file_path, 'r', encoding='utf-8') as infile:
            content = infile.read()
            
        outfile.write(f"\n{'='*80}\n")
        outfile.write(f"File: {file_path}\n")
        outfile.write(f"{'='*80}\n\n")
        
        outfile.write(content)
        outfile.write("\n")
    except Exception as e:
        print(f"Could not read {file_path}: {e}")

if __name__ == "__main__":
    output_filename = "frontend_agent_code.txt"
    print(f"Extracting frontend agent code to {output_filename}...")
    extract_frontend_agent(output_filename)
    print("Done!")
