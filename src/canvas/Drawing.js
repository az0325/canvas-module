import { EDGE_COLOR, EDGE_FOCUS_COLOR, EDGE_LINE_COLOR, EDGE_IN_COLOR } from '~constants/enum';

import { getIconColor } from '~utils/color';

const Drawing = {
	/**
	 * @description 캔버스에 이미지 그리기
	 * @param stage
	 * @param labelData 좌표값이 들어있는 현재 잡고있는 데이터
	 */
	drawCanvasImage: (stage, labelData) => {
		const { ctxImage, canvasImage, width, height } = stage;

		if (!width || !height) return;
		if (!labelData.file_data || labelData.shape.width <= 1 || labelData.shape.height <= 1) return;

		ctxImage.filter = `brightness(${labelData.level + 100}%)`;
		ctxImage.beginPath();
		ctxImage.clearRect(0, 0, canvasImage.width, canvasImage.height);
		ctxImage.drawImage(labelData.file_data, 0, 0, canvasImage.width, canvasImage.height);
		ctxImage.closePath();
	},

	/**
	 * @description 입력 값 표시
	 * @param ctx getContext
	 * @param shape 도형 정보
	 */
	drawValue: (ctx, shape) => {
		if (shape.value === '') return;

		const drawValue = shape.value.length > 10 ? `${shape.value.slice(0, 9)}...` : shape.value;

		const { width } = ctx.measureText(drawValue);

		ctx.font = 'bold 12px douzone';
		ctx.fillStyle = shape?.isFocus ? getIconColor(shape.color) : 'black';
		ctx.textAlign = 'center';
		const centerX = shape.x1 + (shape.x3 - shape.x1) / 2;
		const centerY = shape.y1 + (shape.y3 - shape.y1) / 2;

		ctx.beginPath();
		ctx.fillRect(centerX - width / 2 - 7, centerY - 8, width + 15, 15);
		ctx.save();
		ctx.fillStyle = 'white';
		ctx.fillText(drawValue, centerX, centerY + 4);
		ctx.restore();
		ctx.closePath();
	},

	/**
	 * @description 모형 겉에 사각형 점선 그리기
	 * @param ctx getContext
	 * @param shape 도형 정보
	 */
	drawSquareEdge: (ctx, shape) => {
		ctx.save();

		ctx.strokeStyle = EDGE_LINE_COLOR;
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.rect(shape.x1, shape.y1, shape.x3 - shape.x1, shape.y3 - shape.y1);
		ctx.stroke();
		ctx.closePath();

		ctx.restore();
	},

	/**
	 * @description 도형 모서리에 동그라미 그리기
	 * @param ctx getContext
	 * @param x x 좌표
	 * @param y y 좌표
	 * @param isRed 모서리 색 (빨간색 줄지 말지)
	 */
	drawEdge: (ctx, x, y, isRed = false) => {
		const color = isRed ? EDGE_FOCUS_COLOR : EDGE_COLOR;

		ctx.save();

		ctx.fillStyle = EDGE_IN_COLOR;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.arc(x, y, 3, 0, 3 * Math.PI, false);
		ctx.fill();
		ctx.closePath();

		ctx.beginPath();
		ctx.arc(x, y, 3, 0, 3 * Math.PI, false);
		ctx.stroke();
		ctx.closePath();

		ctx.restore();
	}
};

export default Drawing;
