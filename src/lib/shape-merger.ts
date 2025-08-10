
'use client';

import type { Path } from '@/components/gm-view';
import type { Point } from '@/lib/raycasting';
import polygonClipping from 'polygon-clipping';

// The polygon-clipping library expects points in [x, y] tuple format.
type PolygonPoint = [number, number];
// It operates on arrays of polygons, where a polygon is an array of rings,
// and a ring is an array of points. For our simple, non-holed shapes,
// this will be an array with a single polygon, which has a single ring.
type Polygon = PolygonPoint[][];
type MultiPolygon = Polygon[];


/**
 * Merges multiple paths into a single path representing their outer perimeter.
 * @param paths An array of Path objects to merge.
 * @returns A single Path object that is the union of the input paths, or null if merging fails.
 */
export async function mergeShapes(paths: Path[]): Promise<Omit<Path, 'id'> | null> {
    if (paths.length === 0) {
        return null;
    }
    if (paths.length === 1) {
        return {
            points: paths[0].points,
            color: paths[0].color,
            width: paths[0].width,
            blocksLight: paths[0].blocksLight,
            isPortal: false,
        };
    }

    try {
        // Convert our Path objects into the format the library expects.
        const multiPolygons: MultiPolygon[] = paths.map(path =>
            [[path.points.map(p => [p.x, p.y] as PolygonPoint)]]
        );

        // Use the spread operator to pass all polygons to the union function.
        const mergedMultiPolygon = polygonClipping.union(...multiPolygons);

        if (mergedMultiPolygon.length === 0 || mergedMultiPolygon[0].length === 0) {
            console.error("Polygon clipping returned an empty result.");
            return null;
        }
        
        // We are interested in the first (and likely only) resulting polygon's outer ring.
        const mergedPoints: Point[] = mergedMultiPolygon[0][0].map(p => ({ x: p[0], y: p[1] }));
        
        // Find a representative path to source style properties from.
        const representativePath = paths[0];

        return {
            points: mergedPoints,
            color: representativePath.color,
            width: representativePath.width,
            blocksLight: paths.some(p => p.blocksLight), // If any part blocks light, the whole thing should.
            isPortal: false,
        };

    } catch (error) {
        console.error("Failed to merge shapes:", error);
        return null;
    }
}
