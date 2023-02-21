import { uniqWith, isEqual } from 'lodash-es';

import { rgbaToObject } from '../utils/color';

const BYTES = 4; // (시작점 * 4 -> ctx.getImageData() = rgba(0, 0, 0, 0) 4개 한묶음)

// NOTE canvas pixel 기준으로 x y 좌표 가져오는 식 : y * width + x

/**
 * @description 임계값 계산
 * @param data 이미지 데이터
 * @param coordColor 칠할 색상
 * @param index 현재 data의 위치 index
 * @param threshold 임계치
 */
const findBoundary = (data, coordColor, index, threshold) => {
	const red = data[index] - coordColor[0];
	const green = data[index + 1] - coordColor[1];
	const blue = data[index + 2] - coordColor[2];

	// 색상 영역 안에 있으면 true
	return !!(red > threshold || red < -threshold || green > threshold || green < -threshold || blue > threshold || blue < -threshold);
};

/**
 * @description 색 추출 영역 구하기
 * @param param
 */
const findSegmentArea = (param) => {
	const { data, width, height, px, py, threshold } = param;

	let checkY = false;
	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;

	const result = new Uint8Array(width * height);
	const visited = new Uint8Array(width * height);

	const currIndex = (py * width + px) * BYTES; // 현재 마우스 위치 배열 index
	const coordColor = [data[currIndex], data[currIndex + 1], data[currIndex + 2], data[currIndex + 3]]; // 현재 좌표 rgba 색상
	const stack = [{ y: py, left: px - 1, right: px + 1, dir: 1 }]; // 스캔 데이터

	while (stack.length > 0) {
		checkY = false;

		const element = stack.shift();
		for (let x = element.left + 1; x < element.right; x++) {
			const pointY = element.y * width + x;

			// 0은 안들린거 1은 들린거
			if (visited[pointY] === 0) {
				checkY = true;

				result[pointY] = 1;
				visited[pointY] = 1;

				// 임계값 비교
				const isColorPicker = findBoundary(data, coordColor, pointY * BYTES, threshold);
				if (!isColorPicker) {
					let left = x - 1;
					while (left > -1) {
						// 현재 좌표의 왼쪽으로 이동 하면서 임계값 +-10 찾기
						const pointLeft = element.y * width + left;

						if (visited[pointLeft] === 1) break; // 들렸던 위치면 break

						result[pointLeft] = 1;
						visited[pointLeft] = 1;
						left--;

						// 임계값 비교
						const isColorPicker = findBoundary(data, coordColor, pointLeft * BYTES, threshold);
						if (isColorPicker) break;
					}

					let right = x + 1;
					while (right < width) {
						// 현재 좌표의 오른쪽으로 이동 하면서 임계값 +-10 찾기
						const pointRight = element.y * width + right;

						if (visited[pointRight] === 1) break; // 들렸던 위치면 break

						result[pointRight] = 1;
						visited[pointRight] = 1;
						right++;

						// 임계값 비교
						const isColorPicker = findBoundary(data, coordColor, pointRight * BYTES, threshold);
						if (isColorPicker) break;
					}

					// X의 최대값 최소값 찾기
					if (left < minX) minX = left + 1;
					if (right > maxX) maxX = right - 1;

					const leftY = element.y - element.dir;
					if (leftY >= 0 && leftY < height) {
						// 방향 y - dir 으로 틀기
						if (left < element.left) stack.push({ y: leftY, left, right: element.left, dir: -element.dir });
						if (element.right < right) stack.push({ y: leftY, left: element.right, right, dir: -element.dir });
					}

					const rightY = element.y + element.dir;
					if (rightY >= 0 && rightY < height) {
						// 방향 y + dir 으로 틀기
						if (left < right) stack.push({ y: rightY, left, right, dir: element.dir });
					}
				}

				// Y의 최대값 최소값 찾기
				if (checkY) {
					if (element.y < minY) minY = element.y;
					if (element.y > maxY) maxY = element.y;
				}
			}
		}
	}

	return {
		data: result,
		width,
		height,
		bounds: { minX, minY, maxX, maxY },
		edge: { x1: minX, y1: minY, x3: maxX, y3: maxY }
	};
};

/**
 * @description 색 추출 영역 좌표 구하기 전 정리
 * @param mask
 */
const prepareMask = (mask) => {
	const { data, width, bounds } = mask;

	const rightWidth = bounds.maxX - bounds.minX + 3;
	const rightHeight = bounds.maxY - bounds.minY + 3;

	const result = new Uint8Array(rightWidth * rightHeight);

	for (let y = bounds.minY; y < bounds.maxY + 1; y++) {
		for (let x = bounds.minX; x < bounds.maxX + 1; x++) {
			if (data[y * width + x] === 1) result[(y - bounds.minY + 1) * rightWidth + (x - bounds.minX + 1)] = 1;
		}
	}

	return {
		data: result,
		width: rightWidth,
		height: rightHeight,
		offset: { x: bounds.minX - 1, y: bounds.minY - 1 }
	};
};

/**
 * @description 색 추출 영역 실제 좌표 구하기
 * @param param 좌표
 */
const traceContours = (param) => {
	const { data, width, height, offset } = prepareMask(param);
	const mask = new Uint8Array(data);
	const result = [];

	let label = 0; // isInner index

	for (let y = 1; y < height - 1; y++)
		for (let x = 1; x < width - 1; x++) {
			const index = y * width + x;
			if (data[index] === 1) {
				// index - width: outer tracing (y - 1) / index + width: isInner tracing (y + 1)
				for (let i = -width; i < width * 2; i += width * 2) {
					if (data[index + i] === 0 && mask[index + i] === 0) {
						const isInner = i === width; // 안에 좌표인지 아닌지
						label++;

						const coords = [];
						let dir = isInner ? 2 : 6; // start direction
						const first = { x, y };
						let previous = { x, y };
						let current = { x, y };
						let second = null;
						let next = null;

						while (true) {
							const currIndex = current.y * width + current.x;
							mask[currIndex] = label; // 시작점 index

							// 시계방향으로 순회 (BFS)
							const directions = [
								[1, 0],
								[1, 1],
								[0, 1],
								[-1, 1],
								[-1, 0],
								[-1, -1],
								[0, -1],
								[1, -1]
							];

							for (let j = 0; j < directions.length; j++) {
								dir = (dir + 1) % directions.length;

								const nextDir = directions[dir];
								next = { x: current.x + nextDir[0], y: current.y + nextDir[1] };

								const nextIndex = next.y * width + next.x;
								if (data[nextIndex] === 1) {
									mask[nextIndex] = label;
									break;
								}

								mask[nextIndex] = -1;
								next = null;
							}

							if (next === null) break; // 이웃 없음

							current = next;
							if (second) {
								// 순회하다 본인 만나면 break
								if (previous.x === first.x && previous.y === first.y && current.x === second.x && current.y === second.y) break;
							} else {
								second = next;
							}

							coords.push({ x: previous.x + offset.x, y: previous.y + offset.y });
							previous = current;
							dir = (dir + 4) % directions.length; // 다음 방향
						}

						if (next != null) {
							coords.push({ x: first.x + offset.x, y: first.y + offset.y });
							result.push({ isInner, points: coords });
						}
					}
				}
			}
		}

	return result;
};

/**
 * @description 색 추출 영역 좌표 간소화
 * @param contours 좌표
 */
const simplifyContours = (contours) => {
	const result = [];

	for (let j = 0; j < contours.length; j++) {
		const { points, isInner } = contours[j];

		if (points.length < 30) {
			// contour isn't simplified
			const resPoints = [];
			for (let k = 0; k < points.length; k++) {
				resPoints.push({ x: points[k].x, y: points[k].y });
			}

			result.push({ isInner, points: resPoints });
		}

		const lst = [0, points.length - 1]; // always add first and last points
		const stack = [{ first: 0, last: points.length - 1 }]; // first processed edge

		while (stack.length > 0) {
			const { first, last } = stack.shift();

			// eslint-disable-next-line no-continue
			if (last <= first + 1) continue;

			let maxDistance = -1; // max distance from point to current edge
			let maxIndex = first; // index of maximally distant point

			for (let i = first + 1; i < last; i++) {
				// calc the distance from current point to edge
				const pi = points[i];
				const pf = points[first];
				const pl = points[last];

				let dx = pi.x - pf.x;
				let dy = pi.y - pf.y;
				const r1 = Math.sqrt(dx ** 2 + dy ** 2);

				dx = pi.x - pl.x;
				dy = pi.y - pl.y;
				const r2 = Math.sqrt(dx ** 2 + dy ** 2);

				dx = pf.x - pl.x;
				dy = pf.y - pl.y;
				const r12 = Math.sqrt(dx ** 2 + dy ** 2);

				let dist;

				if (r1 >= Math.sqrt(r2 * r2 + r12 * r12)) dist = r2;
				else if (r2 >= Math.sqrt(r1 * r1 + r12 * r12)) dist = r1;
				else dist = Math.abs((dy * pi.x - dx * pi.y + pf.x * pl.y - pl.x * pf.y) / r12);

				if (dist > maxDistance) {
					maxIndex = i; // save the index of maximally distant point
					maxDistance = dist;
				}
			}

			if (maxDistance > 0) {
				lst.push(maxIndex); // add index to the simplified folder
				stack.push({ first, last: maxIndex }); // add the left part for processing
				stack.push({ first: maxIndex, last }); // add the right part for processing
			}
		}

		const resPoints = [];
		lst.sort((a, b) => a - b);
		for (let k = 0; k < lst.length; k++) {
			resPoints.push({ x: points[lst[k]].x, y: points[lst[k]].y }); // add result points to the correct order
		}

		result.push({ isInner, points: resPoints });
	}

	return result;
};

/**
 * @description 색 추출 영역 구하기
 * @param mask
 */
const getBorderIndices = (mask) => {
	const { width, height, data } = mask;

	const border = []; // only border points
	// walk through inner values except points on the boundary of the image
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const index = y * width + x;

			if (data[index] !== 0) {
				const nextIndex = index + width; // y + 1
				const prevIndex = index - width; // y - 1

				if (
					data[index + 1] === 0 ||
					data[index - 1] === 0 ||
					data[nextIndex] === 0 ||
					data[nextIndex + 1] === 0 ||
					data[nextIndex - 1] === 0 ||
					data[prevIndex] === 0 ||
					data[prevIndex + 1] === 0 ||
					data[prevIndex - 1] === 0
				) {
					border.push(index);
				}
			}
		}
	}

	for (let y = 0; y < height; y++) {
		if (data[y * width] === 1) border.push(y * width);
	}

	for (let x = 0; x < width; x++) {
		if (data[x] === 1) border.push(x);
	}

	const indexY = width - 1;
	for (let y = 0; y < height; y++) {
		if (data[y * width + indexY] === 1) border.push(y * width + indexY);
	}

	const indexX = (height - 1) * width;
	for (let x = 0; x < width; x++) {
		if (data[indexX + x] === 1) border.push(indexX + x);
	}

	return border;
};

/**
 * @description 색 추출 영역 병합
 */
const concatImageData = (prev, next) => {
	const concatData = new Uint8ClampedArray(prev.data.length);

	for (let i = 0; i < prev.data.length; i++) {
		concatData[i] = prev.data[i];
		if (concatData[i] === 0) concatData[i] = next.data[i];
	}

	return new ImageData(concatData, prev.width, prev.height);
};

/**
 * @description 색 추출 영역 색상 주입
 * @param step1
 * @param color 주입 할 색상
 * @param width 이미지 넓이
 * @param imgData 영역 추출 한 이미지 데이터
 */
const getColorpickArea = (step1, color, width, imageData) => {
	const cacheInd = getBorderIndices(step1);
	const { r, g, b, a } = rgbaToObject(color);

	const imgData = imageData;

	for (let j = 0; j < cacheInd.length; j++) {
		const index = cacheInd[j];
		const x = index % width; // calc x by index
		const y = (index - x) / width; // calc y by index
		const curr = (y * width + x) * 4;

		if (x !== 0 && y !== 0) {
			imgData.data[curr - 4] = r;
			imgData.data[curr - 3] = g;
			imgData.data[curr - 2] = b;
			imgData.data[curr - 1] = 255;
		}

		imgData.data[curr] = r;
		imgData.data[curr + 1] = g;
		imgData.data[curr + 2] = b;
		imgData.data[curr + 3] = 255;
	}

	const fillImgData = new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height);
	for (let y = step1.bounds.minY; y <= step1.bounds.maxY; y++) {
		for (let x = step1.bounds.minX; x <= step1.bounds.maxX; x++) {
			if (step1.data[y * step1.width + x] !== 0) {
				const curr = (y * step1.width + x) * 4;
				if (fillImgData.data[curr] === 0) {
					fillImgData.data[curr] = r;
					fillImgData.data[curr + 1] = g;
					fillImgData.data[curr + 2] = b;
					fillImgData.data[curr + 3] = 255 * Number(a);
				}
			}
		}
	}

	return { imgData, fillImgData };
};

/**
 * @description 색 추출 영역 좌표로 변환
 * @param param self 데이터
 */
const transferToCoords = (param, scale = 1) => {
	const data = param;
	const coordinate = [];

	const step3 = traceContours(data.step1);
	const coords = simplifyContours(step3);

	let innerCoords = [];
	let outerCoords = [];

	if (coords.length === 0) return;

	for (let i = 0; i < coords.length; i++) {
		if (!coords[i].isInner) {
			// 무조건 outer 돌고 inner 돌기 때문에 값 저장
			if (outerCoords.length > 0) {
				coordinate.push({ innerCoords, outerCoords });
				innerCoords = [];
				outerCoords = [];
			}

			const ps = coords[i].points;
			outerCoords.push({ x: Math.round(ps[0].x / scale), y: Math.round(ps[0].y / scale) });
			outerCoords.push({ x: Math.round(ps[0].x / scale) + 1, y: Math.round(ps[0].y / scale) + 1 });

			for (let j = 1; j < ps.length; j++) {
				outerCoords.push({ x: Math.round(ps[j].x / scale), y: Math.round(ps[j].y / scale) });
				outerCoords.push({ x: Math.round(ps[j].x / scale) + 1, y: Math.round(ps[j].y / scale) + 1 });
			}
		}

		if (coords[i].isInner) {
			const points = [];
			const ps = coords[i].points;

			const findSame = innerCoords.map((item) =>
				item.some((coords) => coords.x === Math.round(ps[0].x / scale) && coords.y === Math.round(ps[0].y / scale))
			);
			const isSame = findSame.some((item) => item === true);

			if (!isSame) {
				for (let j = 1; j < ps.length; j++) {
					points.push({ x: Math.round(ps[j].x / scale), y: Math.round(ps[j].y / scale) });
				}

				innerCoords.push(points);
			}
		}
	}

	coordinate.push({ innerCoords: uniqWith(innerCoords, isEqual), outerCoords });

	return coordinate;
};

/**
 * @description 색 추출 영역 중복되는 영역 합치기
 * @param prev
 * @param next
 */
const mergeImageData = (prev, next, isErase = false) => {
	const result = new Uint8Array(prev.width * prev.height);

	if (prev.bounds && next.bounds) {
		// copy all prev mask
		const prevLength = prev.bounds.maxX - prev.bounds.minX;
		const prevY = prev.bounds.minY * prev.width + prev.bounds.minX; // index = y * width + x
		const prevMaxY = prev.bounds.maxY * prev.width + prev.bounds.minX;
		let prevIdx = prev.bounds.minY * prev.width + prev.bounds.minX;

		for (let y = prevY; y < prevMaxY; y += prev.width) {
			// walk through rows (Y)
			result.set(prev.data.subarray(y, y + prevLength), prevIdx); // copy row
			prevIdx += prev.width;
		}

		// copy new mask
		const nextLength = next.bounds.maxX - next.bounds.minX;
		const nextY = next.bounds.minY * next.width + next.bounds.minX;
		const nextMaxY = next.bounds.maxY * next.width + next.bounds.minX;
		let nextIdx = next.bounds.minY * prev.width + next.bounds.minX;

		for (let y = nextY; y < nextMaxY; y += next.width) {
			// walk through rows (Y)
			for (let x = 0; x < nextLength; x++) {
				// walk through cols (X)
				if (next.data[y + x] === 1) result[nextIdx + x] = isErase ? 0 : 1;
			}

			nextIdx += prev.width;
		}

		return {
			data: result,
			width: prev.width,
			height: prev.height,
			bounds: {
				minX: Math.min(prev.bounds.minX, next.bounds.minX),
				minY: Math.min(prev.bounds.minY, next.bounds.minY),
				maxX: Math.max(prev.bounds.maxX, next.bounds.maxX),
				maxY: Math.max(prev.bounds.maxY, next.bounds.maxY)
			}
		};
	}
};

const findColorBoundary = (data, index) => {
	const red = data[index];
	const green = data[index + 1];
	const blue = data[index + 2];
	return red !== 0 || green !== 0 || blue !== 0;
};

const findColorArea = (param) => {
	const { data, width, height } = param;

	const result = new Uint8Array(width * height);
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const pointY = y * width + x;

			const isColorPicker = findColorBoundary(data, pointY * 4);
			if (isColorPicker) result[pointY] = 1;
		}
	}

	return { data: result, width, height };
};

const getColorArea = ({ ctxDraw, getData, bounds, color, imgWidth, imgHeight, width, height }) => {
	const data = findColorArea({ data: getData.data, width: imgWidth, height: imgHeight });

	ctxDraw.clearRect(0, 0, imgWidth, imgHeight);
	const imageData = ctxDraw.createImageData(width, height);

	const { imgData, fillImgData } = getColorpickArea({ ...data, bounds }, color, width, imageData);
	return { imgData, fillImgData, data };
};

export {
	findBoundary,
	findSegmentArea,
	prepareMask,
	simplifyContours,
	getBorderIndices,
	concatImageData,
	transferToCoords,
	mergeImageData,
	getColorpickArea,
	findColorBoundary,
	findColorArea,
	getColorArea
};
