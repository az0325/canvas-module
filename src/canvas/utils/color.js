const COLORS = [
	'#CB5037',
	'#AEA3E1',
	'#D8772C',
	'#A1CDE6',
	'#FFC414',
	'#D4F0AD',
	'#72BBA5',
	'#FFDDA6',
	'#4B75D2',
	'#FFC5B8',
	'#8B4C78',
	'#998BD7',
	'#F9BE80',
	'#8ABFDB',
	'#FFE679',
	'#AEDCCE',
	'#C4E792',
	'#82A1E8',
	'#FCCD81',
	'#B77BA5',
	'#F79F8D',
	'#FFD9AD',
	'#634FB8',
	'#FFEFAA',
	'#4F98B9',
	'#C2E5DB',
	'#91C447',
	'#97B1ED',
	'#E89D2D',
	'#C392B4'
];

const getColor = (list, type = 'string') => {
	if (!list.length) return type === 'string' ? hexToRGBA(COLORS[0]) : hexToObject(COLORS[0]);

	const colorList = []; // list 에서 가지고 있는 색상값

	list.forEach((element) => {
		const { r, g, b } = type === 'string' ? rgbaToObject(element.color) : element.color;
		const hex = colorToHexa(r, g, b);
		colorList.push(hex.toUpperCase());
	});

	for (let i = colorList.length - 1; i >= 0; i--) {
		const index = COLORS.findIndex((item) => item === colorList[i]);
		if (index !== -1) {
			const colorIdx = index === COLORS.length - 1 ? 0 : index + 1;
			return type === 'string' ? hexToRGBA(COLORS[colorIdx]) : hexToObject(COLORS[colorIdx]);
		}
	}

	return type === 'string' ? hexToRGBA(COLORS[0]) : hexToObject(COLORS[0]);
};

/**
 * @description 색상 Object 으로 변경
 * @param string 색상
 */
const rgbaToObject = (string) => {
	const color = string.replace('rgba(', '').replace(')', '').replace(' ', '').split(',');
	return { r: Number(color[0]), g: Number(color[1]), b: Number(color[2]), a: Number(color[3]) };
};

/**
 * @description 색상 String 으로 변경
 * @param object 색상
 */
const ObjectToRgba = (object, opacity = 0.5) => {
	return `rgba(${object.r}, ${object.g}, ${object.b}, ${object.a ?? opacity})`;
};

/**
 * @description 색상 String 으로 변경
 * @param object 색상
 */
const getIconColor = (string) => {
	const color = string.replace('rgba(', '').replace(')', '').replace(' ', '').split(',');
	return `rgba(${Number(color[0])}, ${Number(color[1])}, ${Number(color[2])}, 1)`;
};

/**
 * @description hex를 RGBA 로 변경
 * @param hex 색상
 */
const hexToRGBA = (hex, opacity = 0.5) => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);

	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * @description hex를 Object 로 변경
 * @param hex 색상
 */
const hexToObject = (hex, opacity = 1) => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);

	return { r, g, b, a: opacity };
};

/**
 * @description 숫자를 hex로 변경
 * @param {string} color 색상
 */
const numberToHex = (color) => {
	const hex = color.toString(16);
	return hex.length === 1 ? `0${hex}` : hex;
};

/**
 * @description 색상 String 으로 변경
 * @param {object} object 색상
 */
const colorToHexa = (r, g, b) => {
	return `#${numberToHex(r) + numberToHex(g) + numberToHex(b)}`;
};

const rgbaOpacity = (string) => {
	const color = string.replace('rgba(', '').replace(')', '').replace(' ', '').split(',');
	return Number(color[3]) * 100;
};

const changeOpacity = (color, opacity) => {
	const { r, g, b } = rgbaToObject(color);
	const newColor = ObjectToRgba({ r, g, b, a: opacity });
	return newColor;
};

export { COLORS, getColor, rgbaToObject, ObjectToRgba, getIconColor, hexToRGBA, hexToObject, numberToHex, colorToHexa, rgbaOpacity, changeOpacity };
