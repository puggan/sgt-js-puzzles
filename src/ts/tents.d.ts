/// <reference path="./Api.d.ts" />

interface PointXY {
	x: number;
	y: number;
}

interface Tents
{
	fetched: TentsJson;
	swap: () => void;
}

interface Window
{
	tents: Tents;
}
declare var tents: Tents;
