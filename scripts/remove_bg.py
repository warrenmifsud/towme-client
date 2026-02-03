import sys
from rembg import remove
from PIL import Image
import os

def process_image(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        return

    print(f"Processing {input_path}...")
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)
        print(f"Saved transparent image to {output_path}")
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input_path> <output_path>")
        sys.exit(1)
    
    process_image(sys.argv[1], sys.argv[2])
