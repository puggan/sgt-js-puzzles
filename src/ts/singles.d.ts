/// <reference path="./Api.d.ts" />

interface Singles
{
	fetched: SinglesJson;
	swap: () => void;
}

interface Window
{
	signless: Singles;
}
declare var signless: Singles;
