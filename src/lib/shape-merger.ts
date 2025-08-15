
'use client';

import type { Path } from '@/components/gm-view';
import type { Point } from '@/lib/raycasting';
import polygonClipping, { type Polygon, type MultiPolygon as ClippingMultiPolygon } from 'polygon-clipping';


// The polygon-clipping library expects points in [x, y] tuple format.
type PolygonPoint = [number, number];
// It operates on arrays of polygons, where a polygon is an array of rings,
// and a ring is an array of points. For our simple, non-holed shapes,
// this will be an array with a single polygon, which has a single ring.
type ClippingPolygon = PolygonPoint[][];
type MultiPolygon = ClippingPolygon[];

function pathToClippingMultiPolygon(path: Path): MultiPolygon {
    return [[path.points.map(p => [p.x, p.y])]];
}

/**
 * Merges multiple paths into a single path representing their outer perimeter.
 * @param paths An array of Path objects to merge.
 * @returns A single Path object that is the union of the input paths, or null if merging fails.
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
        const multiPolygons: MultiPolygon[] = paths.map(pathToClippingMultiPolygon);

        // Use the spread operator to pass all polygons to the union function.
        const mergedMultiPolygon = polygonClipping.union(...multiPolygons as [Polygon, ...Polygon[]]);

        if (mergedMultiPolygon.length === 0 || mergedMultiPolygon[0].length === 0) {
            console.error("Polygon clipping returned an empty result.");
            return null;
        }
        
        // Find a representative path to source style properties from.
        const representativePath = paths[0];

        const resultingPaths = mergedMultiPolygon.map(polygon => {
            // We are interested in the outer ring of each polygon.
            const mergedPoints: Point[] = polygon[0].map(p => ({ x: p[0], y: p[1] }));
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
        const polyA = pathToClippingMultiPolygon(pathA);
        const polyB = pathToClippingMultiPolygon(pathB);
        const intersection = polygonClipping.intersection(polyA as ClippingMultiPolygon, polyB as ClippingMultiPolygon);
        // If the intersection has any area, the length will be > 0.
        return intersection.length > 0;
    } catch (error) {
        console.error("Failed to check path intersection:", error);
        // Be conservative: if the check fails, assume they don't intersect to avoid incorrect merges.
        return false;
    }
}
