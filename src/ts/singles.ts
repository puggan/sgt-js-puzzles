/// <reference path="./singles.d.ts" />

document.addEventListener("DOMContentLoaded", async () => {
	if (!window.signles) {
		// @ts-ignore
		window.signles = {};
	}

	const grid = document.getElementById("grid");
	const loading = document.getElementById("grid-loading");
	//const options = document.getElementById("options");
	//const button = document.getElementById("option-button");
	//const toolbar = document.getElementById("option-toolbar");
	const bindings = document.getElementById("option-toolbar-bindings");
	const swap = document.getElementById("option-swap");
	const ruleCollition = document.getElementById("rule-collition");
	const ruleCollitionStatus = document.getElementById("rule-collition-status");
	const ruleAdjBlock = document.getElementById("rule-adjblock");
	const ruleConnected = document.getElementById("rule-connected");


	let swaped = false;

	const swaping = () => {
		swaped = !swaped;
		if (swaped) {
			bindings.textContent = "Left: Keep, Right: Remove";
			return;
		}
		bindings.textContent = "Left: Remove, Right: Keep";
	};
	swap.addEventListener("click", swaping);
	window.signles.swap = swaping;

	document.body.addEventListener("keyup", (event: HTMLElementEventMap["keyup"]) => {
		// noinspection JSRedundantSwitchStatement TODO add more keybindings
		switch (event.key) {
			case "s":
				swaping();
				break;
			default:
				console.log("keyup on body, char: " + event.char);
		}
	});

	loading.textContent = "Generating new game.";

	const response: SinglesJson = await (await fetch("https://sgt.sundragon.se/api/singles.php")).json();
	window.signles.fetched = response;

	loading.textContent = "Parsing new game.";

	const refCells: HTMLElement[][] = [];
	const statuses: number[][] = [];

	/**
	 * 0: no Warnings
	 * &1: row-collition
	 * &2: selected-row-collition
	 * &4: col-collition
	 * &8: selected-col-collition
	 * &16: adjblock
	 * &32: disconnected
	 * &64: disconnected-N
	 * &128: disconnected-W
	 * &256: disconnected-S
	 * &512: disconnected-E
	 */
	const warnings: number[][] = [];

	const updateCell = (row_index, col_index) => {
		const cell = refCells[row_index][col_index];
		const status = statuses[row_index][col_index];
		const warning = warnings[row_index][col_index];
		cell.classList.toggle("clear", status === 0 && warning === 0);
		cell.classList.toggle("removed", status === 1);
		cell.classList.toggle("kept", status === 2);
		cell.classList.toggle("collition", (warning & 15) > 0);
		cell.classList.toggle("selected-collition", (warning & 10) > 0);
		cell.classList.toggle("adj-block", (warning & 16) > 0);
		if ((warning & 32) > 0) {
			cell.classList.add("island");
			cell.classList.toggle("island-N", (warning & 64) > 0);
			cell.classList.toggle("island-W", (warning & 128) > 0);
			cell.classList.toggle("island-S", (warning & 256) > 0);
			cell.classList.toggle("island-E", (warning & 512) > 0);
		} else {
			cell.classList.remove("island");
		}
		cell.title = `Status: ${status}, Warning: ${warning} @ ${row_index}x${col_index}`;
	};

	const updateWarnings = () => {
		const oldWarnings: number[][] = [];
		const colNumbers: number[][] = [];
		const rowNumbers: number[][] = [];
		const selectedColNumbers: number[][] = [];
		const selectedRowNumbers: number[][] = [];
		const colCollations: boolean[] = [];
		const rowCollations: boolean[] = [];
		const connected: boolean[][] = [];
		let adjBlock = false;
		let islands = false;

		// TODO: rewrite as non-recursice
		const floodfill = (row_index, col_index) => {
			if (col_index < 0 || row_index < 0) return;
			if (row_index >= connected.length) return;
			if (col_index >= connected[row_index].length) return;
			if (connected[row_index][col_index]) return;
			connected[row_index][col_index] = true;
			floodfill(row_index - 1, col_index);
			floodfill(row_index, col_index - 1);
			floodfill(row_index + 1, col_index);
			floodfill(row_index, col_index + 1);
		};

		//<editor-fold desc="Reset and init arrays">
		let row_index = 0;
		let col_index = 0;
		for (const row of response.state) {
			if (row_index === 0) {
				for (const cell of row) {
					colCollations[col_index] = false;
					colNumbers[col_index] = [0];
					selectedColNumbers[col_index] = [0];
					col_index++;
				}
			}
			connected[row_index] = [];
			oldWarnings[row_index] = [];
			rowCollations[row_index] = false;
			rowNumbers[row_index] = [0];
			selectedRowNumbers[row_index] = [0];
			col_index = 0;
			for (const cell of row) {
				oldWarnings[row_index][col_index] = warnings[row_index][col_index];
				warnings[row_index][col_index] = 0;
				connected[row_index][col_index] = false;
				colNumbers[col_index][row_index + 1] = 0;
				selectedColNumbers[col_index][row_index + 1] = 0;
				rowNumbers[row_index][col_index + 1] = 0;
				selectedRowNumbers[row_index][col_index + 1] = 0;
				col_index++;
			}
			row_index++;
		}
		//</editor-fold>

		// <editor-fold desc="Count">
		row_index = 0;
		for (const row of response.state) {
			col_index = 0;
			for (const cell of row) {
				const status = statuses[row_index][col_index];

				if (status === 1) {
					connected[row_index][col_index] = true;
				}
				if (status === 2) {
					selectedColNumbers[col_index][cell]++;
					selectedRowNumbers[row_index][cell]++;
				}

				if (status === 2 || status === 0) {
					if (colNumbers[col_index][cell]) {
						colCollations[col_index] = true;
					}
					colNumbers[col_index][cell]++;

					if (rowNumbers[row_index][cell]) {
						rowCollations[row_index] = true;
					}
					rowNumbers[row_index][cell]++;
				}

				col_index++;
			}
			row_index++;
		}
		//</editor-fold>

		floodfill(0, 0);
		floodfill(0, 1);

		//<editor-fold desc="Test cells">
		row_index = 0;
		for (const row of response.state) {
			col_index = 0;
			for (const cell of row) {
				//<editor-fold desc="Rule 1 Collition, Flag: 1,2,4,8">
				const status = statuses[row_index][col_index];
				if (status === 1) {
					if (col_index > 0 && statuses[row_index][col_index - 1] === 1) {
						warnings[row_index][col_index] |= 16;
						warnings[row_index][col_index - 1] |= 16;
						adjBlock = true;
					}
					if (row_index > 0 && statuses[row_index - 1][col_index] === 1) {
						warnings[row_index][col_index] |= 16;
						warnings[row_index - 1][col_index] |= 16;
						adjBlock = true;
					}
				}

				if (status === 2 || status === 0) {
					if (status === 2) {
						if (selectedColNumbers[col_index][cell] > 1) {
							warnings[row_index][col_index] += 8;
						}
						if (selectedRowNumbers[row_index][cell] > 1) {
							warnings[row_index][col_index] += 2;
						}
					} else {
						if (selectedColNumbers[col_index][cell] > 0) {
							warnings[row_index][col_index] += 8;
						}
						if (selectedRowNumbers[row_index][cell] > 0) {
							warnings[row_index][col_index] += 2;
						}
					}
					if (colNumbers[col_index][cell] > 1) {
						warnings[row_index][col_index] += 4;
					}
					if (rowNumbers[row_index][cell] > 1) {
						warnings[row_index][col_index] += 1;
					}

					if (!connected[row_index][col_index]) {
						islands = true;
						warnings[row_index][col_index] |= 32;
						if (row_index === 0 || connected[row_index - 1][col_index]) {
							warnings[row_index][col_index] |= 64;
						}
						if (col_index === 0 || connected[row_index][col_index - 1]) {
							warnings[row_index][col_index] |= 128;
						}
						if (row_index + 1 === connected.length || connected[row_index + 1][col_index]) {
							warnings[row_index][col_index] |= 256;
						}
						if (col_index + 1 === connected[row_index].length || connected[row_index][col_index + 1]) {
							warnings[row_index][col_index] |= 512;
						}
					}
				}
				//</editor-fold>

				col_index++;
			}
			row_index++;
		}
		//</editor-fold>

		//<editor-fold desc="Update Rule">
		let noCollitions = 0;
		let haveColltions = 0;
		for (const test of colCollations) {
			if (test) {
				haveColltions++;
			} else {
				noCollitions++;
			}
		}
		for (const test of rowCollations) {
			if (test) {
				haveColltions++;
			} else {
				noCollitions++;
			}
		}
		ruleCollitionStatus.textContent = `(${noCollitions}/${noCollitions + haveColltions})`;
		ruleCollitionStatus.title = `C: ${colCollations.map(b => +!b).join(",")}, R: ${rowCollations.map(b => +!b).join(",")}`;
		ruleCollition.classList.toggle("done", haveColltions === 0);
		ruleAdjBlock.classList.toggle("error", adjBlock);
		ruleConnected.classList.toggle("error", islands);
		document.body.classList.toggle("done", haveColltions === 0 && !adjBlock && !islands);
		//</editor-fold>

		//<editor-fold desc="Update changed cells">
		row_index = 0;
		for (const row of response.state) {
			rowCollations[row_index] = false;
			col_index = 0;
			for (const cell of row) {
				if (oldWarnings[row_index][col_index] !== warnings[row_index][col_index]) {
					updateCell(row_index, col_index);
				}
				col_index++;
			}
			row_index++;
		}
		//</editor-fold>

		/*
		console.log('state');
		console.table(response.state);
		console.log('statuses');
		console.table(statuses);
		console.log('warnings');
		console.table(warnings);
		console.log('colNumbers');
		console.table(colNumbers);
		console.log('rowNumbers');
		console.table(rowNumbers);
		 */
	};

	const keepToggle = (row_index, col_index) => {
		switch (statuses[row_index][col_index]) {
			case 0:
				statuses[row_index][col_index] = 2;
				break;
			case 1:
			case 2:
				statuses[row_index][col_index]--;
		}
		updateWarnings();
		return updateCell(row_index, col_index);
	};
	const removeToggle = (row_index, col_index) => {
		switch (statuses[row_index][col_index]) {
			case 0:
			case 1:
				statuses[row_index][col_index]++;
				break;
			case 2:
				statuses[row_index][col_index] = 0;
		}
		updateWarnings();
		return updateCell(row_index, col_index);
	};

	const cellMouseUpEvent = (row_index, col_index) => (event: HTMLElementEventMap["mouseup"]) => {
		if (event.button) {
			if (swaped) {
				return removeToggle(row_index, col_index);
			}
			return keepToggle(row_index, col_index);
		}
		if (swaped) {
			return keepToggle(row_index, col_index);
		}
		return removeToggle(row_index, col_index);
	};

	let row_index = 0;
	for (const row of response.state) {
		let col_index = 0;
		const refRow = [];
		const statusRow = [];
		const warningRow = [];
		const rowElement = document.createElement("DIV");
		for (const cell of row) {
			const cellElement = document.createElement("DIV");
			cellElement.textContent = "" + cell;
			cellElement.addEventListener("mouseup", cellMouseUpEvent(row_index, col_index));
			cellElement.addEventListener("contextmenu", (event) => event.preventDefault());
			cellElement.classList.add('clear');
			rowElement.append(cellElement);
			refRow.push(cellElement);
			statusRow.push(0);
			warningRow.push(0);
			col_index++;
		}
		grid.append(rowElement);
		refCells.push(refRow);
		statuses.push(statusRow);
		warnings.push(warningRow);
		row_index++;
	}
	updateWarnings();
	grid.classList.remove("loading");
});
