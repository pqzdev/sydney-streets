#!/usr/bin/env python3
"""
Normalize street name capitalization in GeoJSON files.
Fixes case variations like "KIng" vs "King" or "BottleBrush" vs "Bottlebrush"
"""

import json
import sys

def normalize_name(name):
    """
    Normalize street name capitalization.
    Conservative approach: Only fix obvious case errors while preserving
    intentional capitalization patterns.

    Common issues to fix:
    - Wrong case in middle of word (BottleBrush -> Bottlebrush, KIngfisher -> Kingfisher)
    - Inconsistent sentence case (campsie street -> Campsie Street)
    """
    if not name:
        return name

    # Don't modify names that are mostly lowercase or have special chars in weird places
    # These are likely paths/trails with intentional formatting
    if name.startswith('(') or name.startswith("'") or name.startswith('"'):
        return name

    # Special cases - these should always be uppercase
    uppercase_words = {'ANZAC', 'CBD', 'RTA', 'NSW', 'LGA', 'BHD'}

    # Words that should not be capitalized (articles, conjunctions, prepositions)
    lowercase_words = {'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from'}

    def smart_capitalize(word, is_first=False):
        """
        Capitalize a word intelligently.
        - Preserve uppercase abbreviations (ANZAC)
        - Fix Mc/Mac names (McDonald, MacArthur)
        - Keep lowercase articles/conjunctions (unless first word)
        """
        # Handle empty strings
        if not word:
            return word

        # Check if it's a known uppercase word
        word_upper = word.upper()
        if word_upper in uppercase_words:
            return word_upper

        # Check if it should stay lowercase (not first word)
        word_lower = word.lower()
        if not is_first and word_lower in lowercase_words:
            return word_lower

        # Special case: Mc/Mac names
        if word_lower.startswith('mc') and len(word) > 2:
            # McDonald, McArthur
            return 'Mc' + word[2].upper() + word[3:].lower()

        if word_lower.startswith('mac') and len(word) > 3:
            # Check if it's really Mac* or just Ma* (like "Machine")
            # MacArthur, but not "Machine" -> "MAChine"
            # Heuristic: Mac names are usually MacXxxxxx (cap after Mac)
            if word[3].isupper():
                return 'Mac' + word[3].upper() + word[4:].lower()

        # Default: standard title case (first letter upper, rest lower)
        return word[0].upper() + word[1:].lower()

    # Split into words and process
    words = name.split()
    result = []

    for i, word in enumerate(words):
        is_first = (i == 0)

        # Handle hyphenated words
        if '-' in word:
            parts = word.split('-')
            fixed_parts = [smart_capitalize(p, is_first=(is_first and j==0)) for j, p in enumerate(parts)]
            result.append('-'.join(fixed_parts))
        # Handle parentheses
        elif '(' in word:
            # Split on '(' and process separately
            parts = word.split('(')
            fixed_parts = [smart_capitalize(parts[0], is_first)]
            if len(parts) > 1:
                fixed_parts.append('(' + smart_capitalize(parts[1], False))
            result.append(''.join(fixed_parts))
        else:
            result.append(smart_capitalize(word, is_first))

    return ' '.join(result)

def normalize_geojson(input_file, output_file):
    """Normalize street names in a GeoJSON file"""

    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    features = data['features']
    print(f"Processing {len(features)} features...")

    # Track changes
    changes = {}
    unchanged = 0

    for feature in features:
        name = feature['properties'].get('name', '')
        if name:
            normalized = normalize_name(name)
            if normalized != name:
                if name not in changes:
                    changes[name] = normalized
                feature['properties']['name'] = normalized
            else:
                unchanged += 1

    print(f"\n=== Changes ===")
    print(f"Changed: {len(changes)} unique names")
    print(f"Unchanged: {unchanged} features")

    if changes:
        print(f"\nSample changes (first 30):")
        for old, new in sorted(changes.items())[:30]:
            print(f"  '{old}' -> '{new}'")

    print(f"\nSaving to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f)

    print("Done!")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python normalize_street_names.py <input_geojson> <output_geojson>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    normalize_geojson(input_file, output_file)
