#!/usr/bin/env python3
import subprocess
import glob
import sys

# Get all batch files sorted
batch_files = sorted(glob.glob('*_batch_*.sql'))

print(f"Found {len(batch_files)} batch files to upload")
print(f"Starting upload at {subprocess.check_output(['date']).decode().strip()}\n")

success_count = 0
error_count = 0

for i, filename in enumerate(batch_files, 1):
    print(f"[{i}/{len(batch_files)}] Uploading {filename}...")
    try:
        result = subprocess.run(
            ['npx', 'wrangler', 'd1', 'execute', 'street-names', '--remote', f'--file={filename}'],
            capture_output=True,
            text=True,
            timeout=120
        )
        if 'rows_written' in result.stdout or 'rows_written' in result.stderr:
            # Extract rows_written number
            output = result.stdout + result.stderr
            for line in output.split('\n'):
                if 'rows_written' in line:
                    print(f"  ✓ {line.strip()}")
            success_count += 1
        elif result.returncode == 0:
            print(f"  ✓ Done")
            success_count += 1
        else:
            print(f"  ✗ ERROR: {result.stderr[:200]}")
            error_count += 1
    except subprocess.TimeoutExpired:
        print(f"  ✗ TIMEOUT after 120s")
        error_count += 1
    except Exception as e:
        print(f"  ✗ ERROR: {e}")
        error_count += 1

print(f"\n=== Upload Complete ===")
print(f"Finished at {subprocess.check_output(['date']).decode().strip()}")
print(f"Success: {success_count}")
print(f"Errors: {error_count}")
