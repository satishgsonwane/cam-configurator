import json
import sys

def load_json(file_path):
    """Loads a JSON file."""
    with open(file_path, 'r') as f:
        return json.load(f)

def format_json(source_data, style_data):
    """Formats source_data to match the order and structure of style_data."""
    if isinstance(style_data, dict):
        formatted_data = {}
        for key in style_data:
            if key in source_data:
                formatted_data[key] = format_json(source_data[key], style_data[key])
        return formatted_data
    elif isinstance(style_data, list) and isinstance(source_data, list):
        formatted_list = []
        for i, item in enumerate(source_data):
            if i < len(style_data):
                formatted_list.append(format_json(item, style_data[0]))
            else:
                formatted_list.append(item)
        return formatted_list
    else:
        return source_data

def main(source_file, style_file, output_file):
    source_data = load_json(source_file)
    style_data = load_json(style_file)
    
    formatted_data = format_json(source_data, style_data)
    
    with open(output_file, 'w') as f:
        json.dump(formatted_data, f, indent=4)
    
    print(f"Formatted JSON saved to {output_file}")

if __name__ == "__main__":
    source_file = "./app/data/imported.json"   # Source config file
    style_file = "./app/data/config1.json"     # Styling config file
    output_file = "./app/data/config.json"     # Output formatted file

    main(source_file, style_file, output_file)
