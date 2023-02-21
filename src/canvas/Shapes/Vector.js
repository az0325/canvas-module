/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { getIconColor } from '../utils/color';

import { getEdgeCoordinate, isInOffset, moveShapes } from '../utils/Canvas';

/**
 * @description 다각형
 */
class Vector extends Shape {
	mouseDown({ stage, shapeOpacity, shapeFill, shapeText, shape, labelPoint, type }) {
		const newShape = shape;
		let newLabelPoint = labelPoint;

		if (type === 'select') {
			if (newShape.index !== -1 && !newShape.holding) {
				const newLabelData = labelPoint.map((item) => ({ ...item, isFocus: false }));
				newShape.holding = newLabelData.find((item) => item.index === newShape.index);
				this.draw({ stage, shape: newShape.holding, shapeOpacity, shapeFill, shapeText, ...newShape, useDraw: true });
				newLabelPoint = [...newLabelData.slice(0, newShape.index), ...newLabelData.slice(newShape.index + 1)];
			}
		}

		return { newLabelPoint, newShape };
	}

	mouseMove({ stage, shape, offsetX, offsetY, mouse, shapeOpacity, shapeFill, shapeText }) {
		const newShape = shape;

		newShape.holding = moveShapes({ ...stage, ...newShape, xOffset: offsetX - mouse.x, yOffset: offsetY - mouse.y, mouse });

		stage.clearCanvasDraw();
		this.draw({ stage, shape: newShape.holding, shapeOpacity, shapeFill, shapeText, ...newShape, mouse, useDraw: true });

		return newShape;
	}

	backSpaceKey({ shape, labelPoint, mouse }) {
		let newLabelPoint = labelPoint;
		let newMouse = mouse;
		let delType = '';

		const { index, pos, coorIdx, edgeIdx, depth } = shape;
		if (index === -1 && coorIdx === -1 && edgeIdx === -1) return { newLabelPoint, newMouse, delType };

		const currIndex = newLabelPoint.findIndex((item) => item.index === index);

		if (pos === 'in') {
			if (index !== -1 && depth === -1) {
				// union 전체
				newLabelPoint = [...newLabelPoint.slice(0, currIndex), ...newLabelPoint.slice(currIndex + 1)].map((item, index) => ({ ...item, index }));
				newMouse = { ...newMouse, isSingle: false, isDouble: false };
				delType = 'del';
			}

			if (index !== -1 && depth === 0) {
				// union 중 한개
				const coordinate = [...newLabelPoint[currIndex].coordinate.slice(0, coorIdx), ...newLabelPoint[currIndex].coordinate.slice(coorIdx + 1)];
				newLabelPoint[currIndex] = { ...newLabelPoint[currIndex], coordinate, ...getEdgeCoordinate(coordinate.flat()) };
				newMouse = { ...newMouse, isSingle: false, isDouble: false };
				delType = 'delShape';
			}
		}

		if (pos === 'edge') {
			const currData = newLabelPoint[currIndex];

			if (edgeIdx === currData.coordinate[coorIdx].length - 1 || edgeIdx === 0) {
				const { x: firstX, y: firstY } = currData.coordinate[coorIdx][0];
				const { x: lastX, y: lastY } = currData.coordinate[coorIdx][currData.coordinate[coorIdx].length - 1];

				if (firstX === lastX && firstY === lastY) {
					if (currData.coordinate[coorIdx].length <= 4) return { newLabelPoint, newMouse, delType: '' };

					currData.coordinate[coorIdx] = [...currData.coordinate[coorIdx].slice(1, edgeIdx)];
					currData.coordinate[coorIdx] = [...currData.coordinate[coorIdx], ...currData.coordinate[coorIdx][0]];
				}
			} else {
				if (currData.coordinate[coorIdx].length <= 3) return { newLabelPoint, newMouse, delType: '' };
				currData.coordinate[coorIdx] = [...currData.coordinate[coorIdx].slice(0, edgeIdx), ...currData.coordinate[coorIdx].slice(edgeIdx + 1)];
			}

			newLabelPoint[currIndex] = { ...newLabelPoint[currIndex], ...getEdgeCoordinate(currData.coordinate), coordinate: currData.coordinate };
			newMouse = { ...newMouse, isSingle: false, isDouble: true };
			delType = 'delPoint';
		}

		return { newLabelPoint, newMouse, delType };
	}

	resizeEvent({ point, ratio }) {
		const newCoords = point.coordinate.map((coord) => coord.map((item) => ({ x: Math.round(item.x * ratio), y: Math.round(item.y * ratio) })));
		return { ...point, ...getEdgeCoordinate(newCoords.flat()), coordinate: newCoords };
	}

	/**
	 * @description 도형 움직이기
	 * @param holding 현재 그리고 있는 도형
	 * @param shapeRef.current.holding 현재 잡고있는 도형
	 * @param offset 도형 좌표
	 * @param canvas.current
	 */
	moveShapes({ holding, pos, coorIdx, edgeIdx, xOffset, yOffset, width, height, mouse }) {
		const newCoords = holding.coordinate;

		if (pos === 'in') {
			if (mouse.isDouble) return holding;

			const { x1, y1, x3, y3 } = getEdgeCoordinate(newCoords[coorIdx]);
			if (x1 + xOffset < 0 || y1 + yOffset < 0 || x3 + xOffset > width || y3 + yOffset > height) return holding;

			newCoords[coorIdx] = newCoords[coorIdx].map((item) => ({ x: item.x + xOffset, y: item.y + yOffset }));
		}

		if (pos === 'edge') {
			if (mouse.isSingle) return holding;

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
		}

		return { ...holding, coordinate: newCoords, ...getEdgeCoordinate(newCoords.flat()) };
	}

	async setEditData({ item }) {
		let coordinate = item.data_value;
		if (coordinate[0].x !== coordinate[coordinate.length - 1].x || coordinate[0].y !== coordinate[coordinate.length - 1].y) {
			coordinate = [...coordinate, coordinate[0]];
		}

		return coordinate;
	}

	drawNewShape({ stage, offsetX, offsetY, shapeOpacity, shapeFill, shapeText, drawDot, shape, isUnion, focusLabel, shapeInfo }) {
		const newDrawDot = drawDot;
		const newShape = shape;
		const newLabelPoint = [];

		const { x, y } = newDrawDot.coord.length ? newDrawDot.coord[0] : { x: -1, y: -1 };

		if (x !== -1 && y !== -1 && offsetX !== -1 && offsetY !== -1 && isInOffset({ x, offsetX, y, offsetY })) {
			newDrawDot.coord = [...newDrawDot.coord, { x, y }];
			newDrawDot.shape = {
				...shapeInfo,
				isUnion,
				coordinate: isUnion ? [...focusLabel.coordinate, newDrawDot.coord] : [newDrawDot.coord],
				...getEdgeCoordinate(newDrawDot.coord)
			};

			return { newDrawDot, newLabelPoint, newShape, isFinish: true };
		}

		newDrawDot.coord = [...newDrawDot.coord, { x: offsetX, y: offsetY }];

		if (!isUnion && focusLabel && newDrawDot.shape && focusLabel.index === newDrawDot.shape.index) {
			return { newDrawDot, newLabelPoint, newShape };
		}

		newDrawDot.shape = {
			...shapeInfo,
			...getEdgeCoordinate(newDrawDot.coord),
			isUnion,
			coordinate: isUnion ? [...focusLabel.coordinate, newDrawDot.coord] : [newDrawDot.coord]
		};

		stage.clearCanvasDraw();
		this.draw({
			stage,
			shape: { ...newDrawDot.shape, coordinate: [newDrawDot.shape.coordinate[newDrawDot.shape.coordinate.length - 1]] },
			shapeOpacity,
			shapeFill,
			shapeText,
			...newShape,
			index: newDrawDot.shape.index,
			isNew: true,
			useDraw: true
		});

		return { newDrawDot, newLabelPoint, newShape };
	}

	/**
	 * @description 다각형 그리기
	 * @param ctx getContext
	 * @param shape 도형 정보
	 * @param isFill 도형 채울지 말지
	 * @param index 현재 잡고있는 도형 index
	 * @param edgeIdx 현재 잡고있는 도형의 모서리 index
	 */
	draw({ stage, shape, shapeFill, shapeText, index = -1, depth = -1, coorIdx = -1, edgeIdx = -1, isNew = false, useDraw = false, ctxScreen = null }) {
		const ctx = ctxScreen !== null ? ctxScreen : useDraw ? stage.ctxDraw : stage.ctx;

		shape.coordinate.forEach((coords, coordsIdx) => {
			ctx.strokeStyle = getIconColor(shape.color);
			ctx.fillStyle = shape.color;
			ctx.lineWidth = 2;

			ctx.beginPath();

			const { x: firstX, y: firstY } = coords[0];
			const { x: lastX, y: lastY } = coords[coords.length - 1];

			if (firstX === lastX && firstY === lastY) {
				ctx.moveTo(coords[0].x, coords[0].y);
				coords.slice(1).forEach((item) => {
					ctx.lineTo(item.x, item.y);
				});
			} else {
				coords.forEach((item, idx) => {
					if (idx === coords.length - 1) return;
					ctx.moveTo(item.x, item.y);
					ctx.lineTo(coords[idx + 1].x, coords[idx + 1].y);
				});
			}

			ctx.closePath();
			ctx.stroke();
			if (shapeFill) ctx.fill();

			if (!isNew && index === shape.index && coords.length > 1 && depth === -1) {
				super.drawSquareEdge(ctx, shape);
			}

			coords.forEach((item, idx) => {
				if (index === shape.index && coorIdx === coordsIdx && depth === 0) super.drawSquareEdge(ctx, getEdgeCoordinate(coords));
				if ((index === shape.index && coorIdx === coordsIdx && depth === 1) || isNew) {
					super.drawEdge(ctx, item.x, item.y, coords.length > 2 && edgeIdx === idx);
				}
			});

			if (shapeText && !isNew) super.drawValue(ctx, shape);
		});
	}
}

export default Vector;
