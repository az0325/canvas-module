export type TImageData = {
	imageUrl: string;
	imageFile: File;
	data: HTMLImageElement;
	shape: { width: number; height: number };
	scale: number;
};

export interface IMouseDown {
	stage: any;
	shapeOpacity: number;
	shapeFill: boolean;
	shapeText: boolean;
	shape: any;
	labelPoint: any;
	type: string;
}

export interface IMouseUp {
	stage: any;
	drawMove: any;
	shapeOpacity: number;
	shapeFill: boolean;
	shapeText: boolean;
	shape: any;
	labelPoint: any;
}

export interface IMouseMove {
	stage: any;
	shape: any;
	offsetX: number;
	offsetY: number;
	mouse: any;
	shapeOpacity: number;
	shapeFill: boolean;
	shapeText: boolean;
}

export interface IBackSpaceKey {
	shape: any;
	labelPoint: any;
	mouse: any;
}

export interface IResize {
	stage: any;
	shape: any;
	shapeFill: boolean;
	point: any;
	ratio: number;
	width: number;
	height: number;
	scale: number;
}

export interface ISetEditData {
	item: any;
	width: number;
	height: number;
	scale: number;
}

export interface IDrawNewShape {
	stage: any;
	offsetX: number;
	offsetY: number;
	shapeOpacity: number;
	shapeFill: boolean;
	shapeText: boolean;
	drawMove: any;
	shape: any;
	isUnion: boolean;
	focusLabel: any;
	shapeInfo: any;
	labelData: any;
}

export interface IDraw {
	stage: any;
	shape: any;
	shapeFill: boolean;
	shapeText: boolean;
	isDraw: boolean;
	index: number;
	coorIdx: number;
	edgeIdx: number;
	depth: number;
	isNew: boolean;
	useDraw: boolean;
	ctxScreen: null | CanvasRenderingContext2D;
}
