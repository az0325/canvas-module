import Canvas from './Canvas';
import Shape from './canvas/Shape';

import Box from './canvas/Shapes/Box';
import Pencil from './canvas/Shapes/Pencil';
import Self from './canvas/Shapes/Self';
import Vector from './canvas/Shapes/Vector';
import Add from './canvas/Shapes/Add';
import Erase from './canvas/Shapes/Erase';
import Background from './canvas/Shapes/Background';
import Skeleton from './canvas/Shapes/Skeleton';

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
	_shape: Shape;
	_box: Box;
	_pencil: Pencil;
	_vector: Vector;
	_add: Add;
	_background: Background;
	_self: Self;
	_skeleton: Skeleton;
	_erase: Erase;

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

	findShapes(type: string) {
		if (type === 'box') return this.box;
		if (type === 'pencil') return this.pencil;
		if (type === 'vector') return this.vector;
		if (type === 'self') return this.self;
		if (type === 'add') return this.add;
		if (type === 'background') return this.background;
		if (type === 'erase') return this.erase;
		if (type === 'skeleton') return this.skeleton;
		return this.shape;
	}
}

export default Stage;
