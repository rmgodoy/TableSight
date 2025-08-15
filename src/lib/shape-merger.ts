
'use client';

import type { Path } from '@/components/gm-view';
import type { Point } from '@/lib/raycasting';
import polygonClipping, { type Polygon as ClippingPolygon, type MultiPolygon as ClippingMultiPolygon } from 'polygon-clipping';


// The polygon-clipping library expects points in [x, y] tuple format.
type PolygonPoint = [number, number];
// It operates on arrays of polygons, where a polygon is an array of rings,
// and a ring is an array of points. For our simple, non-holed shapes,
// this will be an array with a single polygon, which has a single ring.
type PathClippingPolygon = ClippingPolygon;

function pathToClippingPolygon(path: Path): PathClippingPolygon {
    // A path is an array of polygons (the first is the exterior, the rest are holes)
    return path.points.map(ring => ring.map(p => [p.x, p.y] as PolygonPoint));
}

/**
 * Merges multiple paths into a single path representing their outer perimeter.
 * @param paths An array of Path objects to merge.
 * @returns An array of new Path objects that is the union of the input paths, or null if merging fails.
 */
export async function mergeShapes(paths: Path[]): Promise<Omit<Path, 'id'>[] | null> {
    if (paths.length === 0) {
        return null;
    }
    if (paths.length === 1) {
        return [{
            points: paths[0].points,
            color: paths[0].color,
            width: paths[0].width,
            blocksLight: paths[0].blocksLight,
            isPortal: false,
        }];
    }

    try {
        // Convert our Path objects into the format the library expects.
        // We need to flatten the structure since the library's union function takes individual polygons.
        const allPolygons: ClippingMultiPolygon = paths.map(pathToClippingPolygon);

        // Use the spread operator to pass all polygons to the union function.
        // The type assertion is needed because the library's types expect at least one polygon.
        const mergedMultiPolygon = polygonClipping.union(...allPolygons as [ClippingPolygon, ...ClippingPolygon[]]);

        if (mergedMultiPolygon.length === 0) {
            console.error("Polygon clipping returned an empty result.");
            return [];
        }
        
        // Find a representative path to source style properties from.
        const representativePath = paths[0];

        const resultingPaths = mergedMultiPolygon.map(polygonWithHoles => {
            // polygonWithHoles is an array of rings [outer, hole1, hole2, ...]
            const mergedPoints: Point[][] = polygonWithHoles.map(ring =>
                ring.map(p => ({ x: p[0], y: p[1] }))
            );
            return {
                points: mergedPoints,
                color: representativePath.color,
                width: representativePath.width,
                blocksLight: paths.some(p => p.blocksLight), // If any part blocks light, the whole thing should.
                isPortal: false,
            };
        });

        return resultingPaths;

    } catch (error) {
        console.error("Failed to merge shapes:", error);
        return null;
    }
}

/**
 * Checks if two paths intersect.
 * @param pathA The first path.
 * @param pathB The second path.
 * @returns True if the paths intersect, false otherwise.
 */
export function pathIntersects(pathA: Path, pathB: Path): boolean {
    try {
        const polyA = pathToClippingPolygon(pathA);
        const polyB = pathToClippingPolygon(pathB);
        // The intersection function expects arrays of polygons.
        const intersection = polygonClipping.intersection([polyA], [polyB]);
        // If the intersection has any area, the length will be > 0.
        return intersection.length > 0;
    } catch (error) {
        console.error("Failed to check path intersection:", error);
        // Be conservative: if the check fails, assume they don't intersect to avoid incorrect merges.
        return false;
    }
}
