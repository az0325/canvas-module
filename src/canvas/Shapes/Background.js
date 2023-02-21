/* eslint-disable class-methods-use-this */
import Shape from '../Shape';

import { getIconColor } from '~utils/color';

import { getColorArea, findColorArea, mergeImageData, getColorpickArea } from '../utils/Magicwand';

class Background extends Shape {
	backSpaceKey({ shape, labelPoint, mouse }) {
		let newLabelPoint = labelPoint;
		let newMouse = mouse;
		let delType = '';

		const { index, pos, edgeIdx } = shape;
		if (index === -1 && edgeIdx === -1) return { newLabelPoint, newMouse, delType };

		const currIndex = newLabelPoint.findIndex((item) => item.index === index);

		if (pos === 'in') {
			if (newMouse.isSingle) {
				newLabelPoint = [...newLabelPoint.slice(0, currIndex), ...newLabelPoint.slice(currIndex + 1)].map((item, index) => ({ ...item, index }));
				newMouse = { ...newMouse, isSingle: false, isDouble: false };
				delType = 'del';
			}

			if (newMouse.isDouble) {
				newMouse = { ...newMouse, isSingle: true, isDouble: false };
			}
		}

		return { newLabelPoint, newMouse, delType };
	}

	async drawNewShape({ stage, offsetX, offsetY, labelPoint, shapeOpacity, shapeFill, shapeText, drawDot, shape, shapeInfo }) {
		let newDrawDot = drawDot;
		const coordinate = [{ x: offsetX, y: offsetY }];

		const result = await this.getBackground({ stage, shapeOpacity, shapeFill, shapeText, color: shapeInfo.color, shape, labelPoint });

		newDrawDot = { coord: coordinate, shape: { ...shapeInfo, coordinate: [result], x1: 0, y1: 0, x3: stage.width, y3: stage.height } };
		if (newDrawDot.shape) this.draw({ stage, shape: newDrawDot.shape, shapeOpacity, shapeFill, shapeText, useDraw: true });

		return { newDrawDot, newShape: shape };
	}

	draw({ stage, shape, index, coorIdx, depth, shapeFill, shapeText, isDraw = false, useDraw = false, ctxScreen = null }) {
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

	async resizeEvent({ stage, shapeFill, point, ratio, width, height, scale }) {
		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const ctxScreen = offScreen.getContext('2d');

		const result = shapeFill ? point.coordinate[0].fillImgData : point.coordinate[0].imgData;
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

		const bounds = { minX: 0, minY: 0, maxX: offScreen.width, maxY: offScreen.height };

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

		return {
			...point,
			x1: 0,
			y1: 0,
			x3: width * scale,
			y3: height * scale,
			coordinate: [
				{
					imgData,
					fillImgData,
					step1: {
						...data,
						bounds,
						width: width * scale,
						height: height * scale,
						edge: { x1: 0, y1: 0, x3: width * scale, y3: height * scale }
					}
				}
			]
		};
	}

	async setEditData({ item, width, height, scale }) {
		const screenWidth = Math.round(width * scale);
		const screenHeight = Math.round(height * scale);

		const offScreen = new OffscreenCanvas(screenWidth, screenHeight);
		const ctxScreen = offScreen.getContext('2d');

		const { x1, y1, x3, y3 } = item;
		const bounds = { minX: x1, minY: y1, maxX: x3, maxY: y3 };

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
				bounds,
				width: screenWidth,
				height: screenHeight,
				edge: { x1, y1, x3, y3 }
			}
		};
	}

	async getBackground({ stage, color, shapeOpacity, shapeFill, shape, labelPoint }) {
		const { width, height } = stage;

		const offScreen = new OffscreenCanvas(stage.width, stage.height);
		const ctxScreen = offScreen.getContext('2d');

		labelPoint
			.filter((item) => item.type !== 'background')
			.forEach((element) => {
				if (element.label_state !== 1) {
					const shapeType = stage.findShapes(element.type);
					shapeType.draw({
						stage,
						ctxScreen,
						shape: element,
						shapeOpacity,
						shapeFill,
						shapeText: false,
						...shape,
						isDraw: true,
						mouse: { isSingle: false, isDouble: false }
					});
				}
			});

		const getData = ctxScreen.getImageData(0, 0, width, height);
		const data = findColorArea({ data: getData.data, width, height });

		ctxScreen.clearRect(0, 0, width, height);
		ctxScreen.fillStyle = color;
		ctxScreen.strokeStyle = color;
		ctxScreen.rect(0, 0, width, height);
		ctxScreen.stroke();
		ctxScreen.fill();

		const getBackData = ctxScreen.getImageData(0, 0, width, height);
		const backData = findColorArea({ data: getBackData.data, width, height });

		const bounds = { minX: 0, minY: 0, maxX: width, maxY: height };
		const background = mergeImageData({ ...backData, bounds }, { ...data, bounds }, true);

		stage.ctxDraw.clearRect(0, 0, width, height);
		const imageData = stage.ctxDraw.createImageData(width, height);
		const { imgData, fillImgData } = getColorpickArea(background, color, width, imageData);

		return { imgData, fillImgData, step1: { ...background, edge: { x1: 0, y1: 0, x3: width, y3: height } } };
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
}

export default Background;
