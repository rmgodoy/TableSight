
'use client';

export type Point = { x: number; y: number };

function getIntersection(ray_p1: Point, ray_p2: Point, seg_p1: Point, seg_p2: Point): Point | null {
    const r_px = ray_p1.x;
    const r_py = ray_p1.y;
    const r_dx = ray_p2.x - ray_p1.x;
    const r_dy = ray_p2.y - ray_p1.y;

    const s_px = seg_p1.x;
    const s_py = seg_p1.y;
    const s_dx = seg_p2.x - seg_p1.x;
    const s_dy = seg_p2.y - seg_p1.y;

    const r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy);
    const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);
    if (r_mag === 0 || s_mag === 0) {
        return null;
    }

    if (Math.abs(r_dx / r_mag - s_dx / s_mag) < 1e-9 && Math.abs(r_dy / r_mag - s_dy / s_mag) < 1e-9) {
        // Parallel or collinear
        return null;
    }

    const T2_numerator = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px));
    const T2_denominator = (s_dx * r_dy - s_dy * r_dx);

    if (Math.abs(T2_denominator) < 1e-9) {
        // Parallel lines
        return null;
    }
    
    const T2 = T2_numerator / T2_denominator;

    let T1: number;
    if (Math.abs(r_dx) > 1e-9) {
        T1 = (s_px + s_dx * T2 - r_px) / r_dx;
    } else if(Math.abs(r_dy) > 1e-9) {
        T1 = (s_py + s_dy * T2 - r_py) / r_dy;
    } else {
        return null; // Should not happen if r_mag > 0
    }
    
    const epsilon = 1e-6;
    if (T1 >= -epsilon && (T2 >= -epsilon && T2 <= 1 + epsilon)) {
        return {
            x: r_px + r_dx * T1,
            y: r_py + r_dy * T1
        };
    }

    return null;
}

export function calculateVisibilityPolygon(
  lightSource: Point,
  segments: { a: Point; b: Point, width: number }[],
  mapBounds: { width: number; height: number },
  radius: number
): Point[] {
    let allPoints: Point[] = [];
    for (const segment of segments) {
        allPoints.push(segment.a, segment.b);
    }
    
    // Add map boundaries to the list of points to cast rays to
    const boundaryPoints = [
        { x: 0, y: 0 },
        { x: mapBounds.width, y: 0 },
        { x: mapBounds.width, y: mapBounds.height },
        { x: 0, y: mapBounds.height },
    ];
    
    for (const p of boundaryPoints) {
        if (Math.hypot(p.x - lightSource.x, p.y - lightSource.y) < radius) {
             allPoints.push(p);
        }
    }
    
    const uniquePoints = allPoints.reduce((acc, p) => {
        if (!acc.find(ap => ap.x === p.x && ap.y === p.y)) {
            acc.push(p);
        }
        return acc;
    }, [] as Point[]);

    const uniqueAngles: number[] = [];
    for (const point of uniquePoints) {
        const angle = Math.atan2(point.y - lightSource.y, point.x - lightSource.x);
        uniqueAngles.push(angle, angle - 1e-5, angle + 1e-5);
    }
    
    // Cast rays in a circle to ensure the radius is always respected
    for (let i = 0; i < 360; i += 2) {
        const angle = i * Math.PI / 180;
        uniqueAngles.push(angle);
    }

    const intersects: Point[] = [];
    for (const angle of uniqueAngles) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const rayEnd = { x: lightSource.x + dx * (radius + 1), y: lightSource.y + dy * (radius + 1) };

        let closestIntersection: Point | null = null;
        let minDistance = Infinity;

        const allSegments = [
            ...segments,
            // Add map boundaries as segments
            { a: boundaryPoints[0], b: boundaryPoints[1], width: 1 },
            { a: boundaryPoints[1], b: boundaryPoints[2], width: 1 },
            { a: boundaryPoints[2], b: boundaryPoints[3], width: 1 },
            { a: boundaryPoints[3], b: boundaryPoints[0], width: 1 },
        ];


        for (const segment of allSegments) {
            const intersection = getIntersection(lightSource, rayEnd, segment.a, segment.b);
            if (intersection) {
                const distance = Math.hypot(intersection.x - lightSource.x, intersection.y - lightSource.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIntersection = intersection;
                }
            }
        }
        
        let intersectPoint: Point;
        
        if (closestIntersection && minDistance <= radius) {
            intersectPoint = closestIntersection;
        } else {
             intersectPoint = {
                x: lightSource.x + dx * radius,
                y: lightSource.y + dy * radius,
            };
        }

        intersects.push(intersectPoint);
    }

    intersects.sort((a, b) => {
        const angleA = Math.atan2(a.y - lightSource.y, a.x - lightSource.x);
        const angleB = Math.atan2(b.y - lightSource.y, b.x - lightSource.x);
        return angleA - angleB;
    });

    return intersects;
}
