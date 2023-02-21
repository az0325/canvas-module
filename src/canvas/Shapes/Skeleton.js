/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { differenceWith, isEqual } from 'lodash-es';

import { OFFSET } from '~constants/enum';

import { getIconColor } from '~utils/color';
import { getEdgeCoordinate, moveShapes } from '../utils/Canvas';

class Skeleton extends Shape {
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
		if (index === -1 && edgeIdx === -1) return { newLabelPoint, newMouse, delType };

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
			const coords = currData.coordinate[coorIdx];
			const currEdge = coords[edgeIdx];
			const children = coords.filter((item) => item.startX === currEdge.endX && item.startY === currEdge.endY);

			if (children.length > 1) {
				const removeList = [currEdge];
				const queue = [currEdge];

				while (queue.length) {
					const { endX, endY } = queue.shift();

					for (let i = 0; i < coords.length; i++) {
						if (coords[i].startX === endX && coords[i].startY === endY) {
							removeList.push(coords[i]);
							queue.push(coords[i]);
						}
					}
				}

				const removeData = differenceWith(coords, removeList, isEqual);

				if (removeData.length === 1) {
					const coordinate = [...newLabelPoint[currIndex].coordinate.slice(0, coorIdx), ...newLabelPoint[currIndex].coordinate.slice(coorIdx + 1)];
					newLabelPoint[currIndex] = { ...newLabelPoint[currIndex], coordinate, ...getEdgeCoordinate(coordinate.flat()) };
					newMouse = { ...newMouse, isSingle: false, isDouble: false };
					delType = 'delShape';
					return { newLabelPoint, newMouse, delType };
				}

				currData.coordinate[coorIdx] = removeData;
			} else {
				// 라인 지우기 (자식 없을 경우)
				if (coords.length < 3) return { newLabelPoint, newMouse, delType }; // 점 2개 이상만 지우기

				const nextIndex = coords.findIndex((item) => item.startX === currEdge.endX && item.startY === currEdge.endY);

				if (nextIndex !== -1) {
					coords[edgeIdx].endX = coords[nextIndex].endX;
					coords[edgeIdx].endY = coords[nextIndex].endY;
					coords[nextIndex].startX = currEdge.startX;
					coords[nextIndex].startY = currEdge.startY;
				}

				currData.coordinate[coorIdx] = [...coords.slice(0, edgeIdx), ...coords.slice(edgeIdx + 1)];
			}

			newLabelPoint[currIndex] = { ...newLabelPoint[currIndex], ...getEdgeCoordinate(currData.coordinate), coordinate: currData.coordinate };
			delType = 'delPoint';
		}

		return { newLabelPoint, newMouse, delType };
	}

	resizeEvent({ point, ratio }) {
		const newCoords = point.coordinate.map((coord) =>
			coord.map((item) => ({
				startX: item.startX === -1 ? -1 : Math.round(item.startX * ratio),
				startY: item.startY === -1 ? -1 : Math.round(item.startY * ratio),
				endX: Math.round(item.endX * ratio),
				endY: Math.round(item.endY * ratio)
			}))
		);

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

			newCoords[coorIdx] = newCoords[coorIdx].map((item) => {
				const startX = item.startX + xOffset;
				const startY = item.startY + yOffset;
				const endX = item.endX + xOffset;
				const endY = item.endY + yOffset;

				return !item?.startX && !item?.startY ? { endX, endY } : { startX, startY, endX, endY };
			});
		}

		if (pos === 'edge') {
			if (mouse.isSingle) return holding;

			newCoords[coorIdx].forEach((item, index) => {
				if (item.endX + xOffset < 0 || item.endX + yOffset < 0) return;

				const addX = item.endX + xOffset;
				const addY = item.endY + yOffset;

				if (index === edgeIdx) {
					if (edgeIdx === 0) {
						// 첫번째
						newCoords[coorIdx][edgeIdx + 1] = { ...newCoords[coorIdx][index + 1], startX: addX, startY: addY };
					}

					newCoords[coorIdx][edgeIdx] = { ...newCoords[coorIdx][edgeIdx], endX: addX, endY: addY };
					newCoords[coorIdx].forEach((el, idx) => {
						if (item?.startX && item?.startY && item.endX === el.startX && item.endY === el.startY) {
							newCoords[coorIdx][idx] = { ...newCoords[coorIdx][idx], startX: addX, startY: addY };
						}
					});
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

		if (newDrawDot.coord.length === 0) {
			// 최소 생성
			newDrawDot.coord.push({ startX: -1, startY: -1, endX: offsetX, endY: offsetY });
		} else {
			const lastCoord = newDrawDot.coord[newDrawDot.coord.length - 1];
			if (lastCoord?.endX && lastCoord?.endY) {
				const findeCoord = newDrawDot.coord.find(
					(item) => item.endX - OFFSET < offsetX && offsetX < item.endX + OFFSET && item.endY - OFFSET < offsetY && offsetY < item.endY + OFFSET
				);

				newDrawDot.coord.push(
					findeCoord
						? { startX: findeCoord.endX, startY: findeCoord.endY }
						: {
								startX: lastCoord.endX,
								startY: lastCoord.endY,
								endX: offsetX,
								endY: offsetY
						  }
				);
			} else {
				newDrawDot.coord.push({ ...lastCoord, endX: offsetX, endY: offsetY });
			}
		}

		const coordinate = newDrawDot.coord.filter((item) => item.endX && item.endY);

		if (!isUnion && focusLabel && newDrawDot.shape && focusLabel.index === newDrawDot.shape.index) {
			return { newDrawDot, newLabelPoint, newShape };
		}

		newDrawDot.shape = {
			...shapeInfo,
			...getEdgeCoordinate(coordinate),
			isUnion,
			coordinate: isUnion ? [...focusLabel.coordinate, coordinate] : [coordinate]
		};

		stage.clearCanvasDraw();
		this.draw({
			stage,
			shape: { ...newDrawDot.shape, coordinate: [newDrawDot.shape.coordinate[newDrawDot.shape.coordinate.length - 1]] },
			...newShape,
			index: newDrawDot.shape.index,
			shapeOpacity,
			shapeFill,
			shapeText,
			isNew: true,
			useDraw: true
		});

		return { newDrawDot, newLabelPoint, newShape };
	}

	/**
	 * @description 라인 그리기
	 * @param ctx getContext
	 * @param shape 도형 정보
	 * @param index 현재 잡고있는 도형 index
	 */
	draw({ stage, shape, shapeText, index = -1, coorIdx = -1, edgeIdx = -1, depth = -1, isNew = false, useDraw = false, ctxScreen = null }) {
		const ctx = ctxScreen !== null ? ctxScreen : useDraw ? stage.ctxDraw : stage.ctx;

		shape.coordinate.forEach((coords, coordsIdx) => {
			ctx.strokeStyle = getIconColor(shape.color);
			ctx.fillStyle = shape.color;
			ctx.lineWidth = 2;

			if (coords.length > 1) {
				ctx.beginPath();
				coords.slice(1).forEach((item) => {
					ctx.moveTo(item.startX, item.startY);
					ctx.lineTo(item.endX, item.endY);
				});
				ctx.closePath();
				ctx.stroke();
			}

			if (!isNew && index === shape.index && coords.length > 1 && depth === -1) {
				super.drawSquareEdge(ctx, shape);
			}

			coords.forEach((item, idx) => {
				if (index === shape.index && coorIdx === coordsIdx && depth === 0) super.drawSquareEdge(ctx, getEdgeCoordinate(coords));
				if ((index === shape.index && coorIdx === coordsIdx && depth === 1) || isNew) {
					super.drawEdge(ctx, item.endX, item.endY, coords.length > 2 && edgeIdx === idx);
				}
			});

			if (shapeText && !isNew) super.drawValue(ctx, shape);
		});
	}
}

export default Skeleton;
