/**
 * Shared utility functions for street name processing
 */

/**
 * Extract base name from full street name
 * Example: "George Street" -> "George"
 */
function getBaseName(fullName) {
    if (!fullName) return '';
    const suffixes = ['Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit', 'Crescent', 'Court',
                      'Parade', 'Boulevard', 'Terrace', 'Close', 'Grove', 'Walk', 'Path', 'Mews', 'Square',
                      'Esplanade', 'Promenade', 'Highway', 'Freeway', 'Parkway', 'Plaza', 'Loop', 'Row'];
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
    const suffixes = ['Street', 'Road', 'Avenue', 'Drive', 'Lane', 'Way', 'Place', 'Circuit', 'Crescent', 'Court',
                      'Parade', 'Boulevard', 'Terrace', 'Close', 'Grove', 'Walk', 'Path', 'Mews', 'Square',
                      'Esplanade', 'Promenade', 'Highway', 'Freeway', 'Parkway', 'Plaza', 'Loop', 'Row'];
    for (const suffix of suffixes) {
        const regex = new RegExp(`\\s+(${suffix})$`, 'i');
        const match = fullName.match(regex);
        if (match) {
            return match[1]; // Return with original capitalization from the match
        }
    }
    return ''; // No type found
}
