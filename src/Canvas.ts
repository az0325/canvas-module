class Canvas {
	width: number;
	height: number;
	scale: number;
	zoom: number;
	canvas: null | HTMLCanvasElement;
	ctx: null | CanvasRenderingContext2D;
	canvasDraw: null | HTMLCanvasElement;
	ctxDraw: null | CanvasRenderingContext2D;
	canvasImage: null | HTMLCanvasElement;
	ctxImage: null | CanvasRenderingContext2D;
	canvasOrigin: null | HTMLCanvasElement;
	ctxOrigin: null | CanvasRenderingContext2D;

	constructor() {
		this.width = 0;
		this.height = 0;
		this.scale = 1;
		this.zoom = 1;

		this.canvas = null;
		this.ctx = null;

		this.canvasDraw = null;
		this.ctxDraw = null;

		this.canvasImage = null;
		this.ctxImage = null;

		this.canvasOrigin = null;
		this.ctxOrigin = null;
	}

	/**
	 * @description 돔에 그려줄 캔버스 생성 및 정의
	 * @param id
	 * @param zIndex
	 */
	createCanvasElement({ id, zIndex }: { id: string; zIndex: string }) {
		const canvas = document.createElement('canvas');
		canvas.id = id;
		canvas.width = this.width;
		canvas.height = this.height;
		canvas.style.position = 'absolute'; //able to be layered on top of each other
		canvas.style.zIndex = zIndex;
		canvas.draggable = false;
		return canvas;
	}

	/**
	 * @description 돔에 캔버스 넣기
	 * @param parentId 부모 element
	 * @param width 그려질 캔버스 width
	 * @param height 그려질 캔버스 height
	 * @param scale 원본 대비 비율
	 * @param parentHeight 부모 element의 height
	 * @param parentWidth 부모 element의 width
	 */
	setStage({
		parentId,
		width,
		height,
		scale,
		parentHeight,
		parentWidth
	}: {
		parentId: string;
		width: number;
		height: number;
		scale: number;
		parentHeight: number;
		parentWidth: number;
	}) {
		this.width = Math.round(width * scale);
		this.height = Math.round(height * scale);
		this.scale = scale;

		const canvas = this.createCanvasElement({ id: `canvas`, zIndex: '10' });
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');

		const canvasDraw = this.createCanvasElement({ id: `canvasDraw`, zIndex: '10' });
		this.canvasDraw = canvasDraw;
		this.ctxDraw = canvasDraw.getContext('2d');

		const canvasImage = this.createCanvasElement({ id: `canvasImage`, zIndex: '5' });
		this.canvasImage = canvasImage;
		this.ctxImage = canvasImage.getContext('2d');

		const canvasOrigin = this.createCanvasElement({ id: `canvasOrigin`, zIndex: '10' });
		this.canvasOrigin = canvasOrigin;
		this.ctxOrigin = canvasOrigin.getContext('2d');

		document.getElementById(parentId)?.appendChild(this.canvas);
		document.getElementById(parentId)?.appendChild(this.canvasDraw);
		document.getElementById(parentId)?.appendChild(this.canvasImage);
		document.getElementById(parentId)?.appendChild(this.canvasOrigin);

		const newTop = Math.round(parentHeight / 2 - this.height / 2);
		const newLeft = Math.round(parentWidth / 2 - this.width / 2);

		this.relocateCanvasAll({ newTop, newLeft });
	}

	/**
	 * @description 캔버스 별 마우스 이벤트 붙히기
	 * @param mouseEvent 마우스 이벤트 callback 함수
	 */
	addMouseEvent(mouseEvent: (e: MouseEvent) => any) {
		if (!this.canvas || !this.canvasDraw || !this.canvasImage || !this.canvasOrigin) return;

		this.canvas.onmousemove = (e) => mouseEvent(e);
		this.canvas.onmousedown = (e) => mouseEvent(e);
		this.canvas.onmouseup = (e) => mouseEvent(e);
		this.canvas.onmouseout = (e) => mouseEvent(e);
		this.canvas.ondblclick = (e) => mouseEvent(e);
		// this.canvas.onwheel = (e) => mouseEvent(e);

		this.canvasDraw.onmousemove = (e) => mouseEvent(e);
		this.canvasDraw.onmousedown = (e) => mouseEvent(e);
		this.canvasDraw.onmouseup = (e) => mouseEvent(e);
		this.canvasDraw.onmouseout = (e) => mouseEvent(e);
		this.canvasDraw.ondblclick = (e) => mouseEvent(e);
		// this.canvasDraw.onwheel = (e) => mouseEvent(e);

		this.canvasImage.onmousemove = (e) => mouseEvent(e);
		this.canvasImage.onmousedown = (e) => mouseEvent(e);
		this.canvasImage.onmouseup = (e) => mouseEvent(e);
		this.canvasImage.onmouseout = (e) => mouseEvent(e);
		this.canvasImage.ondblclick = (e) => mouseEvent(e);
		// this.canvasImage.onwheel = (e) => mouseEvent(e);

		this.canvasOrigin.onmousemove = (e) => mouseEvent(e);
		this.canvasOrigin.onmousedown = (e) => mouseEvent(e);
		this.canvasOrigin.onmouseup = (e) => mouseEvent(e);
		this.canvasOrigin.onmouseout = (e) => mouseEvent(e);
		this.canvasOrigin.ondblclick = (e) => mouseEvent(e);
		this.canvasOrigin.onwheel = (e) => mouseEvent(e);
	}

	clearCanvas() {
		if (!this.canvas || !this.ctx) return;
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	clearCanvasDraw() {
		if (!this.canvasDraw || !this.ctxDraw) return;
		this.ctxDraw.clearRect(0, 0, this.canvasDraw.width, this.canvasDraw.height);
	}

	clearCanvasImage() {
		if (!this.canvasImage || !this.ctxImage) return;
		this.ctxImage.clearRect(0, 0, this.canvasImage.width, this.canvasImage.height);
	}

	clearCanvasOrigin() {
		if (!this.canvasOrigin || !this.ctxOrigin) return;
		this.ctxOrigin.clearRect(0, 0, this.canvasOrigin.width, this.canvasOrigin.height);
	}

	/**
	 * @description 캔버스 리사이징
	 * @param width 캔버스 width
	 * @param height 캔버스 height
	 * @param scale 원본대비 비율 (이미지 변경할때마다 적용)
	 */
	resizeCanvasAll(width: number, height: number, scale: number) {
		this.zoom = 1;

		const newWidth = Math.round(width * scale);
		const newHeight = Math.round(height * scale);

		this.width = newWidth;
		this.height = newHeight;
		this.scale = scale;

		const newTop = height <= newHeight ? 0 : Math.round(height / 2 - newHeight / 2);
		const newLeft = width <= newWidth ? 0 : Math.round(width / 2 - newWidth / 2);

		this.relocateCanvasAll({ newTop, newLeft });

		if (!this.canvas || !this.canvasDraw || !this.canvasImage || !this.canvasOrigin) return;

		this.canvas.width = newWidth;
		this.canvas.height = newHeight;

		this.canvasDraw.width = newWidth;
		this.canvasDraw.height = newHeight;

		this.canvasImage.width = newWidth;
		this.canvasImage.height = newHeight;

		this.canvasOrigin.width = newWidth;
		this.canvasOrigin.height = newHeight;

		this.redrawCanvasAll(1);
	}

	/**
	 * @description 캔버스 재배치 (가운대 정렬)
	 * @param newTop top 사이즈
	 * @param newLeft left 사이즈
	 */
	relocateCanvasAll({ newTop, newLeft }: { newTop: number; newLeft: number }) {
		if (!this.canvas || !this.canvasDraw || !this.canvasImage || !this.canvasOrigin) return;

		this.canvas.style.top = `${newTop}px`;
		this.canvas.style.left = `${newLeft}px`;

		this.canvasDraw.style.top = `${newTop}px`;
		this.canvasDraw.style.left = `${newLeft}px`;

		this.canvasImage.style.top = `${newTop}px`;
		this.canvasImage.style.left = `${newLeft}px`;

		this.canvasOrigin.style.top = `${newTop}px`;
		this.canvasOrigin.style.left = `${newLeft}px`;
	}

	/**
	 * @description 캔버스 사이즈 조절 (확대/축소)
	 * @param zoom 확대 비율
	 */
	redrawCanvasAll(zoom: number) {
		if (!this.canvas || !this.canvasDraw || !this.canvasImage || !this.canvasOrigin) return;

		const addImg = document.getElementById('addImg');
		if (!addImg) return;

		const { height, width } = addImg.getBoundingClientRect();

		this.zoom = zoom;

		const newWidth = Math.round(this.width * zoom);
		const newHeight = Math.round(this.height * zoom);

		this.canvasImage.width = newWidth;
		this.canvasImage.height = newHeight;

		this.canvasOrigin.width = newWidth;
		this.canvasOrigin.height = newHeight;

		this.canvas.style.transformOrigin = '0 0';
		this.canvas.style.transform = `scale(${zoom})`;

		this.canvasDraw.style.transformOrigin = '0 0';
		this.canvasDraw.style.transform = `scale(${zoom})`;

		const newTop = height <= newHeight ? 0 : Math.round(height / 2 - newHeight / 2);
		const newLeft = width <= newWidth ? 0 : Math.round(width / 2 - newWidth / 2);

		this.relocateCanvasAll({ newTop, newLeft });
	}
}

export default Canvas;
