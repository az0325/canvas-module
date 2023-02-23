import React, { useEffect, useRef, useState } from 'react';

import { isEqual } from 'lodash-es';

import Stage from '../canvas/Stage';
import Drawing from '../canvas/Drawing';

import { deepClone, findCurrentArea, getEdgeCoordinate, getScale } from '../canvas/utils/Canvas';

import { changeOpacity } from '../canvas/utils/color';

import useDebounceResize from '../common/hooks/useDebounceResize';

import { TImageData } from '../common/types/Shape';

const stage = new Stage();

const BASIC_COLOR = 'rgba(181, 182, 183, 0.5)';

// type TField = {
// 	imageData: TImageData
// };

const Field = (props) => {
	const { imageData } = props;

	const [toolType, setToolType] = useState(''); // LNB에 있는 도구
	const [zoom, setZoom] = useState({ style: {}, value: 1, prev: 1 }); // 이미지 확대 및 축소
	const [focusLabel, setFocusLabel] = useState(null); // 지금 잡고있는 도형 (파란색 태두리)
	const [shapeOpacity, setShapeOpacity] = useState(50); // 도형 불투명도
	const [shapeFill, setShapeFill] = useState(true); // 도형 채우기
	const [shapeText, setShapeText] = useState(true); // 도형 글씨 표시

	const [historyData, setHistoryData] = useState(null); // 도형 글씨 표시
	const [labelData, setLabelData] = useState(null); // 도형 글씨 표시
	// const [imageData, setImageData] = useState(null); // 도형 글씨 표시

	// state -> ref
	const _toolType = useRef(toolType);
	const _zoom = useRef(zoom); // resize
	const _focusLabel = useRef(focusLabel);
	const _shapeOpacity = useRef(shapeOpacity);
	const _shapeFill = useRef(shapeFill);
	const _shapeText = useRef(shapeText);

	// store -> ref
	const _labelData = useRef(labelData); // 캔버스간의 이동을 위해 store onChange 최소한으로 방지
	const _imageData = useRef(imageData); // 캔버스간의 이동을 위해 store onChange 최소한으로 방지

	// render 방지용
	const _shape = useRef({ index: -1, pos: 'o', type: '', coorIdx: -1, edgeIdx: -1, depth: -1, holding: null });
	const _mouse = useRef({ x: -1, y: -1, isDown: false, isSingle: false, isDouble: false }); // 마우스 좌표
	const _drawMove = useRef({ shape: null, coord: [] }); // box / 자유곡선 / 화살표 / 자동추출
	const _drawDot = useRef({ shape: null, coord: [] }); // 스켈레톤 / 다각형 / 자동추출
	const _prevShape = useRef(null); // 히스토리 쌓임 방지

	useDebounceResize(() => handleResize());

	document.addEventListener('keydown', (e) => _handleKeyEvent(e));
	document.addEventListener('keyup', (e) => _handleKeyEvent(e));

	useEffect(() => {
		_toolType.current = toolType;
		_finishDrawing();
	}, [toolType]);

	useEffect(() => {
		_zoom.current.prev = _zoom.current.value;
		_zoom.current = zoom;
	}, [zoom]);

	useEffect(() => {
		_shapeOpacity.current = shapeOpacity / 100;
		_shapeFill.current = shapeFill;
		_shapeText.current = shapeText;

		if (_labelData.current) drawAll(); // 레이어 옵션 바뀌면 다시 그리기 (불투명도, 텍스트 테두리 유무)
	}, [shapeOpacity, shapeFill, shapeText]);

	useEffect(() => {
		// 캔버스 영역 초기 세팅
		if (imageData?.imageUrl) {
			const addImg = document.getElementById('addImg');
			const { height: parentHeight, width: parentWidth } = addImg.getBoundingClientRect();
			const { width, height, scale } = getScale(imageData);
			stage.setStage({ parentId: 'addImg', width, height, scale, parentHeight, parentWidth });
			stage.addMouseEvent(handleMouseEvent);
			Drawing.drawCanvasImage(stage, { ..._labelData.current, ...imageData });
			_imageData.current = { ...imageData };
		}
	}, [imageData]);

	useEffect(() => {
		if (!labelData) return;
		if (!stage.canvas) return;

		_labelData.current = { ...labelData };

		// 레이어 영역이서 포커싱 되는 도형
		if (_focusLabel.current) {
			_labelData.current.points = _labelData.current.points.map((item) => ({ ...item, isFocus: item.index === _focusLabel.current?.index }));
			_focusLabel.current = _labelData.current.points.find((item) => item.index === _focusLabel.current.index);
		}

		stage.clearCanvasDraw();
		drawAll();
	}, [labelData]);

	useEffect(() => {
		if (focusLabel && focusLabel.coorIdx !== -1) return;

		_focusLabel.current = focusLabel;

		if (focusLabel && focusLabel.coorIdx === -1) _shape.current = { ..._shape.current, coorIdx: -1, depth: -1 };

		if (_labelData.current) {
			_labelData.current.points = _labelData.current.points.map((item) => ({
				...item,
				isFocus: !!focusLabel && item.index === focusLabel?.index
			}));
		}

		if (focusLabel) {
			_shape.current = { ..._shape.current, index: focusLabel.index, type: focusLabel.type, holding: null };
			_mouse.current = { ..._mouse.current, isSingle: true, isDouble: false };
		} else {
			_shape.current = { index: -1, pos: 'o', type: '', coorIdx: -1, edgeIdx: -1, holding: null };
		}

		if (_labelData.current && (!_mouse.current.isDouble || !focusLabel)) drawAll();
	}, [focusLabel]);

	const handleShapeOptions = (type, value) => {
		if (type === 'opacity') setShapeOpacity(value);
		if (type === 'fill') setShapeFill(value);
		if (type === 'text') setShapeText(value);
	};

	/**
	 * @description window 화면 resize
	 */
	const handleResize = async () => {
		if (!_labelData.current) return;
		stage.redrawCanvasAll(_zoom.current.value);
		Drawing.drawCanvasImage(stage, { ..._labelData.current, ..._imageData.current });
	};

	/**
	 * @description 키 이벤트
	 * @param e event
	 */
	const _handleKeyEvent = (e) => {
		const isCtrlKey = e.ctrlKey || (e.metaKey && /Mac OS/.test(navigator.userAgent));

		const labelPoint = _labelData.current ? _labelData.current.points : [];

		if (_mouse.current.x !== -1 && _mouse.current.y !== -1) {
			const currData = _focusLabel.current ? labelPoint.find((item) => item.index === _focusLabel.current.index) : null;
			const isUnion = e.altKey && currData && currData.type === _toolType.current;
			// setMouseCursor(_toolType.current, isUnion);
		}

		if ((isCtrlKey && e.key === 's') || (isCtrlKey && e.key === 'z')) e.preventDefault();
		if (_toolType.current === '') return;
		// if (_shape.current.index === -1) return;

		// vector, skeleton 도형 그리기 완성
		if (isCtrlKey && e.key === 'Enter') {
			_finishDrawing();
			return;
		}

		// 뒤로가기 키 이벤트 -> 좌표 지우기
		if (e.key === 'Backspace') {
			if (_shape.current.index === -1 || _shape.current.type === '') return;

			const shapeType = stage.findShapes(_shape.current.type);
			const { newLabelPoint, newMouse, delType = '' } = shapeType.backSpaceKey({ shape: _shape.current, labelPoint, mouse: _mouse.current });

			_mouse.current = newMouse;
			setFocusLabel(null);

			if (!newLabelPoint.length) handleShapeOptions('fill', true);

			_setLabelState(newLabelPoint, delType !== '', delType);
			drawAll();
		}
	};

	/**
	 * @description 마우스 이벤트
	 * @param e event
	 */
	const handleMouseEvent = async (e) => {
		// control key : scroll 확대
		// option (= alt) : 도형 유니온(기존 shift) 기능

		e.stopPropagation();
		e.preventDefault();

		const isCtrlKey = e.ctrlKey || (e.metaKey && /Mac OS/.test(navigator.userAgent));

		// 마우스 wheel -> 이미지 확대 / 축소
		if (e.type === 'wheel') {
			const parentEl = document.getElementById('addImg');
			if (isCtrlKey) {
				let delta = e.delta || e.wheelDelta;
				delta = Math.max(-1, Math.min(1, delta)); // cap the delta to [-1,1] for cross browser consistency
				if ((delta < 0 && _zoom.current.value <= 0.5) || (delta > 0 && _zoom.current.value >= 5)) return;

				_zoom.current.prev = _zoom.current.value;
				_zoom.current.value += delta * 0.1 * _zoom.current.value;
				_zoom.current.value = Math.max(0.5, Math.min(5, _zoom.current.value));
				_zoom.current.value = Math.round(_zoom.current.value * 10) / 10;

				const prevPoint = { x: e.pageX + parentEl.scrollLeft, y: e.pageY + parentEl.scrollTop };
				const zoomPoint = { x: (prevPoint.x / _zoom.current.prev) * _zoom.current.value, y: (prevPoint.y / _zoom.current.prev) * _zoom.current.value };
				const newScroll = { x: zoomPoint.x - e.pageX, y: zoomPoint.y - e.pageY };

				parentEl.scrollLeft = newScroll.x;
				parentEl.scrollTop = newScroll.y;

				setZoom({ ..._zoom.current, value: _zoom.current.value });

				handleResize();
			} else {
				parentEl.scrollLeft += e.deltaX;
				parentEl.scrollTop += e.deltaY;
			}
		}

		const offsetX = stage.zoom === 1 ? e.offsetX : Math.round(e.offsetX / stage.zoom);
		const offsetY = stage.zoom === 1 ? e.offsetY : Math.round(e.offsetY / stage.zoom);

		const labelPoint = _labelData.current ? deepClone(_labelData.current.points) : [];
		const currData = _focusLabel.current ? labelPoint.find((item) => item.index === _focusLabel.current.index) : null;
		const isUnion = e.altKey && currData && currData.type === _toolType.current;

		// const cursor = getMouseCursor();
		// if (cursor === '') setMouseCursor('select');
		// if (cursor !== 'select') setMouseCursor(_toolType.current === 'erase' && (!currData || currData.type !== 'self') ? 'ban' : _toolType.current, isUnion);
		// if (cursor === 'vectorAdd') setMouseCursor('vector');

		if (e.type !== 'mouseout' && (_toolType.current === '' || _toolType.current === 'level' || _toolType.current === 'zoom')) return;

		// 마우스 더블클릭 -> 좌표
		if (e.type === 'dblclick') {
			if (_toolType.current === 'select') {
				_shape.current = findCurrentArea({ label: labelPoint, x: offsetX, y: offsetY, isDouble: true, shape: _shape.current });
				_mouse.current = { ..._mouse.current, isDouble: true, isSingle: false };

				if (_focusLabel.current) setFocusLabel({ ..._focusLabel.current, coorIdx: _shape.current.coorIdx });

				drawAll();
			}
		}

		if (e.type === 'mousedown') {
			if (e.detail === 2 || isCtrlKey) return; // doubleclick 방지

			// 새로운 도형 그리기 위해 포커싱 해지
			if (_toolType.current !== 'select' && _toolType.current !== 'erase') {
				_shape.current = { index: -1, pos: 'o', type: '', coorIdx: -1, edgeIdx: -1, depth: -1, holding: null };
				if (labelPoint.length) {
					_mouse.current = { ..._mouse.current, isDown: false };

					// 백그라운드 칠해져있는지 확인
					const _isBack = _labelData.current && _labelData.current.points.some((item) => item.type === 'background');
					if (!e.ctrlKey && _isBack) {
						checkBackground();
						if (_toolType.current === 'self') return;
					}
				}
			}

			// 현재 잡고있는 도형있으면 다시 넣어주기
			if (_shape.current.holding) {
				const newLabelPoint = [...labelPoint, _shape.current.holding].sort(({ index: a }, { index: b }) => a - b);
				_labelData.current = { ..._labelData.current, points: [...newLabelPoint] };
			}

			// 현재 mouse down한 위치에 도형이 있는지 찾기
			if (_toolType.current === 'select') {
				_shape.current = findCurrentArea({ label: labelPoint, x: offsetX, y: offsetY, isDouble: false, shape: _shape.current });
				_mouse.current = { ..._mouse.current, isSingle: _shape.current.depth === -1, isDouble: _shape.current.depth !== -1 };

				if (_shape.current.index === -1) {
					setFocusLabel(null);
					return;
				}
			}

			const shapeType = stage.findShapes(_shape.current.type !== '' ? _shape.current.type : _toolType.current);
			const { newLabelPoint, newShape } = shapeType.mouseDown({
				stage: stage,
				shapeOpacity: _shapeOpacity.current,
				shapeFill: _shapeFill.current,
				shapeText: _shapeText.current,
				shape: _shape.current,
				labelPoint,
				type: _toolType.current
			});

			// self select는 mouse down 했을때 새로운 도형이 생성되어야함 (임계치 기본값 10)
			if (_toolType.current === 'self' && newShape.index === -1) drawNewShape(offsetX, offsetY, labelPoint, isUnion);

			_labelData.current = { ..._labelData.current, points: [...newLabelPoint] };
			_shape.current = newShape;
			_prevShape.current = _prevShape.current ? _prevShape.current : _shape.current.holding ? deepClone(_shape.current.holding) : null;
			_mouse.current = { ..._mouse.current, isDown: true, x: offsetX, y: offsetY, isSingle: newShape.depth === -1, isDouble: newShape.pos !== -1 };

			// 새로운 도형이 생성되면 focus
			if (!_drawMove.current.shape && _shape.current.holding) setFocusLabel(_shape.current.holding);

			// 도형 이동 / 수정시 ctxDraw로 도형 빼주기 (그리기)
			if (_shape.current.holding && _shape.current.holding.type === 'self') {
				stage.clearCanvasDraw();
				shapeType.draw({
					stage,
					shape: _shape.current.holding,
					shapeOpacity: _shapeOpacity.current,
					shapeFill: _shapeFill.current,
					shapeText: _shapeText.current,
					..._shape.current,
					isDraw: true,
					mouse: _mouse.current,
					useDraw: true
				});
			}

			drawAll();
		}

		if (e.type === 'mousemove') {
			// 첫 좌표랑 만나면 도형이 되므로 마우스 커서 변경
			// if (_drawDot.current.shape && _drawDot.current.coord.length > 1) {
			// 	const [{ x, y }] = _drawDot.current.coord;
			// 	if (isInOffset({ x, offsetX, y, offsetY })) setMouseCursor('vectorAdd');
			// }

			// mouse down을 한 다음에 mouse move가 되면 새로운 도형이 생성됨
			if (_mouse.current.isDown) {
				if (
					_toolType.current === 'box' ||
					_toolType.current === 'pencil' ||
					_toolType.current === 'auto' ||
					_toolType.current === 'self' ||
					_toolType.current === 'erase'
				) {
					if (_toolType.current !== 'select') {
						drawNewShape(offsetX, offsetY, labelPoint, isUnion);
						return;
					}
				}

				// 도형 이동 / 수정 할 때
				if (_shape.current.holding) {
					if (_shape.current.holding.type === 'self' || _shape.current.holding.type === 'background') return;

					const shapeType = stage.findShapes(_shape.current.holding.type);
					_shape.current = shapeType.mouseMove({
						stage: stage,
						shape: _shape.current,
						offsetX,
						offsetY,
						shapeOpacity: _shapeOpacity.current,
						shapeFill: _shapeFill.current,
						shapeText: _shapeText.current,
						mouse: _mouse.current
					});
				}

				_mouse.current = { ..._mouse.current, x: offsetX, y: offsetY };
			}
		}

		if (e.type === 'mouseup') {
			if (e.detail === 2) return; // doubleclick 방지

			const shapeType = stage.findShapes(_toolType.current);
			const { newDrawMove, newLabelPoint, newShape } = await shapeType.mouseUp({
				stage: stage,
				drawMove: _drawMove.current,
				labelPoint,
				shape: _shape.current,
				shapeOpacity: _shapeOpacity.current,
				shapeFill: _shapeFill.current,
				shapeText: _shapeText.current
			});

			_drawMove.current = newDrawMove;
			_shape.current = newShape;

			// 지우게 영역으로 모두 지웠을 경우 레이어 삭제로 간주
			if (_toolType.current === 'erase' && newLabelPoint.length !== labelPoint.length) {
				_setLabelState(newLabelPoint, true, 'del');
			}

			//  새로운 도형 생성 완료 (레이어 추가)
			if (newLabelPoint.length && _toolType.current !== 'background') {
				_setLabelState(
					newLabelPoint.map((point) => {
						let layerOpen = true;
						if (point.output_detail_type === 0 || point.output_detail_type === 1) {
							if (point.detail_infos.some((item) => item.isCheck)) layerOpen = false;
						}

						if (point.output_detail_type === 2 || point.output_detail_type === 3) {
							if (point.output_detail_value !== '' && point.output_detail_value !== null) layerOpen = false;
						}

						return { ...point, layerOpen };
					}),
					!!_drawMove.current.coord.length && _toolType.current !== 'auto',
					_toolType.current
				);
			}

			//  새로운 도형 생성 (그리는 중)
			if (_toolType.current === 'skeleton' || _toolType.current === 'vector' || _toolType.current === 'background') {
				if (_shape.current.index === -1) {
					_shape.current = { index: -1, pos: 'o', type: '', coorIdx: -1, depth: -1, edgeIdx: -1, holding: null };
					drawNewShape(offsetX, offsetY, labelPoint, isUnion);
				}
			}

			// 잡고있는 도형을 놓으면 히스토리 쌓기 + 도형 재배치
			if (_shape.current.holding) {
				const newLabelState = [...newLabelPoint, _shape.current.holding].sort(({ index: a }, { index: b }) => a - b);
				const isSame = isEqual(_prevShape.current.coordinate, _shape.current.holding.coordinate);
				_setLabelState(newLabelState, !isSame, _shape.current.depth === 1 ? 'movePoint' : 'move');
				drawAll();
			}

			if (!_shape.current.holding && _drawMove.current.shape) setFocusLabel({ ..._drawMove.current.shape, coorIdx: _shape.current.coorIdx });

			_shape.current.holding = null;
			_prevShape.current = null;
			_drawMove.current = { shape: null, coord: [] };
			_mouse.current = { ..._mouse.current, isDown: false };
		}

		if (e.type === 'mouseout') {
			// setMouseCursor();

			stage.clearCanvasDraw();

			// 잡고 있는 도형 놓기 + 좌표 최신화
			if (_shape.current.holding) {
				const findData = labelPoint.find((item) => item.index === _shape.current.holding.index);
				const newHolding = findData ? { ...findData, coordinate: _shape.current.holding.coordinate } : _shape.current.holding;
				const sortLabel = [...labelPoint, newHolding].sort(({ index: a }, { index: b }) => a - b);

				// const pointIndex = sortLabel.findIndex((item) => item.index === newHolding.index);
				// labelPoint[pointIndex] = newHolding;

				_setLabelState(sortLabel);

				_drawDot.current = { shape: null, coord: [] };
				_mouse.current = { x: -1, y: -1, isDown: false, isSingle: false, isDouble: false };
				_shape.current = { ..._shape.current, edgeIdx: -1, holding: null };
			}

			// 새로운 도형 그리다가 이탈시 레이어 추가
			if (_drawMove.current.shape) {
				if (
					_toolType.current === 'box' ||
					_toolType.current === 'pencil' ||
					_toolType.current === 'auto' ||
					_toolType.current === 'self' ||
					_toolType.current === 'erase'
				) {
					const shapeType = stage.findShapes(_toolType.current);
					const { newDrawMove, newLabelPoint, newShape } = await shapeType.mouseUp({
						stage: stage,
						drawMove: _drawMove.current,
						labelPoint,
						shape: _shape.current,
						shapeOpacity: _shapeOpacity.current,
						shapeFill: _shapeFill.current,
						shapeText: _shapeText.current
					});

					_drawMove.current = newDrawMove;
					_shape.current = newShape;

					if (_toolType.current === 'auto' && _drawMove.current.shape) return;

					if (_toolType.current === 'erase' && newLabelPoint.length !== labelPoint.length) {
						_setLabelState(newLabelPoint, true, 'del');
					}

					if (newLabelPoint.length) {
						_setLabelState(
							newLabelPoint.map((point) => {
								const returnPoint = point;

								let layerOpen = true;
								if (point.output_detail_type === 0 || point.output_detail_type === 1) {
									if (point.detail_infos.some((item) => item.isCheck)) layerOpen = false;
								}

								if (point.output_detail_type === 2 || point.output_detail_type === 3) {
									if (point.output_detail_value !== '' && point.output_detail_value !== null) layerOpen = false;
								}

								return { ...returnPoint, layerOpen };
							}),
							!!_drawMove.current.coord.length && _toolType.current !== 'auto',
							_toolType.current
						);
					}
				}
			}

			if (_drawDot.current.shape) {
				_finishDrawing();
				return;
			}

			_drawMove.current = { shape: null, coord: [] };
			_mouse.current = { x: -1, y: -1, isDown: false, isSingle: false, isDouble: false };
			_shape.current = { ..._shape.current, edgeIdx: -1, holding: null };

			drawAll();
		}
	};

	/**
	 * @description 캔버스에 그리는 작업
	 * @param type 마우스 이벤트
	 */
	const drawAll = (label = []) => {
		stage.clearCanvas();

		const labelPoint = _labelData.current ? _labelData.current.points : [];
		const drawLabel = label.length ? label : labelPoint;

		if (!_labelData.current?.scale) return;

		drawLabel.forEach((element) => {
			if (element.label_state !== 1) {
				const shapeType = stage.findShapes(element.type);
				shapeType.draw({
					stage: stage,
					shape: element,
					shapeOpacity: _shapeOpacity.current,
					shapeFill: _shapeFill.current,
					shapeText: _shapeText.current,
					..._shape.current,
					isDraw: true,
					mouse: _mouse.current
				});
			}
		});
	};

	/**
	 * @description 배경이 칠해져있는지 확인 -> 칠해진 상태로 도형 그리면 배경 레이어 삭제
	 */
	const checkBackground = () => {
		_drawMove.current = { shape: null, coord: [] };
		_drawDot.current = { shape: null, coord: [] };

		const pointLength = _labelData.current.points.length;
		_labelData.current.points = [..._labelData.current.points.slice(0, pointLength - 1)];
		_setLabelState([..._labelData.current.points.slice(0, pointLength - 1)], true, 'del');
		stage.clearCanvasOrigin();
	};

	/**
	 * @description 새로운 도형 그리기
	 * @param e event
	 */
	const drawNewShape = async (offsetX, offsetY, labelPoint, isUnion = false) => {
		const shapeInfo = {
			index: labelPoint.length ? (isUnion ? _focusLabel.current.index : labelPoint[labelPoint.length - 1].index + 1) : 0,
			type: _toolType.current,
			value: isUnion ? _focusLabel.current.value : '',
			label_state: 0,
			color: isUnion ? _focusLabel.current.color : changeOpacity(BASIC_COLOR, _shapeOpacity.current),
			isFocus: false,
			user_name: '',
			user_no: -1,
			user_id: ''
		};

		const shapeType = stage.findShapes(_toolType.current);
		const {
			newDrawMove,
			newDrawDot,
			newShape,
			newLabelPoint = [],
			isFinish = false
		} = await shapeType.drawNewShape({
			stage: stage,
			offsetX,
			offsetY,
			labelPoint,
			drawMove: _drawMove.current,
			drawDot: _drawDot.current,
			shape: _shape.current,
			shapeOpacity: _shapeOpacity.current,
			shapeFill: _shapeFill.current,
			shapeText: _shapeText.current,
			isUnion,
			focusLabel: _focusLabel.current,
			shapeInfo,
			labelData: { ..._labelData.current, ..._imageData.current }
		});

		// 순서 중요
		if (newLabelPoint.length) drawAll(newLabelPoint);
		if (newDrawMove) _drawMove.current = newDrawMove;
		if (newDrawDot) _drawDot.current = newDrawDot;
		if (_toolType.current === 'background') {
			_finishDrawing();
			return;
		}

		_shape.current = newShape;
		_mouse.current = { ..._mouse.current, isSingle: true };

		if (isFinish) _finishDrawing();
	};

	const _setLabelState = (labelPoint, isHistory = false, type = '') => {
		_labelData.current = { ..._labelData.current, points: labelPoint };

		let newHistoryData = historyData;

		if (isHistory) {
			// 히스토리 최신꺼 말고 선택 후, 쌓이면 현재 잡고 있는 히스토리 기준으로 엎어치기
			if (newHistoryData.logs.length && newHistoryData.logIndex !== newHistoryData.logs.length - 1) {
				newHistoryData = { ...newHistoryData, logs: [...newHistoryData.logs.slice(0, newHistoryData.logIndex + 1)] };
			}

			// 히스토리 최대 50개이며, 넘으면 0번째 부터 엎어치기
			if (newHistoryData.logs.length >= 50) {
				newHistoryData = { ...newHistoryData, logs: newHistoryData.logs.slice(1) };
			}

			newHistoryData = {
				...newHistoryData,
				logIndex: newHistoryData.logs.length,
				logs: [
					...newHistoryData.logs,
					{
						width: stage.width,
						height: stage.height,
						type,
						points: labelPoint,
						shapeOpacity: _shapeOpacity.current,
						shapeFill: _shapeFill.current,
						shapeText: _shapeText.current
					}
				]
			};
		}

		setLabelData({ ..._labelData.current });
		if (isHistory) setHistoryData({ ...newHistoryData });
	};

	/**
	 * @description 라인 & 다각형 & 자동추출 그리기 끝내기
	 */
	const _finishDrawing = () => {
		if (!_drawDot.current.shape) return;

		const labelPoint = _labelData.current.points;

		if (_drawDot.current.shape.type === 'background') {
			labelPoint.push(_drawDot.current.shape);
			_setLabelState(labelPoint, true, _drawDot.current.shape.type);
			setFocusLabel({ ..._drawDot.current.shape, coorIdx: _shape.current.coorIdx });
		}

		if (_drawDot.current.coord.length > 1) {
			if (_drawDot.current.shape.isUnion) {
				const currIndex = labelPoint.findIndex((item) => item.index === _drawDot.current.shape.index);
				labelPoint[currIndex] = {
					...labelPoint[currIndex],
					coordinate: _drawDot.current.shape.coordinate,
					...getEdgeCoordinate(_drawDot.current.shape.coordinate.flat())
				};
			} else {
				labelPoint.push(_drawDot.current.shape);
			}

			_setLabelState(labelPoint, true, _drawDot.current.shape.type);
			setFocusLabel({ ..._drawDot.current.shape, coorIdx: _shape.current.coorIdx });
		}

		_drawDot.current = { shape: null, coord: [] };
		stage.clearCanvasDraw();
	};

	// const imageData = imageStore.labelData && imageStore.imageList.find((item) => item.selected_data_id === imageStore.labelData.selected_data_id);

	return (
		<div style={{ position: 'static', height: '800px' }}>
			<div id="addImg" style={{ overflow: 'auto', height: 'inherit' }} />
		</div>
	);
};

export default Field;
