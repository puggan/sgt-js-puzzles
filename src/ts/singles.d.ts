/// <reference path="./Api.d.ts" />

interface Singles
{
	fetched: SinglesJson;
	swap: () => void;
}

interface Window
{
	signles: Singles;
}
declare var signles: Singles;
