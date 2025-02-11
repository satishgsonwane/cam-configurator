import json
import argparse
import sys
from pathlib import Path

def analyze_indentation_pattern(json_str):
    """Analyze the indentation pattern of a JSON string."""
    patterns = {
        'base_indent': None,
        'camera_indent': None,
        'property_indent': None,
        'nested_indent': None
    }
    
    lines = json_str.split('\n')
    for i, line in enumerate(lines):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)
        
        if '"camera_config":[{' in line:
            patterns['base_indent'] = indent
        elif '"camera_id":' in line:
            patterns['camera_indent'] = indent
        elif '"calibration_data":' in line:
            patterns['property_indent'] = indent
            # Get the nested indent from the next line
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                patterns['nested_indent'] = len(next_line) - len(next_line.lstrip())
    
    return patterns

def format_array(arr, indent_level, indent_size=2):
    """Format array with consistent spacing."""
    if not arr:
        return "[]"
    if all(isinstance(x, (int, float)) for x in arr):
        # For numeric arrays, format inline with spaces after commas
        items = [str(x) for x in arr]
        return f"[ {', '.join(items)} ]"
    # For nested arrays (like scan_positions), format with newlines
    indent = " " * indent_level
    items = [f"{indent}{json.dumps(item)}" for item in arr]
    return "[\n" + ",\n".join(items) + f"\n{' ' * (indent_level-indent_size)}]"

def format_json_with_style(source_json, style_patterns):
    """Format JSON content according to the analyzed style patterns."""
    def format_value(value, level, is_nested=False):
        if isinstance(value, dict):
            return format_dict(value, level, is_nested)
        elif isinstance(value, list):
            return format_array(value, level + style_patterns['base_indent'])
        else:
            return json.dumps(value)

    def format_dict(d, level=0, is_nested=False):
        if not d:
            return "{}"
            
        indent = " " * level
        parts = []
        
        # Special handling for calibration_data
        if "calibration_data" in d:
            calibration_str = indent + '"calibration_data":{'
            calibration_data = d["calibration_data"]
            cal_items = []
            for k, v in calibration_data.items():
                cal_items.append(f'{" " * style_patterns["nested_indent"]}"{k}":{json.dumps(v)}')
            calibration_str += "\n" + ",\n".join(cal_items) + "\n" + indent + "}"
            
        for key, value in d.items():
            if key == "calibration_data":
                continue
                
            if key == "camera_config":
                # Special handling for camera_config array
                camera_parts = []
                for camera in value:
                    camera_str = format_dict(camera, style_patterns['camera_indent'])
                    camera_parts.append(camera_str)
                parts.append(f'{indent}"{key}":[{{\n' + "},\n\n".join(camera_parts) + "}]")
            else:
                formatted_value = format_value(value, level, is_nested)
                parts.append(f'{indent}"{key}":{formatted_value}')
        
        if "calibration_data" in d:
            # Insert calibration_data at the appropriate position
            parts.insert(-1, calibration_str)
            
        return "{\n" + ",\n".join(parts) + "\n" + " " * (level - style_patterns['base_indent']) + "}"

    # Start the formatting
    return format_dict(source_json)

def transfer_json_style(source_file, style_file, output_file):
    """Transfer the style from one JSON file to another."""
    try:
        # Read source file
        with open(source_file, 'r') as f:
            source_json = json.load(f)
    except FileNotFoundError:
        print(f"Error: Source file '{source_file}' not found")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Source file '{source_file}' contains invalid JSON")
        sys.exit(1)
    
    try:
        # Read style file
        with open(style_file, 'r') as f:
            style_content = f.read()
    except FileNotFoundError:
        print(f"Error: Style file '{style_file}' not found")
        sys.exit(1)
    
    # Analyze the style patterns
    style_patterns = analyze_indentation_pattern(style_content)
    
    # Format the source JSON according to the style
    formatted_json = format_json_with_style(source_json, style_patterns)
    
    # Write the formatted JSON
    try:
        with open(output_file, 'w') as f:
            f.write(formatted_json)
        print(f"Successfully formatted JSON. Output written to '{output_file}'")
    except IOError as e:
        print(f"Error writing to output file: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Format a JSON file using the style of another JSON file')
    parser.add_argument('source', help='Source JSON file to be formatted')
    parser.add_argument('style', help='Reference JSON file whose style will be used')
    parser.add_argument('output', help='Output file path for the formatted JSON')
    
    args = parser.parse_args()
    
    # Convert to Path objects to handle path separators correctly
    source_path = Path(args.source)
    style_path = Path(args.style)
    output_path = Path(args.output)
    
    transfer_json_style(source_path, style_path, output_path)

if __name__ == "__main__":
    main()