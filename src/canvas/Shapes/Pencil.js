/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { getIconColor } from '~utils/color';

import { simplifyCoords } from '../utils/Simplify';
import { getEdgeCoordinate, isInOffset, moveShapes } from '../utils/Canvas';

/**
 * @description 자유곡선
 */
class Pencil extends Shape {
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

	mouseUp({ drawMove, labelPoint, shape }) {
		const newDrawMove = drawMove;
		const newLabelPoint = labelPoint;
		const newShape = shape;

		if (newDrawMove.shape) {
			newDrawMove.coord = simplifyCoords(newDrawMove.coord);
			newDrawMove.shape.coordinate[newDrawMove.shape.coordinate.length - 1] = newDrawMove.coord;

			if (newDrawMove.shape.isUnion) {
				const currIndex = labelPoint.findIndex((item) => item.index === newDrawMove.shape.index);
				const { x1, y1, x3, y3 } = newLabelPoint[currIndex];

				const getEdge = getEdgeCoordinate(newDrawMove.coord);

				newLabelPoint[currIndex] = {
					...newLabelPoint[currIndex],
					coordinate: newDrawMove.shape.coordinate,
					x1: Math.min(x1, getEdge.x1),
					y1: Math.min(y1, getEdge.y1),
					x3: Math.max(x3, getEdge.x3),
					y3: Math.max(y3, getEdge.y3)
				};
			} else {
				newLabelPoint.push(newDrawMove.shape);
			}
		}

		return { newDrawMove, newLabelPoint, newShape };
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

	async setEditData({ item }) {
		let coordinate = simplifyCoords(item.data_value);
		if (coordinate[0].x !== coordinate[coordinate.length - 1].x || coordinate[0].y !== coordinate[coordinate.length - 1].y) {
			coordinate = [...coordinate, coordinate[0]];
		}

		return coordinate;
	}

	drawNewShape({ stage, offsetX, offsetY, shapeOpacity, shapeFill, shapeText, drawMove, shape, isUnion, focusLabel, shapeInfo }) {
		const newDrawMove = drawMove;
		const newShape = shape;
		const newLabelPoint = [];

		const { x, y } = newDrawMove.coord.length ? newDrawMove.coord[0] : { x: -1, y: -1 };
		const { x: lastX, y: lastY } =
			newDrawMove.coord.length > 5 && simplifyCoords(newDrawMove.coord).length > 3 ? newDrawMove.coord[newDrawMove.coord.length - 1] : { x: -1, y: -1 };

		// 첫번째 좌표랑 마지막 좌표가 만날때 도형으로 완성
		if (x !== -1 && y !== -1 && lastX !== -1 && lastY !== -1 && isInOffset({ x, offsetX: lastX, y, offsetY: lastY })) {
			return { newDrawMove, newLabelPoint, newShape };
		}

		newDrawMove.coord = isInOffset({ x, offsetX, y, offsetY }) ? [...newDrawMove.coord, { x, y }] : [...newDrawMove.coord, { x: offsetX, y: offsetY }];

		if (!isUnion && focusLabel && newDrawMove.shape && focusLabel.index === newDrawMove.shape.index) {
			return { newDrawMove, newLabelPoint, newShape };
		}

		newDrawMove.shape = {
			...shapeInfo,
			isUnion,
			coordinate: isUnion ? [...focusLabel.coordinate, newDrawMove.coord] : [newDrawMove.coord],
			...getEdgeCoordinate(newDrawMove.coord)
		};

		if (newDrawMove.shape) {
			stage.clearCanvasDraw();
			this.draw({
				stage,
				shape: { ...newDrawMove.shape, coordinate: [newDrawMove.shape.coordinate[newDrawMove.shape.coordinate.length - 1]] },
				shapeOpacity,
				shapeFill,
				shapeText,
				...newShape,
				index: newDrawMove.shape.index,
				isNew: true,
				useDraw: true
			});
		}

		return { newDrawMove, newLabelPoint, newShape };
	}

	/**
	 * @description 자유곡선 / 다각형 그리기
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

export default Pencil;
