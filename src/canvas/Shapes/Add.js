/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { changeOpacity } from '../utils/color';
import { mergeImageData, getColorpickArea, findSegmentArea } from '../utils/Magicwand';

// NOTE self가 자동병합되지 않았을 때, union으로 병합시켜주던 툴 (지금은 자동병합이라 사용 안함)

/**
 * @description Self Select 병합 도구 (지금은 자동병합이라 사용 안함)
 */
class Add extends Shape {
	async mouseUp({ stage, drawMove, labelPoint, shape, shapeOpacity }) {
		const newDrawMove = drawMove;
		const newLabelPoint = labelPoint;
		const newShape = shape;

		if (newDrawMove.shape) {
			const focusData = newLabelPoint.find((item) => item.isFocus);
			const focusIndex = focusData.coordinate.length > 1 ? newShape.coorIdx : 0;
			const focusCoordinate = focusData.coordinate[focusIndex];

			const { fillImgData, imgData, step1, x1, y1, x3, y3 } = await this.concat({
				stage,
				shape: newDrawMove.shape,
				shapeOpacity,
				...{ ...newShape, coorIdx: focusIndex },
				labelPoint: newLabelPoint,
				concatData: { ...focusData, coordinate: focusCoordinate }
			});

			focusData.coordinate[focusIndex] = { fillImgData, imgData, step1 };

			newDrawMove.shape = {
				...focusData,
				x1: Math.min(focusData.x1, x1),
				y1: Math.min(focusData.y1, y1),
				x3: Math.max(focusData.x3, x3),
				y3: Math.max(focusData.y3, y3)
			};

			const currIndex = labelPoint.findIndex((item) => item.index === newDrawMove.shape.index);
			newLabelPoint[currIndex] = {
				...newLabelPoint[currIndex],
				x1: Math.min(newLabelPoint[currIndex].x1, newDrawMove.shape.x1),
				y1: Math.min(newLabelPoint[currIndex].y1, newDrawMove.shape.y1),
				x3: Math.max(newLabelPoint[currIndex].x3, newDrawMove.shape.x3),
				y3: Math.max(newLabelPoint[currIndex].y3, newDrawMove.shape.y3)
			};
		}

		return { newDrawMove, newLabelPoint, newShape };
	}

	drawNewShape({ stage, offsetX, offsetY, labelPoint, shapeOpacity, shapeFill, shapeText, drawMove, shape, labelData }) {
		const newDrawMove = drawMove;
		const newShape = shape;

		const focusData = labelPoint.find((item) => item.isFocus);
		if (!focusData || focusData.type !== 'self' || focusData.label_state !== 0) return { newDrawMove, newShape };
		if (focusData.coordinate.length > 1 && newShape.coorIdx === -1) return { newDrawMove, newShape };

		const param = {
			index: focusData ? focusData.index + 1 : 0,
			type: 'add',
			value: '',
			label_state: 0,
			color: changeOpacity(focusData.color, shapeOpacity),
			isFocus: false,
			user_name: '',
			user_no: -1,
			user_id: ''
		};

		newDrawMove.coord = [...newDrawMove.coord, { x: offsetX, y: offsetY }];

		if (focusData && newDrawMove.shape && focusData.index === newDrawMove.shape.index) {
			return { newDrawMove, newShape };
		}

		const result = this.getColorArea({ stage, drawCoord: newDrawMove.coord, shapeOpacity, shapeFill, shapeText, lastData: focusData, labelData });
		newDrawMove.shape = { ...param, ...result, ...result.step1.edge };

		if (newDrawMove.shape) {
			this.drawStartPoint(stage.ctxDraw, newDrawMove.coord[0]);
			this.draw({
				stage,
				...newShape,
				shape: newDrawMove.shape,
				shapeOpacity,
				shapeFill,
				shapeText,
				useDraw: true
			});
		}

		return { newDrawMove, newShape };
	}

	draw({ stage, shape, shapeFill, shapeText, isDraw = false, index = -1, useDraw = false, ctxScreen = null }) {
		const ctx = ctxScreen !== null ? ctxScreen : useDraw ? stage.ctxDraw : stage.ctx;

		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const drawCtxScreen = offScreen.getContext('2d');

		drawCtxScreen.putImageData(shapeFill ? shape.fillImgData : shape.imgData, 0, 0);
		if (isDraw) ctx.drawImage(offScreen, 0, 0);

		if (index === shape.index || shape.isFocus) super.drawSquareEdge(ctx, shape);
		if (shapeText) super.drawValue(ctx, shape);
	}

	/**
	 * @description 도형 병합
	 * @param stage
	 * @param shape 새로 그린 도형
	 * @param shapeOpacity 도형 색상 명도
	 * @param concatData 그려져있는 도형
	 */
	concat({ stage, shape, shapeOpacity, concatData }) {
		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const ctxScreen = offScreen.getContext('2d');

		const imageData = ctxScreen.createImageData(stage.width, stage.height);

		const newData = mergeImageData(concatData.coordinate.step1, shape.step1, false);

		const { imgData, fillImgData } = getColorpickArea(newData, changeOpacity(concatData.color, shapeOpacity), stage.width, imageData);

		const { x1, y1, x3, y3 } = shape;
		return { imgData, fillImgData, step1: newData, x1, y1, x3, y3 };
	}

	/**
	 * @description 점과 점 길이 구하기
	 * @param coords 좌표
	 */
	getPointLength(coords) {
		const firstIndex = { x: coords[0].x, y: coords[0].y };
		const lastIndex = { x: coords[coords.length - 1].x, y: coords[coords.length - 1].y };

		const width = Math.abs(firstIndex.x - lastIndex.x);
		const height = Math.abs(firstIndex.y - lastIndex.y);
		const length = Math.hypot(width, height);

		return { firstIndex, length: Math.round(length), lastIndex };
	}

	/**
	 * @description 색 추출 영역 구하기
	 * @param stage
	 * @param drawCoord
	 * @param shapeFill 도형 채울지 말지
	 * @param lastData 제일 최신 도형
	 * @param labelData 도형 목록
	 */
	getColorArea({ stage, drawCoord = [], shapeFill, lastData, labelData }) {
		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const ctxScreen = offScreen.getContext('2d');

		const { file_data, shape, scale, level } = labelData;
		ctxScreen.filter = `brightness(${level + 100}%)`;
		ctxScreen.beginPath();
		ctxScreen.clearRect(0, 0, shape.width * scale, shape.height * scale);
		ctxScreen.drawImage(file_data, 0, 0, shape.width * scale, shape.height * scale);
		ctxScreen.closePath();

		const { data } = ctxScreen.getImageData(0, 0, stage.width, stage.height);

		const { length } = this.getPointLength(drawCoord);
		const threshold = length === 0 ? 10 : length > 10 ? length : 10;
		const { x: px, y: py } = drawCoord[0];
		const param = { data, width: stage.width, height: stage.height, px, py, threshold: threshold >= 255 ? 255 : threshold };

		const step1 = findSegmentArea(param);

		const imageData = stage.ctxDraw.createImageData(stage.width, stage.height);
		stage.ctxDraw.clearRect(0, 0, stage.width, stage.height);

		const { imgData, fillImgData } = getColorpickArea(step1, lastData.color, stage.width, imageData);

		stage.ctxDraw.putImageData(shapeFill ? fillImgData : imgData, 0, 0);

		this.drawThresholdArea(stage.ctxDraw, drawCoord);

		return { step1, imgData, fillImgData };
	}

	/**
	 * @description 임계치 영역 그리기
	 * @param ctx getContext
	 * @param coord 도형 정보
	 */
	drawThresholdArea(ctx, coord) {
		const { lastIndex, length } = this.getPointLength(coord);

		const radius = length >= 255 ? 255 : length;
		const percent = Math.round((radius / 255) * 100);

		const { width } = ctx.measureText(`${percent} %`);

		if (coord.length && length > 0) {
			ctx.save();
			ctx.beginPath();
			ctx.fillStyle = '#000000';
			ctx.fillRect(lastIndex.x + 15, lastIndex.y + 15, Math.round(width) + 15, 20);
			ctx.closePath();
			ctx.restore();

			ctx.save();
			ctx.beginPath();
			ctx.fillStyle = '#ffffff';
			ctx.font = `bold ${12}px douzone`;
			ctx.fillText(`${percent} %`, lastIndex.x + 18, lastIndex.y + 30);
			ctx.closePath();
			ctx.restore();
		}
	}

	/**
	 * @description 확대되는 영역 그리기
	 * @param ctx getContext
	 * @param mouse 마우스 위치
	 */
	drawStartPoint(ctx, mouse) {
		ctx.save();

		ctx.strokeStyle = '#ffffff';
		ctx.fillStyle = '#ffffff';
		ctx.lineWidth = 4;

		ctx.beginPath();
		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x - 6, mouse.y);

		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x + 6, mouse.y);

		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x, mouse.y - 6);

		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x, mouse.y + 6);

		ctx.stroke();
		ctx.closePath();

		ctx.restore();

		ctx.save();

		ctx.strokeStyle = '#000000';
		ctx.fillStyle = '#000000';
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x - 5, mouse.y);

		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x + 5, mouse.y);

		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x, mouse.y - 5);

		ctx.moveTo(mouse.x, mouse.y);
		ctx.lineTo(mouse.x, mouse.y + 5);

		ctx.stroke();
		ctx.closePath();

		ctx.restore();
	}
}

export default Add;
