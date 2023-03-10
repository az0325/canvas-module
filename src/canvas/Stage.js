import Canvas from './Canvas';
import Shape from './Shape';

import Box from './Shapes/Box';
import Pencil from './Shapes/Pencil';
import Self from './Shapes/Self';
import Vector from './Shapes/Vector';
import Add from './Shapes/Add';
import Erase from './Shapes/Erase';
import Background from './Shapes/Background';
import Skeleton from './Shapes/Skeleton';

const shape = new Shape();
const box = new Box();
const pencil = new Pencil();
const vector = new Vector();
const add = new Add();
const background = new Background();
const self = new Self();
const skeleton = new Skeleton();
const erase = new Erase();

class Stage extends Canvas {
	constructor() {
		super();

		this._shape = shape;
		this._box = box;
		this._pencil = pencil;
		this._vector = vector;
		this._add = add;
		this._background = background;
		this._self = self;
		this._skeleton = skeleton;
		this._erase = erase;
	}

	get shape() {
		return this._shape;
	}

	get box() {
		return this._box;
	}

	get pencil() {
		return this._pencil;
	}

	get vector() {
		return this._vector;
	}

	get self() {
		return this._self;
	}

	get add() {
		return this._add;
	}

	get background() {
		return this._background;
	}

	get erase() {
		return this._erase;
	}

	get skeleton() {
		return this._skeleton;
	}

	findShapes(type) {
		if (type === 'box') return this._box;
		if (type === 'pencil') return this._pencil;
		if (type === 'vector') return this._vector;
		if (type === 'self') return this._self;
		if (type === 'add') return this._add;
		if (type === 'background') return this._background;
		if (type === 'erase') return this._erase;
		if (type === 'skeleton') return this._skeleton;
		return this._shape;
	}
}

export default Stage;
