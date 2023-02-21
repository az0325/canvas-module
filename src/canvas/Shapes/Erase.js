/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { getIconColor, changeOpacity } from '../utils/color';
import { findColorArea, mergeImageData, getColorpickArea, transferToCoords } from '../utils/Magicwand';
import { getEdgeCoordinate } from '../utils/Canvas';

class Erase extends Shape {
	async mouseUp({ stage, drawMove, shape, labelPoint, shapeOpacity, shapeFill, shapeText }) {
		let newDrawMove = drawMove;
		let newLabelPoint = labelPoint;
		const newShape = shape;

		if (newDrawMove.shape) {
			const focusData = newLabelPoint.find((item) => item.isFocus);
			const focusIndex = focusData.coordinate.length > 1 ? newShape.coorIdx : 0;
			const focusCoordinate = focusData.coordinate[focusIndex];

			const { fillImgData, imgData, step1 } = await this.concat({
				stage,
				shape: newDrawMove.shape,
				shapeOpacity,
				shapeFill,
				shapeText,
				...{ ...newShape, coorIdx: focusIndex },
				labelPoint: newLabelPoint,
				concatData: { ...focusData, coordinate: focusCoordinate }
			});

			const [step1Coords] = transferToCoords({ fillImgData, imgData, step1 }, focusData.scale);
			const { x1, y1, x3, y3 } = getEdgeCoordinate(step1Coords.outerCoords);

			focusData.coordinate[focusIndex] = { fillImgData, imgData, step1: { ...step1, bounds: { minX: x1, minY: y1, maxX: x3, maxY: y3 } } };
			newDrawMove.shape = { ...focusData, x1, y1, x3, y3 };

			if (!newDrawMove.shape || newDrawMove.shape.index === -1) return { newDrawMove, newLabelPoint, newShape };

			const eraseArea = newDrawMove.shape.coordinate[focusIndex].step1.data.filter((item) => item !== 0);
			const currIndex = newLabelPoint.findIndex((point) => point.index === newDrawMove.shape.index);

			if (!eraseArea.length) {
				const coordinate = [...newDrawMove.shape.coordinate.slice(0, focusIndex), ...newDrawMove.shape.coordinate.slice(focusIndex + 1)];

				const edgeCoords = [];
				coordinate.forEach((coord) => {
					edgeCoords.push({ x: coord.step1.bounds.minX, y: coord.step1.bounds.minY }, { x: coord.step1.bounds.maxX, y: coord.step1.bounds.maxY });
				});

				if (coordinate.length === 0) {
					newLabelPoint = [...newLabelPoint.slice(0, currIndex), ...newLabelPoint.slice(currIndex + 1)];
				} else {
					newLabelPoint[currIndex] = { ...newLabelPoint[currIndex], coordinate, ...getEdgeCoordinate(edgeCoords) };
				}

				newShape.holding = null;
				newDrawMove = { shape: null, coord: [] };
			} else {
				newLabelPoint[currIndex] = { ...focusData, x1, y1, x3, y3 };
			}
		}

		return { newDrawMove, newLabelPoint, newShape };
	}

	drawNewShape({ stage, offsetX, offsetY, labelPoint, shapeOpacity, shapeFill, shapeText, drawMove, shape }) {
		const newDrawMove = drawMove;
		const newShape = shape;

		const focusData = labelPoint.find((item) => item.isFocus);
		if (!focusData || focusData.type !== 'self' || focusData.label_state !== 0) return { newDrawMove, newShape };
		if (focusData.coordinate.length > 1 && newShape.coorIdx === -1) return { newDrawMove, newShape };

		const param = {
			index: focusData ? focusData.index + 1 : 0,
			type: 'erase',
			value: '',
			label_state: 0,
			color: changeOpacity(focusData.color, 0.1),
			isFocus: false,
			user_name: '',
			user_no: -1
		};

		newDrawMove.coord = [...newDrawMove.coord, { x: offsetX, y: offsetY }];

		if (focusData && newDrawMove.shape && focusData.index === newDrawMove.shape.index) {
			return { newDrawMove, newShape };
		}

		newDrawMove.shape = { ...param, ...getEdgeCoordinate(newDrawMove.coord), coordinate: newDrawMove.coord };

		if (newDrawMove.shape) {
			stage.clearCanvasDraw();
			this.draw({ stage, shape: newDrawMove.shape, shapeOpacity, shapeFill, shapeText, useDraw: true });
		}

		return { newDrawMove, newShape };
	}

	/**
	 * @description 자유곡선 / 다각형 그리기
	 * @param ctx getContext
	 * @param shape 도형 정보
	 * @param isFill 도형 채울지 말지
	 */
	draw({ stage, shape, shapeFill, useDraw = false, ctxScreen = null }) {
		const ctx = ctxScreen !== null ? ctxScreen : useDraw ? stage.ctxDraw : stage.ctx;

		ctx.save();
		ctx.globalCompositeOperation = 'xor';
		ctx.strokeStyle = getIconColor(shape.color);
		ctx.fillStyle = shape.color.replace('0.5', '0.1');
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.moveTo(shape.coordinate[0].x, shape.coordinate[0].y);
		shape.coordinate.slice(1).forEach((item) => {
			ctx.lineTo(item.x, item.y);
		});
		ctx.closePath();
		ctx.stroke();
		if (shapeFill) ctx.fill();
		ctx.restore();
	}

	async concat({ stage, shape, shapeOpacity, shapeFill, shapeText, concatData }) {
		const { ctxDraw, width, height } = stage;

		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const ctxScreen = offScreen.getContext('2d');

		this.draw({ stage, ctxScreen, shape, shapeOpacity, shapeFill, shapeText });

		return new Promise((resolve, reject) => {
			const getData = ctxScreen.getImageData(0, 0, stage.width, stage.height);

			const data = findColorArea({ data: getData.data, width: stage.width, height: stage.height });
			const { x1: minX, y1: minY, x3: maxX, y3: maxY } = getEdgeCoordinate(shape.coordinate);

			ctxDraw.clearRect(0, 0, width, height);
			const imageData = ctxDraw.createImageData(width, height);

			const newData = mergeImageData(concatData.coordinate.step1, { ...data, bounds: { minX, minY, maxX, maxY } }, true);
			const { imgData, fillImgData } = getColorpickArea(newData, concatData.color, width, imageData);

			resolve({ imgData, fillImgData, step1: newData });
		});
	}
}

export default Erase;
