#!/usr/bin/env python3
"""
Filter all city street data by official GCCSA polygon boundaries
Backs up original data and creates GCCSA-filtered versions
"""
import json
import sys
from pathlib import Path
from datetime import datetime
from boundary_utils import filter_geojson_by_boundary, get_all_cities

def filter_city_by_gccsa(city_name, backup=True):
    """Filter a city's street data by its GCCSA boundary"""

    print(f"\n{'='*80}")
    print(f"Processing {city_name.upper()}")
    print(f"{'='*80}")

    streets_file = Path(f'data/cities/{city_name}/streets.geojson')

    if not streets_file.exists():
        print(f"❌ streets.geojson not found for {city_name}")
        return False

    # Backup original file if requested
    if backup:
        backup_file = streets_file.with_suffix('.geojson.backup')
        if not backup_file.exists():
            print(f"📦 Creating backup: {backup_file.name}")
            import shutil
            shutil.copy2(streets_file, backup_file)
        else:
            print(f"📦 Backup already exists: {backup_file.name}")

    # Load original data
    print(f"📂 Loading {streets_file.name}...")
    with open(streets_file, 'r') as f:
        original_data = json.load(f)

    original_count = len(original_data.get('features', []))
    print(f"   Original features: {original_count:,}")

    # Filter by GCCSA boundary
    print(f"🔍 Filtering by GCCSA polygon boundary...")
    try:
        filtered_data = filter_geojson_by_boundary(original_data, city_name)
    except Exception as e:
        print(f"❌ Error filtering: {e}")
        return False

    filtered_count = len(filtered_data.get('features', []))
    removed = original_count - filtered_count
    pct_kept = (filtered_count / original_count * 100) if original_count > 0 else 0

    print(f"   ✅ Filtered features: {filtered_count:,}")
    print(f"   ❌ Removed (outside GCCSA): {removed:,} ({100-pct_kept:.1f}%)")
    print(f"   ✅ Kept (inside GCCSA): {pct_kept:.1f}%")

    # Save filtered data
    print(f"💾 Saving filtered data...")
    with open(streets_file, 'w') as f:
        json.dump(filtered_data, f)

    file_size_mb = streets_file.stat().st_size / 1024 / 1024
    print(f"   ✅ Saved: {streets_file.name} ({file_size_mb:.1f} MB)")

    return True

def main():
    """Filter all cities by GCCSA boundaries"""

    print("="*80)
    print("GCCSA BOUNDARY FILTERING - ALL CITIES")
    print("="*80)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("This script will:")
    print("  1. Backup original streets.geojson files")
    print("  2. Filter each city by its GCCSA polygon boundary")
    print("  3. Save filtered data (overwriting originals)")
    print("  4. Report statistics for each city")
    print()

    # Get all cities with boundary data
    cities = get_all_cities()

    if not cities:
        print("❌ No city boundaries found!")
        return 1

    print(f"Found {len(cities)} cities: {', '.join(cities)}")
    print()

    # Ask for confirmation
    response = input("Proceed with filtering? (yes/no): ").strip().lower()
    if response not in ['yes', 'y']:
        print("❌ Cancelled by user")
        return 0

    # Process each city
    results = {}
    for city in cities:
        success = filter_city_by_gccsa(city, backup=True)
        results[city] = success

    # Summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}\n")

    successful = [c for c, s in results.items() if s]
    failed = [c for c, s in results.items() if not s]

    print(f"✅ Successfully filtered: {len(successful)}/{len(cities)} cities")
    if successful:
        print(f"   {', '.join(successful)}")

    if failed:
        print(f"\n❌ Failed: {len(failed)} cities")
        print(f"   {', '.join(failed)}")

    print(f"\n{'='*80}")
    print("NEXT STEPS:")
    print(f"{'='*80}")
    print("1. Process street counts:")
    for city in successful:
        print(f"   python3 scripts/process_full_dataset.py --city {city}")
    print()
    print("2. Add instance IDs:")
    for city in successful:
        print(f"   python3 scripts/add_instance_ids.py --city {city}")
    print()
    print("3. Generate SQL batches:")
    for city in successful:
        print(f"   python3 scripts/generate_sql_batches.py {city}")
    print()

    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    return 0 if len(failed) == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
