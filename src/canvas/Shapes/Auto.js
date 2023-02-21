/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { OFFSET } from '~constants/enum';

import { getIconColor } from '~utils/color';

import { getEdgeCoordinate, moveShapes } from '../utils/Canvas';

/**
 * @description 자동 추출 (api 연동)
 */
class Auto extends Shape {
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

	mouseUp({ drawMove, shape, labelPoint }) {
		const newDrawMove = drawMove;
		const newLabelPoint = labelPoint;
		const newShape = shape;

		if (newDrawMove.shape) {
			newLabelPoint.push(newDrawMove.shape);
		}

		return { newDrawMove, newLabelPoint, newShape };
	}

	mouseMove({ stage, shape, offsetX, offsetY, mouse, shapeOpacity, shapeFill, shapeText }) {
		const newShape = shape;

		newShape.holding = moveShapes({ ...stage, ...newShape, xOffset: offsetX - mouse.x, yOffset: offsetY - mouse.y, mouse });

		stage.clearCanvasDraw();
		this.draw({ stage, shape: newShape.holding, shapeOpacity, shapeFill, shapeText, ...newShape, useDraw: true });

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
			// union 전체
			if (index !== -1 && depth === -1) {
				newLabelPoint = [...newLabelPoint.slice(0, currIndex), ...newLabelPoint.slice(currIndex + 1)].map((item, index) => ({ ...item, index }));
				newMouse = { ...newMouse, isSingle: false, isDouble: false };
				delType = 'del';
			}

			// union 중 한개
			if (index !== -1 && depth === 0) {
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
		return { ...point, ...getEdgeCoordinate(newCoords), coordinate: newCoords };
	}

	async setEditData({ item }) {
		let coordinate = item.data_value;
		if (coordinate[0].x !== coordinate[coordinate.length - 1].x || coordinate[0].y !== coordinate[coordinate.length - 1].y) {
			coordinate = [...coordinate, coordinate[0]];
		}

		return coordinate;
	}

	drawNewShape({ stage, offsetX, offsetY, drawMove, shape, focusLabel, shapeInfo }) {
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

			if (focusLabel && newDrawMove.shape && focusLabel.index === newDrawMove.shape.index) {
				return { newDrawMove, newLabelPoint, newShape };
			}

			newDrawMove.shape = { ...shapeInfo, x1, y1, x3, y3, coordinate: [coordinate] };
		}

		if (newDrawMove.shape) {
			stage.clearCanvasDraw();
			this.draw({ stage, shape: newDrawMove.shape, useDraw: true });
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

			if (shape.isRecommend) {
				const { x: firstX, y: firstY } = coords[0];
				const { x: lastX, y: lastY } = coords[coords.length - 1];

				if (firstX === lastX && firstY === lastY) {
					ctx.moveTo(coords[0].x, coords[0].y);
					coords.slice(1).forEach((coord) => {
						ctx.lineTo(coord.x, coord.y);
					});
				} else {
					coords.forEach((coord, idx) => {
						if (idx === coords.length - 1) return;

						ctx.moveTo(coord.x, coord.y);
						ctx.lineTo(coords[idx + 1].x, coords[idx + 1].y);
					});
				}
			} else {
				ctx.save();
				ctx.strokeStyle = 'rgba(50, 50, 50, 1)';
				ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
				ctx.lineWidth = 2;

				ctx.beginPath();
				ctx.rect(0, 0, stage.width, stage.height);
				ctx.closePath();
				ctx.stroke();
				ctx.fill('evenodd');
				ctx.restore();

				ctx.save();
				ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
				ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
				ctx.lineWidth = 2;

				ctx.beginPath();
				ctx.setLineDash([5, 5]);
				ctx.moveTo(coords[0].x, coords[0].y);
				coords.slice(1).forEach((coord) => {
					ctx.lineTo(coord.x, coord.y);
				});
				ctx.closePath();
				ctx.stroke();
				ctx.fill();
				ctx.restore();

				return;
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

export default Auto;
