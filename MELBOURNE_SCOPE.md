# Greater Melbourne - Geographic Scope

This document defines the geographic scope of "Greater Melbourne" used in this project.

## Official Definition

**Greater Melbourne** comprises **31 Local Government Areas** (LGAs) within the Urban Growth Boundary as defined by the Victorian State Revenue Office.

## The 31 LGAs

Greater Melbourne consists of 27 cities and 4 shires:

### Cities (27)
1. Banyule
2. Bayside
3. Boroondara
4. Brimbank
5. Casey
6. Darebin
7. Frankston
8. Glen Eira
9. Greater Dandenong
10. Hobsons Bay
11. Hume
12. Kingston
13. Knox
14. Manningham
15. Maribyrnong
16. Maroondah
17. Melbourne (City of Melbourne)
18. Melton
19. **Merri-bek** (formerly Moreland, renamed 2022)
20. Monash
21. Moonee Valley
22. Port Phillip
23. Stonnington
24. Whitehorse
25. Whittlesea
26. Wyndham
27. Yarra

### Shires (4)
28. Cardinia (partially in Greater Melbourne)
29. Mornington Peninsula
30. Nillumbik
31. Yarra Ranges (partially in Greater Melbourne)

## Geographic Extent

- **Area**: Approximately 9,992 square kilometres
- **Population**: ~5.3 million (2023-24)
- **Center**: Melbourne CBD (-37.8136, 144.9631)
- **Bounding Box**: Approximately
  - South: -38.5° (Mornington Peninsula)
  - West: 144.5° (Melton)
  - North: -37.4° (Whittlesea)
  - East: 145.8° (Yarra Ranges)

## Important Notes

### 1. Partially Included LGAs

Some LGAs are only partially within Greater Melbourne:
- **Cardinia**: Western portion within Urban Growth Boundary
- **Yarra Ranges**: Western urbanized portion included

### 2. Urban Growth Boundary

The Victorian Government's [Urban Growth Boundary](https://www.planning.vic.gov.au/guides-and-resources/strategies-and-initiatives/urban-growth-boundary) defines the extent of metropolitan Melbourne. Some LGAs extend beyond this boundary into rural areas.

### 3. Renamed LGAs

- **Merri-bek** (formerly City of Moreland) - officially renamed in August 2022

### 4. Difference from ABS Definition

The Victorian Government definition (LGA-based) differs from the Australian Bureau of Statistics (ABS) definition, which uses Statistical Areas Level 4 (SA4s). For consistency with government data sources, this project uses the Victorian State Revenue Office LGA-based definition.

## Data Sources

### OpenStreetMap Data
- **Query Extent**: Bounding box covering all 31 LGAs
- **Highway Types**: All named roads (excluding cycleways, footpaths, etc.)
- **Download Date**: 2025-01-24
- **Total Segments**: 226,284 road segments

### Processing Methodology
- **Method**: Grid 200m + Highway-Aware (same as Sydney)
- **Grid Size**: 200 meters
- **Purpose**: Count distinct street instances

## Map Bounds

For the visualization, we use conservative bounds that encompass all 31 LGAs:

```javascript
bounds: [[-38.5, 144.5], [-37.4, 145.8]]
```

## Sources and References

1. [State Revenue Office - Greater Melbourne and Urban Zones](https://www.sro.vic.gov.au/greater-melbourne-map-and-urban-zones)
2. [Local Government Areas of Victoria - Wikipedia](https://en.wikipedia.org/wiki/Local_government_areas_of_Victoria)
3. [ID Insights - Melbourne Boundaries](https://www.id.com.au/insights/articles/melbourne-in-lockdown-whats-in-a-boundary/)
4. [Victorian Government Data Directory - LGA Boundaries](https://discover.data.vic.gov.au/dataset/vicmap-admin-local-government-area-lga-polygon-aligned-to-property)
5. [Category: Local Government Areas in Melbourne - Wikipedia](https://en.wikipedia.org/wiki/Category:Local_government_areas_in_Melbourne)

## Future Work

- [ ] Add suburb-level data for more granular filtering
- [ ] Include postcode boundaries for alternate views
- [ ] Add historical LGA boundary changes
- [ ] Consider ABS Greater Melbourne definition for comparison
