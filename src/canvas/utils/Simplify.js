const TOLERANCE = 0.5;

const simplifyCoords = (points) => {
	const last = points.length - 1;
	const simplified = [points[0]];

	simplifyDPStep(points, 0, last, simplified);
	simplified.push(points[last]);

	return simplified;
};

const simplifyDPStep = (points, first, last, simplified) => {
	let maxSqDist = TOLERANCE;
	let index = -1;

	for (let i = first + 1; i < last; i++) {
		const sqDist = getSqSegDist(points[i], points[first], points[last]);
		if (sqDist > maxSqDist) {
			index = i;
			maxSqDist = sqDist;
		}
	}

	if (maxSqDist > TOLERANCE) {
		if (index - first > 1) simplifyDPStep(points, first, index, simplified);
		simplified.push(points[index]);
		if (last - index > 1) simplifyDPStep(points, index, last, simplified);
	}
};

// square distance from a point to a segment
const getSqSegDist = (point, first, last) => {
	let { x, y } = first;
	let dx = last.x - x;
	let dy = last.y - y;

	if (dx !== 0 || dy !== 0) {
		const t = ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy);
		if (t > 1) {
			x = last.x;
			y = last.y;
		} else if (t > 0) {
			x += dx * t;
			y += dy * t;
		}
	}

	dx = point.x - x;
	dy = point.y - y;

	return dx * dx + dy * dy;
};

export { simplifyCoords, simplifyDPStep, getSqSegDist };
