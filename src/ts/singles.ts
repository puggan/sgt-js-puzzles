/// <reference path="./singles.d.ts" />

document.addEventListener("DOMContentLoaded", async () =>
{
	if(!window.signless)
	{
		// @ts-ignore
		window.signless = {};
	}

	const grid = document.getElementById('grid');
	const loading = document.getElementById('grid-loading');
	const options = document.getElementById('options');
	const button = document.getElementById('option-button');
	const toolbar = document.getElementById('option-toolbar');
	const bindings = document.getElementById('option-toolbar-bindings');
	const swap = document.getElementById('option-swap');

	let swaped = false;

	const swaping = () =>
	{
		swaped = !swaped;
		if(swaped)
		{
			bindings.textContent = "Left: Keep, Right: Remove";
			return;
		}
		bindings.textContent = "Left: Remove, Right: Keep";
	};
	swap.addEventListener('click', swaping);
	window.signless.swap = swaping;

	document.body.addEventListener('keyup', (event) =>
	{
		// noinspection JSRedundantSwitchStatement TODO add more keybindings
		switch(event.key)
		{
			case 's':
				swaping();
				break;
			default:
				console.log('keyup on body, char: ' + event.char);
		}
	});

	loading.textContent = 'Generating new game.';

	const response: SinglesJson = await (await fetch("https://sgt.sundragon.se/api/singles.php")).json();
	window.signless.fetched = response;

	loading.textContent = 'Parsing new game.';

	const refCells = [];

	for(const row of response.state)
	{
		const refRow = [];
		const rowElement = document.createElement('DIV');
		for(const cell of row)
		{
			const cellElement = document.createElement('DIV');
			cellElement.textContent = '' + cell;
			rowElement.append(cellElement);
			refRow.push(cellElement);
		}
		grid.append(rowElement);
		refCells.push(refRow);
	}
	grid.classList.remove('loading');
});
