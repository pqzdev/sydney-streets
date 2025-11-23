#!/usr/bin/env python3
"""
Generate a summary table showing timing and street counts
"""

import json

# Load the comparison results
with open('data/method_comparison.json', 'r') as f:
    data = json.load(f)

streets = data['streets']
results = data['results']

# Get all methods
methods = list(next(iter(results.values())).keys())

print("=" * 120)
print("STREET COUNT SUMMARY")
print("=" * 120)
print()

# Header
print(f"{'Street Name':<25}", end='')
for method in methods:
    # Shorten method names for display
    short_name = method.replace(' + Flood Fill', '').replace('Point-to-Point', 'P2P').replace('Endpoint ', 'EP ')
    print(f"{short_name:>15}", end='')
print()
print("-" * 120)

# Data rows
for street in streets:
    if street in results:
        print(f"{street:<25}", end='')
        for method in methods:
            count = results[street][method]['count']
            print(f"{count:>15}", end='')
        print()

print()
print("=" * 120)
print("TIMING SUMMARY (seconds)")
print("=" * 120)
print()

# Calculate total time for each method
total_times = {method: 0 for method in methods}
for street in streets:
    if street in results:
        for method in methods:
            total_times[method] += results[street][method]['time']

# Show total times
print(f"{'Method':<40}{'Total Time':>15}{'Avg per Street':>15}")
print("-" * 70)
for method in methods:
    total = total_times[method]
    avg = total / len(streets)
    print(f"{method:<40}{total:>14.3f}s{avg:>14.3f}s")

print()
print("=" * 120)
print("METHOD COMPARISON")
print("=" * 120)
print()

# Compare methods - find where they disagree
print("Streets where methods disagree:")
print()

disagreements = []
for street in streets:
    if street in results:
        counts = [results[street][method]['count'] for method in methods]
        if len(set(counts)) > 1:  # More than one unique count
            disagreements.append({
                'street': street,
                'counts': {method: results[street][method]['count'] for method in methods}
            })

if disagreements:
    for d in disagreements:
        print(f"{d['street']}:")
        for method, count in d['counts'].items():
            short_name = method.replace(' + Flood Fill', '').replace('Point-to-Point', 'P2P').replace('Endpoint ', 'EP ')
            print(f"  {short_name:<30}: {count} streets")
        print()
else:
    print("All methods agree on all streets!")

# Save summary as JSON
summary = {
    'street_counts': {street: {method: results[street][method]['count'] for method in methods}
                      for street in streets if street in results},
    'timing': {method: {'total': total_times[method], 'average': total_times[method] / len(streets)}
               for method in methods},
    'disagreements': disagreements
}

with open('data/summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print("Summary saved to data/summary.json")
