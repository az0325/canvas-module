export const VIEW_TYPE = {
	CARD: 0,
	LIST: 1
};

export const PROJECT_FILTER_TAB = {
	TOTAL: { key: 0, text: '전체' },
	IMPORTANT: { key: 1, text: '중요' },
	PERSONAL: { key: 2, text: '개인' },
	SHARE: { key: 3, text: '공유' }
};

export const PROJECT_STATE_TYPE = {
	ALL: { key: 0, text: '전체' },
	PROCESSING: { key: 1, text: '작업중' },
	COMPLETE: { key: 2, text: '작업완료' }
};

export const PROJECT_ORDER_TYPE = {
	MODIFIED_ASC: { key: 0, text: '업데이트 일자 순', order: 'asc' },
	CREATED_DESC: { key: 1, text: '생성일자 순', order: 'asc' },
	NAME_ASC: { key: 2, text: '가나다 순', order: 'asc' },
	NAME_DESC: { key: 3, text: '가나다역 순', order: 'desc' }
};

export const POSSESSION_TYPE = {
	PERSONAL: 0,
	SHARE: 1
};

export const PROJECT_TYPE = {
	IMAGE: { key: 0, text: '이미지', icon: 'icon1_2' },
	VOICE: { key: 2, text: '음성', icon: 'icon1_1' },
	TEXT: { key: 1, text: '텍스트', icon: 'icon1_3' }
	// SCALE: { key: 3, text: '수치', icon: 'icon1_4' }
};

export const IMAGE_LABELING_TYPE = {
	SEGMENTATION: { key: 0, text: 'Instance Segmentation', subText: ['툴을 활용하여 세부 영역을', '지정하여 레이블링을 진행합니다.'], icon: 'icon2_1' },
	DETECTION: { key: 1, text: 'Object Detection', subText: ['박스형태로 영역을 지정하여', '레이블링 진행합니다.'], icon: 'icon2_2' },
	CLASSIFICATION: { key: 2, text: 'Classification', subText: ['별도 영역 지정없이 이미지에', '대한 레이블링을 진행합니다.'], icon: 'icon2_3' }
};

export const LABELING_RESULT_TYPE = {
	INPUT: { key: 0, text: 'Input box', subText: '에디터 화면에서 생성한 레이블링 object에 대해 직접 input 값을 입력합니다.', icon: 'icon3_1' },
	SELECT: { key: 1, text: 'Select box', subText: '에디터 화면에서 사전에 지정한 분류값에 대해서만 선택하여 레이블링을 진행합니다.', icon: 'icon3_2' }
};

export const DATASET_ITEM_STATUS = [
	{ key: 0, text: '파일 업로드중', color: 'gray', disabled: true }, // 0 미사용
	{ key: 1, text: '파일 업로드대기', color: 'gray', disabled: true }, // 1 미사용
	/* -------------------------------------------------------------------------- */
	{ key: 2, text: '작업대기', color: 'orange', disabled: false }, // 2
	{ key: 3, text: '작업중', color: 'blue', disabled: true }, // 3
	{ key: 4, text: '작업완료', color: 'mauve', disabled: false }, // 4
	{ key: 5, text: '임시저장', color: 'green', disabled: false }, // 5
	/* -------------------------------------------------------------------------- */
	{ key: 6, text: '작업중', color: 'blue', disabled: true }, // 6 미사용 (AI)
	{ key: 7, text: '작업완료', color: 'purple', disabled: false }, // 7 미사용 (AI)
	{ key: 8, text: '작업실패', color: 'red', disabled: false } // 8 미사용 (AI)
];

export const AI_MODEL_STATUS_LIST = [
	{ key: 0, text: '적용대기', className: '--ready', disabled: true },
	{ key: 1, text: '적용중', className: '--ing', disabled: true },
	{ key: 2, text: '적용완료', className: '--done', disabled: false },
	{ key: 3, text: '적용실패', className: '--fail', disabled: false }
];

export const CLASS_DETAIL_TYPE = {
	CHECKBOX: { key: 0, title: 'checkbox' },
	RADIO: { key: 1, title: 'radio' },
	INPUTBOX: { key: 2, title: 'inputbox' },
	TEXT: { key: 3, title: 'text' }
};

/* -------------------------------------------------------------------------- */
export const OFFSET = 6;

export const EDGE_COLOR = '#1c90fb';
export const EDGE_FOCUS_COLOR = '#ff0000';
export const EDGE_IN_COLOR = '#ffffff';
export const EDGE_LINE_COLOR = '#1c90fb';

export const SLIDER_BLUE_COLOR = 'rgb(77, 147, 255)';
export const SLIDER_GREY_COLOR = 'rgb(181, 182, 183)';

export const BASIC_COLOR = 'rgba(181, 182, 183, 0.5)';

export const TOOL_TYPE = {
	0: 'self',
	1: 'vector',
	2: 'box',
	3: 'pencil',
	4: 'skeleton',
	5: 'auto',
	6: 'background'
};

export const HISTORY_TYPE = {
	open: { toolName: 'history', text: '이미지 열기' },
	resize: { toolName: 'resize', text: '레이어 변형' }, // 전체 사이즈 변경
	move: { toolName: 'move', text: '이동' },
	del: { toolName: 'del', text: '레이어 삭제' },
	delShape: { toolName: 'del', text: '도형 삭제' }, // union 일때
	movePoint: { toolName: 'movePoint', text: '기준점 변형' },
	addPoint: { toolName: 'addPoint', text: '기준점 추가' },
	delPoint: { toolName: 'delPoint', text: '기준점 삭제' },
	inputText: { toolName: 'inputText', text: '클래스 지정' },
	inputEdit: { toolName: 'inputText--edit', text: '클래스 수정' }, // select
	colorPicker: { toolName: 'colorPicker', text: '불투명도 수정' },
	colorEdit: { toolName: 'colorPicker--edit', text: '색상값 수정' },
	changeList: { toolName: 'changeList', text: '레이어 순서 변경' }
};
