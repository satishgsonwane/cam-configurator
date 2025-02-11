import json
import argparse
import sys
import re
from pathlib import Path

def preprocess_json_content(content):
    """Clean up JSON content before parsing."""
    # Fix the camera_config array start
    content = re.sub(r'"camera_config":\[\{(\s*)\{', r'"camera_config":[{', content)
    
    # Fix double closing braces with optional whitespace and comma
    content = re.sub(r'\}(\s*)\}(\s*),', r'}},', content)
    content = re.sub(r'\}(\s*)\}(\s*)]', r'}}]', content)
    
    # Remove extra braces around each camera entry
    content = re.sub(r'\{(\s*)\{(\s*)"camera_id"', r'{"camera_id"', content)
    
    return content

def clean_json_structure(json_obj):
    """Clean up the parsed JSON structure."""
    if isinstance(json_obj, dict):
        # Clean up each key-value pair
        return {k: clean_json_structure(v) for k, v in json_obj.items()}
    elif isinstance(json_obj, list):
        if len(json_obj) > 0 and all(isinstance(item, dict) for item in json_obj):
            # For arrays of objects (like camera_config)
            cleaned_list = []
            for item in json_obj:
                # If item is a dict with a single key whose value is also a dict
                if len(item) == 1 and isinstance(next(iter(item.values())), dict):
                    # Extract the inner object
                    cleaned_list.append(next(iter(item.values())))
                else:
                    cleaned_list.append(item)
            return cleaned_list
        return [clean_json_structure(item) for item in json_obj]
    return json_obj

def analyze_indentation_pattern(json_str):
    """Analyze the indentation pattern of a JSON string."""
    patterns = {
        'base_indent': 5,      # Default base indentation
        'camera_indent': 8,    # Default camera object indentation
        'property_indent': 5,  # Default property indentation
        'nested_indent': 10    # Default nested object indentation
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
                next_indent = len(next_line) - len(next_line.lstrip())
                if next_indent > 0:  # Only update if we found a valid indent
                    patterns['nested_indent'] = next_indent
    
    return patterns

def format_array(arr, indent_level, style_patterns, indent_size=2):
    """Format array with consistent spacing."""
    if not arr:
        return "[]"
    
    # For arrays of numbers, format inline with spaces
    if all(isinstance(x, (int, float)) for x in arr):
        items = [str(x) for x in arr]
        return f"[ {', '.join(items)} ]"
    
    # For arrays of arrays (like scan_positions), format with newlines
    indent = " " * indent_level
    items = []
    for item in arr:
        if isinstance(item, list):
            items.append(f"{indent}{json.dumps(item)}")
        else:
            items.append(f"{indent}{format_dict(item, indent_level, style_patterns)}")
    
    return "[\n" + ",\n".join(items) + f"\n{' ' * (indent_level-indent_size)}]"

def format_dict(obj, level, style_patterns, is_nested=False):
    """Format a dictionary according to style patterns."""
    if not obj:
        return "{}"
        
    indent = " " * level
    parts = []
    
    # Special handling for calibration_data
    if "calibration_data" in obj:
        calibration_str = indent + '"calibration_data":{'
        calibration_data = obj["calibration_data"]
        cal_items = []
        for k, v in sorted(calibration_data.items()):
            cal_items.append(f'{" " * style_patterns["nested_indent"]}"{k}":{json.dumps(v)}')
        calibration_str += "\n" + ",\n".join(cal_items) + "\n" + indent + "}"
    
    # Handle all other keys
    for key in sorted(obj.keys()):
        if key == "calibration_data":
            continue
        
        value = obj[key]
        if key == "camera_config":
            # Special handling for camera_config array
            camera_parts = []
            for camera in value:
                camera_str = format_dict(camera, style_patterns['camera_indent'], style_patterns)
                camera_parts.append(camera_str)
            parts.append(f'{indent}"{key}":[{{\n' + "},\n\n".join(camera_parts) + "}]")
        else:
            if isinstance(value, dict):
                formatted_value = format_dict(value, level, style_patterns, True)
            elif isinstance(value, list):
                formatted_value = format_array(value, level, style_patterns)
            else:
                formatted_value = json.dumps(value)
            parts.append(f'{indent}"{key}":{formatted_value}')
    
    # Insert calibration_data in the right position if it exists
    if "calibration_data" in obj:
        # Find the position before reset_position if it exists
        reset_pos = next((i for i, p in enumerate(parts) if "reset_position" in p), len(parts))
        parts.insert(reset_pos, calibration_str)
        
    return "{\n" + ",\n".join(parts) + "\n" + " " * (level - style_patterns['base_indent']) + "}"

def format_json_with_style(source_json, style_patterns):
    """Format JSON content according to the analyzed style patterns."""
    return format_dict(source_json, style_patterns['base_indent'], style_patterns)

def transfer_json_style(source_file, style_file, output_file):
    """Transfer the style from one JSON file to another."""
    try:
        # Read and preprocess the source file
        with open(source_file, 'r') as f:
            content = f.read()
            
        # Clean up the content before parsing
        cleaned_content = preprocess_json_content(content)
        
        try:
            source_json = json.loads(cleaned_content)
        except json.JSONDecodeError as e:
            print(f"Error parsing cleaned JSON: {str(e)}")
            print("Original content was cleaned but still contains errors.")
            sys.exit(1)
            
        # Clean up the JSON structure after parsing
        source_json = clean_json_structure(source_json)
        
    except FileNotFoundError:
        print(f"Error: Source file '{source_file}' not found")
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