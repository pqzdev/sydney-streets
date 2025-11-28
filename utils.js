/**
 * Shared utility functions for street name processing
 */

/**
 * Extract base name from full street name
 * Example: "George Street" -> "George"
 */
function getBaseName(fullName) {
    if (!fullName) return '';
    // Order matters: more specific patterns first (e.g., "Road North" before "Road")
    const suffixes = [
        'Road South', 'Road North', 'Road West', 'Road East',
        'Road S', 'Road N', 'Road W', 'Road E',
        'Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit', 'Crescent', 'Court',
        'Parade', 'Boulevard', 'Terrace', 'Close', 'Grove', 'Walk', 'Path', 'Mews', 'Square',
        'Esplanade', 'Promenade', 'Highway', 'Motorway', 'Freeway', 'Parkway', 'Plaza', 'Loop', 'Row',
        'Gateway', 'Tunnel', 'Corso'
    ];
    let base = fullName;
    suffixes.forEach(suffix => {
        base = base.replace(new RegExp(`\\s+${suffix}$`, 'i'), '');
    });
    return base.trim();
}

/**
 * Extract street type from full street name
 * Example: "George Street" -> "Street"
 */
function getStreetType(fullName) {
    if (!fullName) return '';
    // Order matters: more specific patterns first (e.g., "Road North" before "Road")
    const suffixes = [
        'Road South', 'Road North', 'Road West', 'Road East',
        'Road S', 'Road N', 'Road W', 'Road E',
        'Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit', 'Crescent', 'Court',
        'Parade', 'Boulevard', 'Terrace', 'Close', 'Grove', 'Walk', 'Path', 'Mews', 'Square',
        'Esplanade', 'Promenade', 'Highway', 'Motorway', 'Freeway', 'Parkway', 'Plaza', 'Loop', 'Row',
        'Gateway', 'Tunnel', 'Corso'
    ];
    for (const suffix of suffixes) {
        const regex = new RegExp(`\\s+(${suffix})$`, 'i');
        const match = fullName.match(regex);
        if (match) {
            return match[1]; // Return with original capitalization from the match
        }
    }
    return ''; // No type found
}
