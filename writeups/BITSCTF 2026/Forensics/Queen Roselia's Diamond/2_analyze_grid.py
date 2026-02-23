import numpy as np
import json
import os

def analyze_and_save_grid():
    # Configuration
    TOTAL_SIZE = 635
    GRID_COUNT = 29
    OUTPUT_FILE = 'grid_metadata.json'

    print(f"[*] Starting analysis for {TOTAL_SIZE}x{TOTAL_SIZE} image with {GRID_COUNT}x{GRID_COUNT} grid...")

    # Calculate cut points (simulating standard image scaling logic)
    cut_points = np.round(np.linspace(0, TOTAL_SIZE, GRID_COUNT + 1)).astype(int)
    
    grid_data = []
    
    # Statistics counters
    stats = {1: 0, 2: 0, 3: 0, 4: 0, 99: 0}

    # Iterate through rows and columns
    for r in range(GRID_COUNT):
        for c in range(GRID_COUNT):
            # Calculate boundaries
            y1 = int(cut_points[r])
            y2 = int(cut_points[r+1])
            x1 = int(cut_points[c])
            x2 = int(cut_points[c+1])
            
            # Calculate dimensions
            h = y2 - y1
            w = x2 - x1
            
            # Determine Group ID based on dimensions
            group_id = 99
            if w == 22 and h == 22:
                group_id = 1
            elif w == 21 and h == 22: # Width shrunk
                group_id = 2
            elif w == 22 and h == 21: # Height shrunk
                group_id = 3
            elif w == 21 and h == 21: # Both shrunk
                group_id = 4
            
            stats[group_id] += 1
            
            # Append to data list
            grid_data.append({
                "row_index": r,
                "col_index": c,
                "x": x1,
                "y": y1,
                "w": w,
                "h": h,
                "group": group_id
            })

    # Save to JSON file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(grid_data, f, indent=4)

    print(f"[*] Analysis complete. Data saved to '{OUTPUT_FILE}'.")
    print("[-] Statistics:")
    print(f"    Group 1 (22x22): {stats[1]}")
    print(f"    Group 2 (21x22): {stats[2]}")
    print(f"    Group 3 (22x21): {stats[3]}")
    print(f"    Group 4 (21x21): {stats[4]}")

if __name__ == "__main__":
    analyze_and_save_grid()