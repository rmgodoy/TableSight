
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

    if (r_dx / r_mag === s_dx / s_mag && r_dy / r_mag === s_dy / s_mag) {
        return null;
    }

    const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / (s_dx * r_dy - s_dy * r_dx);
    const T1 = (s_px + s_dx * T2 - r_px) / r_dx;

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
    allPoints.push(...boundaryPoints);
    
    allPoints = allPoints.filter(p => {
        const distance = Math.hypot(p.x - lightSource.x, p.y - lightSource.y);
        return distance <= radius;
    });
    
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

    // New: Smartly add rays for long segments instead of filler rays
    const RAYS_PER_PIXEL = 0.1; // Cast one ray for every X pixels of arc length
    for (const segment of segments) {
        const distA = Math.hypot(segment.a.x - lightSource.x, segment.a.y - lightSource.y);
        const distB = Math.hypot(segment.b.x - lightSource.x, segment.b.y - lightSource.y);

        const angleA = Math.atan2(segment.a.y - lightSource.y, segment.a.x - lightSource.x);
        const angleB = Math.atan2(segment.b.y - lightSource.y, segment.b.x - lightSource.x);

        let angleDiff = angleB - angleA;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const avgDist = (distA + distB) / 2;
        const arcLength = Math.abs(angleDiff) * avgDist;
        const numRays = Math.ceil(arcLength * RAYS_PER_PIXEL);

        if (numRays > 1) {
            for (let i = 1; i < numRays; i++) {
                const fraction = i / numRays;
                uniqueAngles.push(angleA + angleDiff * fraction);
            }
        }
    }
    
    const intersects: Point[] = [];
    for (const angle of uniqueAngles) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const rayEnd = { x: lightSource.x + dx, y: lightSource.y + dy };

        let closestIntersection: Point | null = null;
        let minDistance = Infinity;

        for (const segment of segments) {
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
        
        if (minDistance > radius) {
            intersectPoint = {
                x: lightSource.x + dx * radius,
                y: lightSource.y + dy * radius,
            };
        } else {
             intersectPoint = {
                x: lightSource.x + dx * minDistance,
                y: lightSource.y + dy * minDistance,
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
