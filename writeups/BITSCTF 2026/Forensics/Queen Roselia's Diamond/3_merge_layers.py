import json
import numpy as np
import tifffile
from PIL import Image
import os

def is_gray(pixel_value):
    """
    Determines if a pixel is 'gray'.
    Assumes Black is near 0 and White is near 255.
    Gray is defined as anything in between (e.g., 50-200).
    """
    return 50 < pixel_value < 200

def merge_with_mask():
    # 1. Load Grid Metadata
    if not os.path.exists('grid_metadata.json'):
        print("[!] Error: 'grid_metadata.json' not found. Run Program 1 first.")
        return

    with open('grid_metadata.json', 'r') as f:
        grid_data = json.load(f)
    print(f"[*] Loaded metadata for {len(grid_data)} grid cells.")

    # 2. Load TIFF Image
    try:
        tiff_data = tifffile.imread('challenge_stego.tif')
    except Exception as e:
        print(f"[!] Error loading image: {e}")
        return

    # 3. Extract Layers
    # Reshape to (H, W, Channels)
    layers = tiff_data.view(np.uint8).reshape(tiff_data.shape[0], tiff_data.shape[1], 8)
    
    L4 = layers[:, :, 4]
    L6 = layers[:, :, 6]
    L7 = layers[:, :, 7]

    # Create the base image (Copy of Layer 7)
    final_image = L7.copy()

    edit_count = 0

    # 4. Iterate through Grid Cells
    for cell in grid_data:
        x = cell['x']
        y = cell['y']
        w = cell['w']
        h = cell['h']
        
        # Calculate Center Point of the cell
        center_x = x + (w // 2)
        center_y = y + (h // 2)

        # Check Layer 6 value at center point
        mask_val = L6[center_y, center_x]

        # Logic: If Layer 6 center is Gray -> Use Layer 4 data
        if is_gray(mask_val):
            # Replace the entire cell region in final_image with L4 data
            final_image[y : y+h, x : x+w] = L4[y : y+h, x : x+w]
            edit_count += 1
        
        # Else: Do nothing (keep Layer 7 data)

    # 5. Save Result
    output_filename = 'merged_L7_base_L6_mask.png'
    Image.fromarray(final_image).save(output_filename)
    
    print(f"[*] Processing complete.")
    print(f"[-] Total cells modified: {edit_count}")
    print(f"[-] Result saved as: {output_filename}")

if __name__ == "__main__":
    merge_with_mask()