import Canvas from './Canvas';
import Shape from './Shape';

import Box from './Shapes/Box';
import Pencil from './Shapes/Pencil';
import Self from './Shapes/Self';
import Auto from './Shapes/Auto';
import Vector from './Shapes/Vector';
import Add from './Shapes/Add';
import Erase from './Shapes/Erase';
import Background from './Shapes/Background';
import Skeleton from './Shapes/Skeleton';

class Stage extends Canvas {
	constructor() {
		super();

		this._shape = new Shape();
		this._box = new Box();
		this._pencil = new Pencil();
		this._vector = new Vector();
		this._add = new Add();
		this._auto = new Auto();
		this._background = new Background();
		this._self = new Self();
		this._skeleton = new Skeleton();
		this._erase = new Erase();
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

	get auto() {
		return this._auto;
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
		if (type === 'box') return this.box;
		if (type === 'pencil') return this.pencil;
		if (type === 'vector') return this.vector;
		if (type === 'self') return this.self;
		if (type === 'auto') return this.auto;
		if (type === 'add') return this.add;
		if (type === 'background') return this.background;
		if (type === 'erase') return this.erase;
		if (type === 'skeleton') return this.skeleton;
		return this.shape;
	}
}

export default Stage;
