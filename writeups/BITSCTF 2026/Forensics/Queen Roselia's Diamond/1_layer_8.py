import numpy as np
import tifffile
from PIL import Image
import os

def extract_all_layers():
    # 1. Create output directory
    output_dir = "layers_output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Reading challenge_stego.tif ...")

    try:
        # Read original Float64 data
        data = tifffile.imread("challenge_stego.tif")
    except FileNotFoundError:
        print("Error: challenge_stego.tif not found. Please check the file path.")
        return

    # 2. Core operation: View & Reshape
    # Convert (H, W) float64 matrix
    # into (H, W, 8) uint8 matrix
    # This splits each pixel into its 8 bytes
    byte_layers = data.view(np.uint8).reshape(data.shape[0], data.shape[1], 8)

    print(f"Data reshaped to: {byte_layers.shape}")
    print("Extracting layers (Layer 0 - Layer 7)...")

    # 3. Loop through each byte layer and save as PNG
    for i in range(8):
        # [:, :, i] means:
        # all rows (height), all columns (width), byte index i
        layer_data = byte_layers[:, :, i]

        filename = os.path.join(output_dir, f"layer_{i}.png")

        # Save as PNG
        Image.fromarray(layer_data).save(filename)
        print(f"[-] Saved: {filename}")

    print("\nDone! Check the 'layers_output' folder for results.")


if __name__ == "__main__":
    extract_all_layers()