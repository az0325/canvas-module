import { uniqBy, identity } from 'lodash-es';

import { OFFSET } from '~constants/enum';

const deepClone = (obj) => {
	const newObj = obj?.push ? [] : {};

	// eslint-disable-next-line no-restricted-syntax
	for (const attr in obj) {
		if (obj[attr] !== null && typeof obj[attr] === 'object') {
			if (obj?.type === 'self' || obj?.type === 'background') {
				newObj[attr] = obj[attr];
			} else {
				newObj[attr] = deepClone(obj[attr]);
			}
		} else {
			newObj[attr] = obj[attr];
		}
	}

	return newObj;
};

const isInOffset = ({ x, offsetX, y, offsetY }) => {
	return x - OFFSET < offsetX && offsetX < x + OFFSET && y - OFFSET < offsetY && offsetY < y + OFFSET;
};

/**
 * @description 현재 마우스가 어떤 네모 위에 있는지
 * @param label 도형 리스트
 * @param x x offset
 * @param y y offset
 */
const findCurrentArea = ({ label, x, y, isDouble = false, shape }) => {
	let param = { index: -1, pos: 'o', type: '', coorIdx: -1, depth: -1, edgeIdx: -1 };

	label.forEach((data) => {
		if (data.label_state !== 0) return param;

		const edgeCoords = [];
		data.coordinate.forEach((coord) => {
			edgeCoords.push(
				getEdgeCoordinate(
					data.type === 'self' || data.type === 'background'
						? [
								{ x: coord.step1.bounds.minX, y: coord.step1.bounds.minY },
								{ x: coord.step1.bounds.maxX, y: coord.step1.bounds.maxY }
						  ]
						: coord
				)
			);
		});

		// single click - 도형 전체
		edgeCoords.map((coord, idx) => {
			if (coord.x1 - OFFSET < x && x < coord.x3 + OFFSET && coord.y1 - OFFSET < y && y < coord.y3 + OFFSET) {
				param =
					shape.index !== data.index || shape.coorIdx !== idx
						? { index: data.index, pos: 'in', type: data.type, coorIdx: -1, depth: -1, edgeIdx: -1 }
						: shape;
			}
		});

		if (shape.depth === 1 && data.type !== 'self' && data.type !== 'background') {
			data.coordinate.map((coord, idx) => {
				coord.map((item, itemIdx) => {
					const coordX = data.type === 'skeleton' ? item.endX : item.x;
					const coordY = data.type === 'skeleton' ? item.endY : item.y;

					if (coordX - OFFSET < x && x < coordX + OFFSET && coordY - OFFSET < y && y < coordY + OFFSET) {
						param = { index: data.index, pos: 'edge', type: data.type, coorIdx: idx, depth: 1, edgeIdx: itemIdx };
					}
				});
			});
		}

		if (!isDouble || data.type === 'background') return param;

		edgeCoords.map((coord, idx) => {
			if (coord.x1 - OFFSET < x && x < coord.x3 + OFFSET && coord.y1 - OFFSET < y && y < coord.y3 + OFFSET) {
				param = {
					index: data.index,
					pos: 'in',
					type: data.type,
					coorIdx: idx,
					depth:
						(data.type !== 'self' && shape.depth === 0 && shape.index === data.index && shape.coorIdx === idx) ||
						(data.type !== 'self' && data.coordinate.length === 1)
							? 1
							: 0,
					edgeIdx: -1
				};
			}
		});
	});

	return param;
};

/**
 * @description 도형 모서리 구하기
 * @param coords 도형 좌표
 */
const getEdgeCoordinate = (coords) => {
	const arrayX = uniqBy(
		coords.flatMap((item) => (item?.endX ? item.endX : item.x)),
		identity
	);

	const arrayY = uniqBy(
		coords.flatMap((item) => (item?.endY ? item.endY : item.y)),
		identity
	);

	return { x1: Math.min(...arrayX), y1: Math.min(...arrayY), x3: Math.max(...arrayX), y3: Math.max(...arrayY) };
};

/**
 * @description 이미지 비율
 * @param shape 이미지 정보
 */
const getScale = ({ shape, file_url }) => {
	const { width, height } = shape;

	const parentId = file_url === '' ? 'editBox' : 'addImg';
	const parentEl = document.getElementById(parentId);

	if (!parentEl) return { width: 0, height: 0, scale: 1 };

	const _parentWidth = parentId === 'editBox' ? parentEl.offsetWidth - 30 : parentEl.offsetWidth;
	const _parentHeight = parentEl.offsetHeight;

	const scale = Math.min(_parentWidth / width, _parentHeight / height);

	return { width, height, scale: width === 1 ? 1 : scale };
};

/**
 * @description 좌표 비율에 맞게 계산
 * @param labelData 데이터
 * @param ratio 비율
 */
const resizeCoordinate = (labelData, stage) => {
	// 0: 'self' / 1: 'vector' / 2: 'box' / 3: 'pencil' / 4: 'skeleton' / 5: 'auto' / 6: 'background'
	const toolType = labelData.data_result_type === null ? 3 : labelData.data_result_type;

	if (toolType === 0 || toolType === 6) {
		const { x1, y1, x3, y3 } = getEdgeCoordinate(labelData.data_value[0].outerCoords);

		const newCoor = labelData.data_value.map(({ innerCoords, outerCoords }) => {
			if (innerCoords && outerCoords) {
				const newInner = innerCoords.map((coordinate) =>
					coordinate.map((item) => ({
						x: Math.round(item.x * stage.scale),
						y: Math.round(item.y * stage.scale)
					}))
				);

				const newOuter = outerCoords.map((outer) => ({
					x: Math.round(outer.x * stage.scale),
					y: Math.round(outer.y * stage.scale)
				}));

				return { innerCoords: newInner, outerCoords: newOuter };
			}
		});

		const edge =
			toolType === 0 || toolType === 6
				? { x1: Math.round(x1 * stage.scale), y1: Math.round(y1 * stage.scale), x3: Math.round(x3 * stage.scale), y3: Math.round(y3 * stage.scale) }
				: { x1: 0, y1: 0, x3: stage.width, y3: stage.height };

		return { ...edge, coordinate: newCoor };
	}

	const { x1, y1, x3, y3 } = getEdgeCoordinate(labelData.data_value);
	const edgeCoords = {
		x1: Math.round(x1 * stage.scale),
		y1: Math.round(y1 * stage.scale),
		x3: Math.round(x3 * stage.scale),
		y3: Math.round(y3 * stage.scale)
	};

	const newCoor = labelData.data_value.map((coor) =>
		toolType === 4
			? {
					startX: coor?.startX ? Math.round(coor.startX * stage.scale) : -1,
					startY: coor?.startY ? Math.round(coor.startY * stage.scale) : -1,
					endX: Math.round(coor.endX * stage.scale),
					endY: Math.round(coor.endY * stage.scale)
			  }
			: { x: Math.round(coor.x * stage.scale), y: Math.round(coor.y * stage.scale) }
	);

	return { ...edgeCoords, coordinate: newCoor };
};

/**
 * @description 도형 움직이기
 * @param holding 현재 그리고 있는 도형
 * @param holding 현재 잡고있는 도형
 * @param offset 도형 좌표
 * @param canvas.current
 */
const moveShapes = ({ holding, pos, coorIdx, edgeIdx, depth, xOffset, yOffset, width, height }) => {
	const newCoords = holding.coordinate;

	if (holding.type === 'self') return newCoords;

	if (coorIdx === -1) {
		const { x1, y1, x3, y3 } = getEdgeCoordinate(newCoords.flat());
		if (x1 + xOffset < 0 || y1 + yOffset < 0 || x3 + xOffset > width || y3 + yOffset > height) return holding;

		const newAllCoords = newCoords.map((coord) =>
			coord.map((item) => {
				return holding.type === 'skeleton'
					? !item?.startX && !item?.startY
						? { endX: item.endX + xOffset, endY: item.endY + yOffset }
						: { startX: item.startX + xOffset, startY: item.startY + yOffset, endX: item.endX + xOffset, endY: item.endY + yOffset }
					: { x: item.x + xOffset, y: item.y + yOffset };
			})
		);

		return { ...holding, coordinate: newAllCoords, ...getEdgeCoordinate(newAllCoords.flat()) };
	}

	if (pos === 'in') {
		if (depth === 1) return holding;

		newCoords[coorIdx] = newCoords[coorIdx].map((item) => {
			return holding.type === 'skeleton'
				? !item?.startX && !item?.startY
					? { endX: item.endX + xOffset, endY: item.endY + yOffset }
					: { startX: item.startX + xOffset, startY: item.startY + yOffset, endX: item.endX + xOffset, endY: item.endY + yOffset }
				: { x: item.x + xOffset, y: item.y + yOffset };
		});

		return { ...holding, coordinate: newCoords, ...getEdgeCoordinate(newCoords.flat()) };
	}

	if (pos === 'edge') {
		if (depth !== 1) return holding;

		if (holding.type === 'box') {
			if (edgeIdx === 0) {
				if (newCoords[coorIdx][edgeIdx].x + xOffset < 0 || newCoords[coorIdx][edgeIdx].y + yOffset < 0) return holding;

				newCoords[coorIdx][edgeIdx].x += xOffset;
				newCoords[coorIdx][edgeIdx].y += yOffset;
				newCoords[coorIdx][1].x += xOffset;
				newCoords[coorIdx][3].y += yOffset;
			}

			if (edgeIdx === 1) {
				if (newCoords[coorIdx][edgeIdx].x + xOffset < 0 || newCoords[coorIdx][edgeIdx].y + yOffset > height) return holding;
				if (newCoords[coorIdx][edgeIdx].y + yOffset < 0) return holding;

				newCoords[coorIdx][edgeIdx].x += xOffset;
				newCoords[coorIdx][edgeIdx].y += yOffset;
				newCoords[coorIdx][0].x += xOffset;
				newCoords[coorIdx][2].y += yOffset;
			}

			if (edgeIdx === 2) {
				if (newCoords[coorIdx][edgeIdx].x + xOffset > width || newCoords[coorIdx][edgeIdx].y + yOffset > height) return holding;
				if (newCoords[coorIdx][edgeIdx].y + yOffset < 0) return holding;

				newCoords[coorIdx][edgeIdx].x += xOffset;
				newCoords[coorIdx][edgeIdx].y += yOffset;
				newCoords[coorIdx][3].x += xOffset;
				newCoords[coorIdx][1].y += yOffset;
			}

			if (edgeIdx === 3) {
				if (newCoords[coorIdx][edgeIdx].x + xOffset > width || newCoords[coorIdx][edgeIdx].y + yOffset > height) return holding;

				newCoords[coorIdx][edgeIdx].x += xOffset;
				newCoords[coorIdx][edgeIdx].y += yOffset;
				newCoords[coorIdx][2].x += xOffset;
				newCoords[coorIdx][0].y += yOffset;
			}

			return { ...holding, coordinate: newCoords, ...getEdgeCoordinate(newCoords.flat()) };
		}

		if (holding.type === 'skeleton') {
			newCoords[coorIdx].forEach((item, index) => {
				if (item.endX + xOffset < 0 || item.endX + yOffset < 0) return;

				const addX = item.endX + xOffset;
				const addY = item.endY + yOffset;

				if (index === edgeIdx) {
					if (edgeIdx === 0) {
						// 첫번째
						newCoords[coorIdx][edgeIdx + 1] = { ...newCoords[coorIdx][index + 1], startX: addX, startY: addY };
					}

					newCoords[coorIdx][edgeIdx] = { ...newCoords[coorIdx][index], endX: addX, endY: addY };
					newCoords[coorIdx].forEach((el, idx) => {
						if (item?.startX && item?.startY && item.endX === el.startX && item.endY === el.startY) {
							newCoords[coorIdx][idx] = { ...newCoords[coorIdx][idx], startX: addX, startY: addY };
						}
					});
				}
			});

			return { ...holding, coordinate: newCoords, ...getEdgeCoordinate(newCoords.flat()) };
		}

		if (holding.type === 'vector' || holding.type === 'pencil') {
			const { x: firstX, y: firstY } = newCoords[coorIdx][0];
			const { x: lastX, y: lastY } = newCoords[coorIdx][newCoords[coorIdx].length - 1];

			newCoords[coorIdx].forEach((item, index) => {
				if (item.x + xOffset < 0 || item.y + yOffset < 0) return holding;

				const addX = item.x + xOffset;
				const addY = item.y + yOffset;

				if (index === edgeIdx) {
					if (firstX === lastX && firstY === lastY && (edgeIdx === 0 || edgeIdx === newCoords[coorIdx].length - 1)) {
						newCoords[coorIdx][0] = { ...newCoords[coorIdx][0], x: addX, y: addY };
						newCoords[coorIdx][newCoords[coorIdx].length - 1] = { ...newCoords[coorIdx][newCoords[coorIdx].length - 1], x: addX, y: addY };
					} else {
						newCoords[coorIdx][edgeIdx] = { ...newCoords[coorIdx][edgeIdx], x: addX, y: addY };
					}
				}
			});

			return { ...holding, coordinate: newCoords, ...getEdgeCoordinate(newCoords.flat()) };
		}

		newCoords[coorIdx] = newCoords[coorIdx].map((item, index) => {
			if (item.x + xOffset < 0 || item.y + yOffset < 0) return item;
			return index === edgeIdx ? { x: item.x + xOffset, y: item.y + yOffset } : item;
		});

		return { ...holding, coordinate: newCoords, ...getEdgeCoordinate(newCoords.flat()) };
	}
};

export { deepClone, findCurrentArea, getEdgeCoordinate, getScale, resizeCoordinate, isInOffset, moveShapes };
