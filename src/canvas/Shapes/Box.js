/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { OFFSET } from '~constants/enum';

import { getIconColor } from '~utils/color';

import { getEdgeCoordinate, moveShapes } from '../utils/Canvas';

class Box extends Shape {
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
			if (newDrawMove.shape.isUnion) {
				const currIndex = labelPoint.findIndex((item) => item.index === newDrawMove.shape.index);
				const { x1, y1, x3, y3 } = newLabelPoint[currIndex];

				newLabelPoint[currIndex] = {
					...newLabelPoint[currIndex],
					coordinate: newDrawMove.shape.coordinate,
					x1: Math.min(x1, newDrawMove.shape.x1),
					y1: Math.min(y1, newDrawMove.shape.y1),
					x3: Math.max(x3, newDrawMove.shape.x3),
					y3: Math.max(y3, newDrawMove.shape.y3)
				};
			} else {
				newLabelPoint.push(newDrawMove.shape);
			}
		}

		if (newShape.index !== -1 && newShape.holding) {
			if (newShape.holding.x1 > newShape.holding.x3) {
				const previousX1 = newShape.holding.x1;
				newShape.holding.x1 = newShape.holding.x3;
				newShape.holding.x3 = previousX1;
			}

			if (newShape.holding.y1 > newShape.holding.y3) {
				const previousY1 = newShape.holding.y1;
				newShape.holding.y1 = newShape.holding.y3;
				newShape.holding.y3 = previousY1;
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

		return { newLabelPoint, newMouse, delType };
	}

	resizeEvent({ point, ratio }) {
		const newCoords = point.coordinate.map((coord) => coord.map((item) => ({ x: Math.round(item.x * ratio), y: Math.round(item.y * ratio) })));
		return { ...point, ...getEdgeCoordinate(newCoords.flat()), coordinate: newCoords };
	}

	drawNewShape({ stage, offsetX, offsetY, shapeOpacity, shapeFill, shapeText, drawMove, shape, isUnion, focusLabel, shapeInfo }) {
		const newDrawMove = drawMove;
		const newShape = shape;
		const newLabelPoint = [];

		newDrawMove.coord = [...newDrawMove.coord, { x: offsetX, y: offsetY }];

		const x1 = newDrawMove.coord[0].x < offsetX ? newDrawMove.coord[0].x : offsetX;
		const y1 = newDrawMove.coord[0].y < offsetY ? newDrawMove.coord[0].y : offsetY;
		const x3 = newDrawMove.coord[0].x > offsetX ? newDrawMove.coord[0].x : offsetX;
		const y3 = newDrawMove.coord[0].y > offsetY ? newDrawMove.coord[0].y : offsetY;

		if (x3 - x1 > OFFSET * 2 && y3 - y1 > OFFSET * 2) {
			const coordinate = [
				{ x: x1, y: y1 },
				{ x: x1, y: y3 },
				{ x: x3, y: y3 },
				{ x: x3, y: y1 }
			];

			if (!isUnion && focusLabel && newDrawMove.shape && focusLabel.index === newDrawMove.shape.index) {
				return { newDrawMove, newLabelPoint, newShape };
			}

			newDrawMove.shape = { ...shapeInfo, x1, y1, x3, y3, isUnion, coordinate: isUnion ? [...focusLabel.coordinate, coordinate] : [coordinate] };
		}

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

	draw({ stage, shape, shapeFill, shapeText, index = -1, coorIdx = -1, edgeIdx = -1, depth = -1, isNew = false, useDraw = false, ctxScreen = null }) {
		const ctx = ctxScreen !== null ? ctxScreen : useDraw ? stage.ctxDraw : stage.ctx;

		shape.coordinate.forEach((coords, coordsIdx) => {
			ctx.strokeStyle = getIconColor(shape.color);
			ctx.fillStyle = shape.color;
			ctx.lineWidth = 2;

			ctx.beginPath();
			ctx.moveTo(coords[0].x, coords[0].y);
			coords.slice(1).forEach((item) => {
				ctx.lineTo(item.x, item.y);
			});
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

export default Box;
