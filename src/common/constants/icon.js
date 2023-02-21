import box from '~svg/box.svg';
import box_add from '~svg/box_add.svg';
import self from '~svg/self.svg';
import self_add from '~svg/self_add.svg';
import pencil from '~svg/pencil.svg';
import pencil_add from '~svg/pencil_add.svg';
import select from '~svg/select.svg';
import vector_add from '~svg/vector_add.svg';
import vector from '~svg/vector.svg';
import erase from '~svg/erase.svg';
import background from '~svg/background.svg';
import ban from '~svg/ban.svg';

const SELECT = {
	toolName: 'select',
	title: 'Select Tool (M)',
	text: 'Select Tool',
	info: ['전체 영역 선택 및 선택한 영역 위치 이동'],
	cursor: 'select',
	bar: false
};

const AUTO = {
	toolName: 'autoSelect',
	title: 'Auto Select Tool (T)',
	text: 'Auto Select Tool',
	info: ['추출할 객체 주위에 사각형을 그리면', '자동으로 예측하여 영역 추출'],
	cursor: 'rectangular',
	key: 5,
	bar: true
};

const BOX = {
	toolName: 'boundingBox',
	title: 'Bounding Box (B)',
	text: 'Bounding Box',
	info: ['사각형 그리기'],
	cursor: 'rectangular',
	key: 2,
	bar: false
};

const VECTOR = {
	toolName: 'vector',
	title: 'Vector (V)',
	text: 'Vector',
	info: ['기준점 및 좌표를 활용하여 도형 그리기'],
	cursor: 'vector--add', // vector--complete
	key: 1,
	bar: false
};

const PENCIL = {
	toolName: 'pencil',
	title: 'Pencil (P)',
	text: 'Pencil',
	info: ['추출할 객체의 형태 직접 그리기'],
	cursor: 'pen',
	key: 3,
	bar: false
};

const BACKGROUND = {
	toolName: 'background',
	title: 'Background (G)',
	text: 'Background',
	info: ['배경 클릭 시 추출한 객체 외에', '자동으로 배경 영역 추출'],
	cursor: 'background',
	key: 6,
	bar: false
};

const SELF = {
	toolName: 'selfSelect',
	title: 'Self Select Tool (S)',
	text: 'Self Select Tool',
	info: ['추출할 객체의 영역을 마우스 드래그시', '색상 임계값을 통해 자동으로 영역 추출'],
	cursor: 'selfSelect',
	key: 0,
	bar: true
};

const ERASE = {
	toolName: 'eraser',
	title: 'Erase Tool (E)',
	text: 'Erase Tool',
	info: ['Self Select Tool로 추출한 영역이 선택된', '상태에서 지우길 원하는 영역 그리기'],
	cursor: 'eraser',
	bar: false
};

const SKELETON = {
	toolName: 'skeleton',
	title: 'Skeleton (K)',
	text: 'Skeleton',
	info: ['뼈 구조 그리기'],
	cursor: 'vector--add',
	key: 4,
	bar: true
};

const LEVEL = {
	toolName: 'level',
	title: 'Level',
	text: 'Level',
	info: ['이미지 명도조절'],
	cursor: 'selfSelect--erase',
	bar: true
};

export const INSTANCE_ICON =
	process.env.BUILD_TYPE === 'dev'
		? {
				select: SELECT,
				auto: AUTO,
				box: BOX,
				vector: VECTOR,
				pencil: PENCIL,
				background: BACKGROUND,
				self: SELF,
				erase: ERASE,
				skeleton: SKELETON,
				level: LEVEL
		  }
		: {
				select: SELECT,
				box: { ...BOX, bar: true },
				vector: VECTOR,
				pencil: PENCIL,
				background: BACKGROUND,
				self: SELF,
				erase: ERASE,
				skeleton: SKELETON,
				level: LEVEL
		  };

export const OBJECT_ICON = { select: SELECT, box: BOX, level: LEVEL };
export const CLASSIFICATION_ICON = { level: { ...LEVEL, bar: false } };

export const setMouseCursor = (type = '', isUnion = false) => {
	let mouseCursor = '';
	if (type === 'select') mouseCursor = `url(${select}) 5 5, auto`;
	if (type === 'box') mouseCursor = isUnion ? `url(${box_add}) 10 10, auto` : `url(${box}) 10 10, auto`;
	if (type === 'auto') mouseCursor = `url(${box}) 10 10, auto`;
	if (type === 'vectorAdd') mouseCursor = `url(${vector_add}) 4 2, auto`;
	if (type === 'vector' || type === 'skeleton') mouseCursor = `url(${vector}) 2 2, auto`;
	if (type === 'pencil') mouseCursor = isUnion ? `url(${pencil_add}) 4 2, auto` : `url(${pencil}) 4 2, auto`;
	if (type === 'background') mouseCursor = `url(${background}) 0 0, auto`;
	if (type === 'self') mouseCursor = isUnion ? `url(${self_add}) 5 5, auto` : `url(${self}) 5 5, auto`;
	if (type === 'erase') mouseCursor = `url(${erase}) 0 5, auto`;
	if (type === 'ban') mouseCursor = `url(${ban}) 0 0, auto`;

	document.body.style.cursor = mouseCursor; // 커서 변경
};

export const getMouseCursor = () => {
	if (!document.body.style.cursor) return '';

	const url = document.body.style.cursor.split(' ')[0].replace('url("', '').replace('")', '');
	if (url === select) return 'select';
	if (url === box) return 'box';
	if (url === vector_add) return 'vectorAdd';
	if (url === vector) return 'vector';
	if (url === pencil) return 'pencil';
	if (url === self) return 'self';
	if (url === erase) return 'erase';
	if (url === ban) return 'ban';
	if (url === background) return 'background';
};
