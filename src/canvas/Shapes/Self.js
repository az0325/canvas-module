/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { getIconColor, changeOpacity } from '../utils/color';

import { getColorArea, getColorpickArea, findSegmentArea, mergeImageData } from '../utils/Magicwand';
import { getEdgeCoordinate } from '../utils/Canvas';

/**
 * @description Self Select Tool (색추출)
 */
class Self extends Shape {
	mouseDown({ shape, labelPoint, type }) {
		const newShape = shape;
		let newLabelPoint = labelPoint;

		if (type === 'select') {
			if (newShape.index !== -1 && !newShape.holding) {
				const newLabelData = labelPoint.map((item) => ({ ...item, isFocus: false }));
				newShape.holding = newLabelData.find((item) => item.index === newShape.index);
				newLabelPoint = [...newLabelData.slice(0, newShape.index), ...newLabelData.slice(newShape.index + 1)];
			}
		}

		return { newLabelPoint, newShape };
	}

	async mouseUp({ stage, drawMove, shape, labelPoint, shapeOpacity }) {
		stage.clearCanvasOrigin();

		const newDrawMove = drawMove;
		const newShape = shape;
		const newLabelPoint = labelPoint;

		if (newDrawMove.shape) {
			if (newDrawMove.shape.isUnion) {
				const currIndex = labelPoint.findIndex((item) => item.index === newDrawMove.shape.index);

				const { fillImgData, imgData, step1, x1, y1, x3, y3 } = await this.concat({
					stage,
					shape: newDrawMove.shape,
					shapeOpacity,
					...newShape,
					labelPoint: newLabelPoint,
					concatData: { ...newLabelPoint[currIndex], coordinate: newLabelPoint[currIndex].coordinate[0] }
				});

				newDrawMove.shape = { ...newDrawMove.shape, coordinate: [{ fillImgData, imgData, step1 }], x1, y1, x3, y3 };
				newLabelPoint[currIndex] = { ...newLabelPoint[currIndex], ...newDrawMove.shape, x1, y1, x3, y3, coordinate: [{ fillImgData, imgData, step1 }] };
			} else {
				newLabelPoint.push(newDrawMove.shape);
			}
		}

		return { newDrawMove, newLabelPoint, newShape };
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

				if (coordinate.length) {
					newLabelPoint[currIndex] = { ...newLabelPoint[currIndex], coordinate, ...getEdgeCoordinate(coordinate.flat()) };
					newMouse = { ...newMouse, isSingle: false, isDouble: false };
					delType = 'delShape';
				} else {
					newLabelPoint = [...newLabelPoint.slice(0, currIndex), ...newLabelPoint.slice(currIndex + 1)].map((item, index) => ({ ...item, index }));
					newMouse = { ...newMouse, isSingle: false, isDouble: false };
					delType = 'del';
				}
			}

			return { newLabelPoint, newMouse, delType };
		}
	}

	async resizeEvent({ stage, shapeFill, point, ratio, width, height, scale }) {
		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const ctxScreen = offScreen.getContext('2d');

		const edgeCoords = [];

		const newCoords = await Promise.all(
			point.coordinate.map(async (coord) => {
				ctxScreen.clearRect(0, 0, offScreen.width, offScreen.height);

				const result = shapeFill ? coord.fillImgData : coord.imgData;
				ctxScreen.putImageData(result, 0, 0);

				const url = await offScreen.convertToBlob().then((blob) => URL.createObjectURL(blob));
				ctxScreen.clearRect(0, 0, offScreen.width, offScreen.height);

				const resizeWidth = width * scale;
				const resizeHeight = height * scale;

				if (ratio > 1) {
					offScreen.width = resizeWidth;
					offScreen.height = resizeHeight;
				}

				const getData = await this.urlToImageData({
					ctxDraw: ctxScreen,
					url,
					ratio,
					imgWidth: offScreen.width,
					imgHeight: offScreen.height,
					width: resizeWidth,
					height: resizeHeight
				});

				if (ratio < 1) {
					offScreen.width = resizeWidth;
					offScreen.height = resizeHeight;
				}

				const bounds = {
					minX: Math.round(coord.step1.bounds.minX * ratio) - 3,
					minY: Math.round(coord.step1.bounds.minY * ratio) - 3,
					maxX: Math.round(coord.step1.bounds.maxX * ratio) + 3,
					maxY: Math.round(coord.step1.bounds.maxY * ratio) + 3
				};

				const { imgData, fillImgData, data } = getColorArea({
					ctxDraw: ctxScreen,
					getData,
					bounds,
					color: point.color,
					imgWidth: offScreen.width,
					imgHeight: offScreen.height,
					width: resizeWidth,
					height: resizeHeight
				});

				if (ratio < 1) {
					offScreen.width = resizeWidth;
					offScreen.height = resizeHeight;
				}

				edgeCoords.push({ x: bounds.minX + 3, y: bounds.minY + 3 }, { x: bounds.maxX - 3, y: bounds.maxY - 3 });

				return {
					imgData,
					fillImgData,
					step1: {
						...data,
						bounds,
						width: resizeWidth,
						height: resizeHeight,
						edge: { x1: bounds.minX + 3, y1: bounds.minY + 3, x3: bounds.maxX - 3, y3: bounds.maxY - 3 }
					}
				};
			})
		);

		return { ...point, ...getEdgeCoordinate(edgeCoords), coordinate: newCoords };
	}

	async setEditData({ item, width, height, scale }) {
		const screenWidth = Math.round(width * scale);
		const screenHeight = Math.round(height * scale);

		const offScreen = new OffscreenCanvas(screenWidth, screenHeight);
		const ctxScreen = offScreen.getContext('2d');

		const { x1, y1, x3, y3 } = item;
		const bounds = { minX: x1 - 3, minY: y1 - 3, maxX: x3 + 3, maxY: y3 + 3 };

		ctxScreen.clearRect(0, 0, screenWidth, screenHeight);
		this.drawCoordinate({ ctx: ctxScreen, shape: item });

		const url = await offScreen.convertToBlob().then((blob) => URL.createObjectURL(blob));

		const getData = await this.urlToImageData({
			ctxDraw: ctxScreen,
			url,
			imgWidth: screenWidth,
			imgHeight: screenHeight,
			width: screenWidth,
			height: screenHeight
		});

		const { imgData, fillImgData, data } = getColorArea({
			ctxDraw: ctxScreen,
			getData,
			bounds,
			color: item.color,
			imgWidth: screenWidth,
			imgHeight: screenHeight,
			width: screenWidth,
			height: screenHeight
		});

		return {
			width: screenWidth,
			height: screenHeight,
			imgData,
			fillImgData,
			step1: {
				...data,
				bounds: { minX: x1, minY: y1, maxX: x3, maxY: y3 },
				width: screenWidth,
				height: screenHeight,
				edge: { x1, y1, x3, y3 }
			}
		};
	}

	drawNewShape({ stage, offsetX, offsetY, shapeOpacity, shapeFill, shapeText, drawMove, shape, isUnion, focusLabel, shapeInfo, labelData }) {
		const newDrawMove = drawMove;
		const newShape = shape;

		newDrawMove.coord = [...newDrawMove.coord, { x: offsetX, y: offsetY }];

		if (!isUnion && focusLabel && newDrawMove.shape && focusLabel.index === newDrawMove.shape.index) return { newDrawMove, newShape };

		const result = this.getColorArea({ stage, drawCoord: newDrawMove.coord, shapeOpacity, shapeFill, shapeText, color: shapeInfo.color, labelData });
		newDrawMove.shape = { ...shapeInfo, coordinate: [result], isUnion, ...result.step1.edge };

		if (newDrawMove.shape) {
			this.drawStartPoint(stage.ctxOrigin, newDrawMove.coord[0], stage.zoom);
			this.draw({ stage, ...newShape, shape: newDrawMove.shape, shapeOpacity, shapeFill, shapeText, useDraw: true });
		}

		return { newDrawMove, newShape };
	}

	draw({ stage, shape, shapeFill, shapeText, isDraw = false, index = -1, coorIdx = -1, depth = -1, useDraw = false, ctxScreen = null }) {
		const ctx = ctxScreen !== null ? ctxScreen : useDraw ? stage.ctxDraw : stage.ctx;

		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const drawCtxScreen = offScreen.getContext('2d');

		shape.coordinate.forEach((coords, coordsIdx) => {
			drawCtxScreen.clearRect(0, 0, stage.width, stage.height);
			drawCtxScreen.putImageData(shapeFill ? coords.fillImgData : coords.imgData, 0, 0);
			if (isDraw) ctx.drawImage(offScreen, 0, 0);

			if (index === shape.index && depth === -1) super.drawSquareEdge(ctx, shape);

			if (index === shape.index && coorIdx === coordsIdx && depth === 0) {
				super.drawSquareEdge(
					ctx,
					getEdgeCoordinate([
						{ x: coords.step1.bounds.minX, y: coords.step1.bounds.minY },
						{ x: coords.step1.bounds.maxX, y: coords.step1.bounds.maxY }
					])
				);
			}

			if (shapeText) super.drawValue(ctx, shape);
		});
	}

	/**
	 * @description 좌표 기반으로 색추출 그리기
	 * @param ctx
	 * @param shape
	 */
	drawCoordinate({ ctx, shape }) {
		ctx.strokeStyle = getIconColor(shape.color);
		ctx.fillStyle = shape.color;

		shape.data_value.forEach(({ outerCoords, innerCoords }) => {
			if (outerCoords && innerCoords) {
				ctx.beginPath();

				ctx.moveTo(outerCoords[0].x, outerCoords[0].y);
				outerCoords.slice(1).forEach((item) => {
					ctx.lineTo(item.x, item.y);
				});
				ctx.lineTo(outerCoords[0].x, outerCoords[0].y);

				innerCoords.forEach((coordinate) => {
					if (!coordinate) return;

					ctx.moveTo(coordinate[0].x, coordinate[0].y);
					coordinate.slice(1).forEach((item) => {
						ctx.lineTo(item.x, item.y);
					});
					ctx.lineTo(coordinate[0].x, coordinate[0].y);
				});

				ctx.stroke();
				ctx.fill('evenodd');
			}
		});
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
	 * @param color 도형 색상
	 * @param labelData 도형 목록
	 */
	getColorArea({ stage, drawCoord = [], shapeFill, color, labelData }) {
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

		const { imgData, fillImgData } = getColorpickArea(step1, color, stage.width, imageData);

		stage.ctxDraw.putImageData(shapeFill ? fillImgData : imgData, 0, 0);

		this.drawThresholdArea(stage, drawCoord, stage.zoom);

		return { step1, imgData, fillImgData };
	}

	/**
	 * @description 확대되는 영역 그리기
	 * @param ctx getContext
	 * @param mouse 마우스 위치
	 */
	drawStartPoint(ctx, mouse, zoom) {
		const mouseX = Math.round(mouse.x * zoom);
		const mouseY = Math.round(mouse.y * zoom);

		ctx.save();

		ctx.strokeStyle = '#ffffff';
		ctx.fillStyle = '#ffffff';
		ctx.lineWidth = 4;

		ctx.beginPath();
		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX - 6, mouseY);

		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX + 6, mouseY);

		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX, mouseY - 6);

		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX, mouseY + 6);

		ctx.stroke();
		ctx.closePath();

		ctx.restore();

		ctx.save();

		ctx.strokeStyle = '#000000';
		ctx.fillStyle = '#000000';
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX - 5, mouseY);

		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX + 5, mouseY);

		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX, mouseY - 5);

		ctx.moveTo(mouseX, mouseY);
		ctx.lineTo(mouseX, mouseY + 5);

		ctx.stroke();
		ctx.closePath();

		ctx.restore();
	}

	/**
	 * @description 임계치 영역 그리기
	 * @param ctx getContext
	 * @param coord 도형 정보
	 */
	drawThresholdArea(stage, coord, zoom) {
		stage.clearCanvasOrigin();

		const offScreen = new OffscreenCanvas(stage.canvasImage.width, stage.canvasImage.height);
		const ctxScreen = offScreen.getContext('2d');

		const { lastIndex, length } = this.getPointLength(coord);

		const mouseX = Math.round(lastIndex.x * zoom);
		const mouseY = Math.round(lastIndex.y * zoom);

		const radius = length >= 255 ? 255 : length;
		const percent = Math.round((radius / 255) * 100);

		const { width } = ctxScreen.measureText(`${percent} %`);

		if (coord.length && length > 0) {
			ctxScreen.save();
			ctxScreen.beginPath();
			ctxScreen.fillStyle = '#000000';
			ctxScreen.fillRect(mouseX + 15, mouseY + 15, Math.round(width) + 15, 20);
			ctxScreen.closePath();
			ctxScreen.restore();

			ctxScreen.save();
			ctxScreen.beginPath();
			ctxScreen.fillStyle = '#ffffff';
			ctxScreen.font = `bold ${12}px douzone`;
			ctxScreen.fillText(`${percent} %`, mouseX + 18, mouseY + 30);
			ctxScreen.closePath();
			ctxScreen.restore();

			stage.ctxOrigin.drawImage(offScreen, 0, 0);
		}
	}

	async urlToImageData({ ctxDraw, url, ratio, imgWidth, imgHeight, width, height }) {
		const image = await new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = url;
		});

		if (ratio) {
			ctxDraw.drawImage(
				image,
				0,
				0,
				ratio > 1 ? imgWidth / ratio : imgWidth,
				ratio > 1 ? imgHeight / ratio : imgHeight,
				ratio > 1 ? -ratio : ratio,
				ratio > 1 ? -ratio : ratio,
				width,
				height
			);
		} else {
			ctxDraw.drawImage(image, 0, 0, width, height);
		}

		return ctxDraw.getImageData(0, 0, width, height);
	}

	/**
	 * @description 도형 병합
	 * @param stage
	 * @param shape 새로 그린 도형
	 * @param shapeOpacity 도형 색상 명도
	 * @param concatData 그려져있는 도형
	 */
	concat({ stage, shape, shapeOpacity, concatData }) {
		stage.ctxDraw.clearRect(0, 0, stage.width, stage.height);
		const imageData = stage.ctxDraw.createImageData(stage.width, stage.height);

		const newData = mergeImageData(concatData.coordinate.step1, shape.coordinate[0].step1, false);

		const { imgData, fillImgData } = getColorpickArea(newData, changeOpacity(concatData.color, shapeOpacity), stage.width, imageData);

		const { minX, minY, maxX, maxY } = newData.bounds;
		return { imgData, fillImgData, step1: newData, x1: minX, y1: minY, x3: maxX, y3: maxY };
	}
}

export default Self;
