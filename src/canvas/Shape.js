/* eslint-disable class-methods-use-this */
import { EDGE_COLOR, EDGE_FOCUS_COLOR, EDGE_LINE_COLOR, EDGE_IN_COLOR } from '~constants/enum';

import { getIconColor } from '~utils/color';

class Shape {
	/**
	 * @description mousedown event
	 * @param stage 도형이 새로 생성될때 캔버스에 그려줘야하기 때문에 필요
	 * @param shapeOpacity 도형 불투명도
	 * @param shapeFill 도형 채울지 말지
	 * @param shapeText 도형위에 글씨 쓸지말지
	 * @param shape 그려지는 도형
	 * @param labelPoint 도형 목록
	 * @param type 도형 타입
	 */
	mouseDown({ stage, shapeOpacity, shapeFill, shapeText, shape, labelPoint, type }) {
		return { newLabelPoint: labelPoint, newShape: shape };
	}

	/**
	 * @description mouseup event
	 * @async 지우개 도형은 이미지화를 해야하기때문에 동기로 작동 필요
	 * @param stage 도형이 새로 생성될때 캔버스에 그려줘야하기 때문에 필요
	 * @param drawMove 새로 그리고있는 도형
	 * @param shape 그려지는 도형
	 * @param labelPoint 도형 목록
	 * @param shapeOpacity 도형 불투명도
	 * @param shapeFill 도형 채울지 말지
	 * @param shapeText 도형위에 글씨 쓸지말지
	 */
	async mouseUp({ stage, drawMove, shape, labelPoint, shapeOpacity, shapeFill, shapeText }) {
		return { newDrawMove: drawMove, newLabelPoint: labelPoint, newShape: shape };
	}

	/**
	 * @description mousemove event
	 * @param stage 도형이 새로 생성될때 캔버스에 그려줘야하기 때문에 필요
	 * @param shape 그려지는 도형
	 * @param offsetX 마우스 X 좌표
	 * @param offsetY 마우스 Y 좌표
	 * @param mouse 마우스 속성 값
	 * @param shapeOpacity 도형 불투명도
	 * @param shapeFill 도형 채울지 말지
	 * @param shapeText 도형위에 글씨 쓸지말지
	 */
	mouseMove({ stage, shape, offsetX, offsetY, mouse, shapeOpacity, shapeFill, shapeText }) {
		return shape;
	}

	/**
	 * @description mousemove event - 도형 전체 공통이라 따로 넣지않음 (공통화 필요)
	 */
	mouseOut() {}

	/**
	 * @description 뒤로가기 키 event
	 * @param shape 그려지는 도형
	 * @param labelPoint 도형 목록
	 * @param mouse 마우스 속성 값
	 */
	backSpaceKey({ shape, labelPoint, mouse }) {
		return { newLabelPoint: labelPoint, newMouse: mouse, delType: '' };
	}

	/**
	 * @description resize event - 미사용
	 * @async self + background 도형은 이미지화를 해야하기때문에 동기로 작동 필요
	 * @param stage 도형이 새로 생성될때 캔버스에 그려줘야하기 때문에 필요
	 * @param shapeFill 도형 채울지 말지
	 * @param point 재계산 필요한 도형
	 * @param ratio 현재 크기 대비 리사이징 되면 얼마나 커져야 하는지
	 * @param width 이미지 width
	 * @param height 이미지 height
	 * @param scale 리사이징 전 원본대비 비율
	 */
	async resizeEvent({ stage, shapeFill, point, ratio, width, height, scale }) {
		return point;
	}

	/**
	 * @description 저장된 좌표 + 이미지 불러와서 현재 화면에 뿌려질 크기로 좌표 계산
	 * @async self + background 도형은 좌표를 픽셀단위로 변환해야하기 때문에 동기로 작동 필요
	 * @param item 도형
	 * @param width 이미지 width
	 * @param height 이미지 height
	 * @param scale 리사이징 전 원본대비 비율
	 */
	async setEditData({ item, width, height, scale }) {
		return item.data_value;
	}

	/**
	 * @description 새로운 도형 생성
	 * @async self + background 도형은 픽셀단위로 변환해야하기 때문에 동기로 작동 필요
	 * @param stage 도형이 새로 생성될때 캔버스에 그려줘야하기 때문에 필요
	 * @param offsetX 마우스 X 좌표
	 * @param offsetY 마우스 Y 좌표
	 * @param shapeOpacity 도형 불투명도
	 * @param shapeFill 도형 채울지 말지
	 * @param shapeText 도형위에 글씨 쓸지말지
	 * @param drawMove 새로 그리고있는 도형
	 * @param shape 그려지는 도형
	 * @param isUnion union 인지 아닌지 (키 이벤트로 판단)
	 * @param focusLabel 현재 포커싱 되어있는 도형 (union 일 때 필요)
	 * @param shapeInfo 새로운 도형을 생성하기 위한 정보
	 * @param labelData 라벨 레이어 정보 (self + background 에서 사용)
	 */
	async drawNewShape({ stage, offsetX, offsetY, shapeOpacity, shapeFill, shapeText, drawMove, shape, isUnion, focusLabel, shapeInfo, labelData }) {
		return { newDrawMove: drawMove, newLabelPoint: [], newShape: shape };
	}

	/**
	 * @description 실제 캔버스에 그려주는 함수
	 * @param stage 도형이 새로 생성될때 캔버스에 그려줘야하기 때문에 필요
	 * @param shape 그려지는 도형
	 * @param shapeFill 도형 채울지 말지
	 * @param shapeText 도형위에 글씨 쓸지말지
	 * @param isDraw 이미지 그릴지말지 판단 (self + background 에서 필요)
	 * @param index 도형 정보 index
	 * @param coorIdx 도형 index (union 일때)
	 * @param edgeIdx 도형 모서리 index
	 * @param depth 도형 테두리 / 도형 모서리 / union 판단용
	 * @param isNew 새로 생성되는 도형인지 (모서리 + 텍스트 그리기 방지)
	 * @param useDraw 캔버스 어떤거 쓸지 (true: ctxDraw | false: ctx)
	 * @param ctxScreen ctxScreen 있으면 ctx로 사용 (self + background 에서 필요)
	 */
	draw({
		stage,
		shape,
		shapeFill,
		shapeText,
		isDraw = false,
		index = -1,
		coorIdx = -1,
		edgeIdx = -1,
		depth = -1,
		isNew = false,
		useDraw = false,
		ctxScreen = null
	}) {}

	/**
	 * @description 캔버스에 이미지 그리기
	 * @param stage
	 * @param labelData 좌표값이 들어있는 현재 잡고있는 데이터
	 */
	drawCanvasImage(stage, labelData) {
		const { ctxImage, canvasImage, width, height } = stage;

		if (!width || !height) return;
		if (!labelData.file_data || labelData.shape.width <= 1 || labelData.shape.height <= 1) return;

		ctxImage.filter = `brightness(${labelData.level + 100}%)`;
		ctxImage.beginPath();
		ctxImage.clearRect(0, 0, canvasImage.width, canvasImage.height);
		ctxImage.drawImage(labelData.file_data, 0, 0, canvasImage.width, canvasImage.height);
		ctxImage.closePath();
	}

	/**
	 * @description 입력 값 표시
	 * @param ctx getContext
	 * @param shape 도형 정보
	 */
	drawValue(ctx, shape) {
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
	}

	/**
	 * @description 모형 테두리 사각형 그리기
	 * @param ctx getContext
	 * @param shape 도형 정보
	 */
	drawSquareEdge(ctx, shape) {
		ctx.save();

		ctx.strokeStyle = EDGE_LINE_COLOR;
		ctx.lineWidth = 2;

		ctx.beginPath();
		ctx.rect(shape.x1, shape.y1, shape.x3 - shape.x1, shape.y3 - shape.y1);
		ctx.stroke();
		ctx.closePath();

		ctx.restore();
	}

	/**
	 * @description 도형 모서리에 동그라미 그리기
	 * @param ctx getContext
	 * @param x x 좌표
	 * @param y y 좌표
	 * @param isRed 모서리 색 (빨간색 줄지 말지)
	 */
	drawEdge(ctx, x, y, isRed = false) {
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
}

export default Shape;
