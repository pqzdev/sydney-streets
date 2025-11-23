# Why Grid-Based Flood Fill Fails for Street Counting

## The Problem

The grid-based flood fill method **massively overcounts** streets. For example:
- **Princes Highway**: Should be 1-3 streets, Grid 100m counts **186 streets**
- **Victoria Street**: Should be ~41 streets, Grid 100m counts **122 streets**

## Root Cause

The grid method has a fundamental algorithmic flaw that creates **overlapping components**.

### How the Grid Method Works

1. **Create a spatial grid** (e.g., 100m x 100m cells)
2. **Map each segment to grid cells**: For each point in a segment, add the segment ID to that grid cell
3. **Flood fill**: Starting from each unvisited cell, expand to adjacent cells and collect all segments

### The Bug

**A single road segment can touch many non-adjacent grid cells**, especially for highways.

#### Example: Princes Highway Segment 0

This one segment touches **12 different grid cells**:
```
Cell: (-34.044, 151.054) → contains segment 0
Cell: (-34.043, 151.055) → contains segment 0
Cell: (-34.042, 151.057) → contains segment 0
Cell: (-34.045, 151.054) → contains segment 0
...and 8 more cells
```

#### What Goes Wrong

When the segment is long and curves, its grid cells may **not all be adjacent**:

```
Grid cells for one segment:
[A] [B] [C]
    [D] [E] [F]
        [G] [H]
```

If cells B and E are not adjacent (because of the segment's curve), the flood fill creates **two separate components**, both containing segment 0.

This happens because:
1. Flood fill starts at cell A
2. Expands to adjacent cells: A → B → C → D
3. Cell E is not adjacent to A, B, C, or D (due to the curve)
4. Later, flood fill starts at cell E (unvisited)
5. Creates a NEW component with segment 0 again!

### Evidence from Results

Looking at Grid 100m results for Princes Highway:
- Component 1: `[0, 16, 114, 403, 404, 3]` (includes segments 0, 16)
- Component 2: `[0, 16]` (includes segments 0, 16 AGAIN)
- Component 3: `[0, 16]` (includes segments 0, 16 AGAIN)

**Same segments appear in multiple components!**

Component size distribution shows the chaos:
- 33 components with just 1 segment
- 51 components with 2 segments
- 24 components with 3 segments
- Should be: 1-3 total components

## Why Point-to-Point Works

The point-to-point distance method:
1. Checks if any point in segment A is within 30m of any point in segment B
2. Uses Union-Find to merge connected segments
3. **Ensures each segment belongs to exactly one component**

No duplicates possible - each segment is assigned to exactly one connected component.

## Conclusion

**Grid-based flood fill is fundamentally unsuitable for street counting** because:
- Long/curved segments touch non-adjacent grid cells
- Flood fill creates multiple components for the same segment
- Results in massive overcounting (186 instead of 3)

The correct approach is:
- **Point-to-Point distance checking** (30m threshold)
- **Endpoint-only distance checking** (faster, similar results)
- **Adaptive thresholds** for highways (2km) vs streets (30m)
