/// <reference path="./Api.d.ts" />

interface PointXY {
	x: number;
	y: number;
}

interface Direction extends PointXY {
	dir: 0x1 | 0x4 | 0x10 | 0x40;
	reverse: 0x1 | 0x4 | 0x10 | 0x40;
}

interface Tents {
	fetched: TentsJson;
	swap: () => void;
}

interface MouseEvent {
	readonly layerX: number;
	readonly layerY: number;
}

interface Window {
	tents: Tents;
}

declare var tents: Tents;
