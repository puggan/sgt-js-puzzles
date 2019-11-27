/// <reference path="./singles.d.ts" />

document.addEventListener("DOMContentLoaded", async () => {
	const STATUS_UNKNOWN = 0;
	const STATUS_REMOVED = 1;
	const STATUS_KEEP = 2;
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

	const resetButton = document.getElementById('action_reset') as HTMLButtonElement;
	const hintButton = document.getElementById('action_hint') as HTMLButtonElement;
	const gbButton = document.getElementById('action_gb') as HTMLButtonElement;
	const rbButton = document.getElementById('action_rb') as HTMLButtonElement;
	const autoButton = document.getElementById('action_auto') as HTMLButtonElement;

	let status_done = false;
	let status_error = false;

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
		cell.classList.toggle("clear", status === STATUS_UNKNOWN && warning === 0);
		cell.classList.toggle("removed", status === STATUS_REMOVED);
		cell.classList.toggle("kept", status === STATUS_KEEP);
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

				if (status === STATUS_REMOVED) {
					connected[row_index][col_index] = true;
				}
				if (status === STATUS_KEEP) {
					selectedColNumbers[col_index][cell]++;
					selectedRowNumbers[row_index][cell]++;
				}

				if (status === STATUS_KEEP || status === STATUS_UNKNOWN) {
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
				if (status === STATUS_REMOVED) {
					if (col_index > 0 && statuses[row_index][col_index - 1] === STATUS_REMOVED) {
						warnings[row_index][col_index] |= 16;
						warnings[row_index][col_index - 1] |= 16;
						adjBlock = true;
					}
					if (row_index > 0 && statuses[row_index - 1][col_index] === STATUS_REMOVED) {
						warnings[row_index][col_index] |= 16;
						warnings[row_index - 1][col_index] |= 16;
						adjBlock = true;
					}
				}

				if (status === STATUS_KEEP || status === STATUS_UNKNOWN) {
					if (status === STATUS_KEEP) {
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
		status_error = adjBlock || islands;
		status_done = haveColltions === 0 && !status_error;
		document.body.classList.toggle("done", status_done);
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

	const baseToggle = (row_index, col_index) => {
		switch (statuses[row_index][col_index]) {
			case STATUS_UNKNOWN:
				statuses[row_index][col_index] = STATUS_KEEP;
				break;
			case STATUS_REMOVED:
			case STATUS_KEEP:
				statuses[row_index][col_index]--;
		}
		updateWarnings();
		return updateCell(row_index, col_index);
	};

	const reverseToggle = (row_index, col_index) => {
		switch (statuses[row_index][col_index]) {
			case STATUS_UNKNOWN:
			case STATUS_REMOVED:
				statuses[row_index][col_index]++;
				break;
			case STATUS_KEEP:
				statuses[row_index][col_index] = STATUS_UNKNOWN;
		}
		updateWarnings();
		return updateCell(row_index, col_index);
	};

	const cellMouseUpEvent = (row_index, col_index) => (event: HTMLElementEventMap["mouseup"]) => {
		if (event.button) {
			if (swaped) {
				return reverseToggle(row_index, col_index);
			}
			return baseToggle(row_index, col_index);
		}
		if (swaped) {
			return baseToggle(row_index, col_index);
		}
		return reverseToggle(row_index, col_index);
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
			statusRow.push(STATUS_UNKNOWN);
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

	const reset = () => {
		let row_index = 0;
		let col_index = 0;
		for (const row of response.state) {
			for (const cell of row) {
				statuses[row_index][col_index] = STATUS_UNKNOWN;
				col_index++;
			}
			row_index++;
			col_index = 0;
		}
		updateWarnings();
		row_index = 0;
		for (const row of response.state) {
			for (const cell of row) {
				updateCell(row_index, col_index);
				col_index++;
			}
			row_index++;
			col_index = 0;
		}
	};
	resetButton.addEventListener('click', reset);

	hintButton.addEventListener('click', () => {
		console.log('refCells');
		console.table(refCells);

		console.log('statuses');
		console.table(statuses);

		console.log('warnings');
		console.table(warnings);

		/*
		 * www.menneske.no solving methods:
		 * SC: if you circle a cell, any cells in same row/col with same no --> black
		 * SB: if you make a cell black, any cells around it --> white
		 * ST: 3 identical cells in row, centre is white and outer two black.
		 * SP: 2 identical cells with single-cell gap, middle cell is white.
		 * PI: if you have a pair of same number in row/col, any other
		 *      cells of same number must be black.
		 * CC: if you have a black on edge one cell away from corner, cell
		 *       on edge diag. adjacent must be white.
		 * CE: if you have 2 black cells of triangle on edge, third cell must
		 *      be white.
		 * QM: if you have 3 black cells of diagonal square in middle, fourth
		 *      cell must be white.
		 * QC: a corner with 4 identical numbers (or 2 and 2) must have the
		 *      corner cell (and cell diagonal to that) black.
		 * TC: a corner with 3 identical numbers (with the L either way)
		 *      must have the apex of L black, and other two white.
		 * DC: a corner with 2 identical numbers in domino can set a white
		 *      cell along wall.
		 * IP: pair with one-offset-pair force whites by offset pair
		 * MC: any cells diag. adjacent to black cells that would split board
		 *      into separate white regions must be white.
		 * TEP: 3 pairs of dominos parallel to side, can mark 4 white cells
		 *       alongside.
		 * DEP: 2 pairs of dominos parallel to side, can mark 2 white cells.
		 * FI: if you have two sets of double-cells packed together, singles
		 *      in that row/col must be white (qv. PI)
		 * QuM: four identical cells (or 2 and 2) in middle of grid only have
		 *       two possible solutions each.
		 * FDE: doubles one row/column away from edge can force a white cell.
		 * FDM: doubles in centre (next to bits of diag. square) can force a white cell.
		 * MP: two pairs with same number between force number to black.
		 * CnC: if circling a cell leads to impossible board, cell is black.
		 * MC: if we have two possiblilities, can we force a white circle?
		 */
		let row_index = -1;
		let col_index = -1;
		const max_x = signles.fetched.settings.columns - 1;
		const max_y = signles.fetched.settings.rows - 1;

		if (status_done) {
			alert('hints not needed, you already solved it');
			return;
		}

		if (status_error) {
			alert('hints not avaible for invalid game-state, fix your errors first');
			return;
		}

		//<editor-fold desc="SC: Red -> Black">
		// SC: if you circle a cell, any cells in same row/col with same no --> black
		row_index = 0;
		for (const row of response.state) {
			col_index = 0;
			for (const cell of row) {
				if (statuses[row_index][col_index] === STATUS_UNKNOWN) {
					if (warnings[row_index][col_index] & 0xA) {
						if (warnings[row_index][col_index] & 0x2) {
							alert("The " + cell + " in position [" + col_index + ", " + row_index + "] have a row-collition. (SC)");
						} else {
							alert("The " + cell + " in position [" + col_index + ", " + row_index + "] have a column-collition. (SC)");
						}
						return;
					}
				}
				col_index++;
			}
			row_index++;
		}
		//</editor-fold>

		//<editor-fold desc="SB: Green around Black">
		// SB: if you make a cell black, any cells around it --> white
		const cross_neighbors = [{"dx": -1, "dy": 0}, {"dx": 1, "dy": 0}, {"dx": 0, "dy": -1}, {"dx": 0, "dy": 1}];
		row_index = 0;
		for (const row of response.state) {
			col_index = 0;
			for (const cell of row) {
				if (statuses[row_index][col_index] === STATUS_UNKNOWN) {
					for (const neighbor of cross_neighbors) {
						const nx = col_index + neighbor.dx;
						const ny = row_index + neighbor.dy;
						if (statuses[ny] && statuses[ny][nx] === STATUS_REMOVED) {
							alert("The " + cell + " in position [" + nx + ", " + ny + "] have a non-green neighbor. SB");
							return;
						}
					}
				}
				col_index++;
			}
			row_index++;
		}
		//</editor-fold>

		//<editor-fold desc="ST: 3 in a row, SP: almost 3 in a row">
		// ST: 3 identical cells in row, centre is white and outer two black.
		// SP: 2 identical cells with single-cell gap, middle cell is white.
		row_index = 0;
		for (const row of response.state) {
			if (!statuses[row_index + 2]) {
				break;
			}
			col_index = 0;
			for (const cell of row) {
				if (statuses[row_index][col_index] === STATUS_UNKNOWN) {
					const x0 = col_index;
					const x1 = col_index + 1;
					const x2 = col_index + 2;
					const y0 = row_index;
					const y1 = row_index + 1;
					const y2 = row_index + 2;

					if (statuses[y0][x2] === STATUS_UNKNOWN && row[x2] === cell) {
						if (row[x1] === cell) {
							alert("In row " + y0 + " there is three consecutive " + cell + "s. (ST)");
							return;
						} else if (statuses[y0][x1] === STATUS_UNKNOWN && warnings[y0][x1] !== 0) {
							alert("In row " + y0 + " there is a " + row[x1] + " between two " + cell + "s. (SP)");
							return;
						}
					}
					if (statuses[y2] && statuses[y2][x0] === STATUS_UNKNOWN && response.state[y2][x0] === cell) {
						let value = response.state[y1][x0];
						if (value == cell) {
							alert("In column " + x0 + " there is 3 consecutive " + cell + "s. (ST)");
							return;
						} else if (statuses[y1][x0] === STATUS_UNKNOWN && warnings[y1][x0] !== 0) {
							alert("In column " + x0 + " there is a " + value + " between two " + cell + "s. (SP)");
							return;
						}
					}
				}
				col_index++;
			}
			row_index++;
		}
		//</editor-fold>

		//<editor-fold desc="PI: 3 of the same, and 2 is neighbors">
		// PI: if you have a pair of same number in row/col, any other cells of same number must be black.
		row_index = 0;
		for (const row of response.state) {
			const number_count = {};
			const number_adjecent = {};
			col_index = 0;
			for (const cell of row) {
				if (number_count[cell]) {
					number_count[cell]++;
				} else {
					number_count[cell] = 1;
				}
				col_index++;
				if (cell === row[col_index]) {
					number_adjecent[cell] = true;
				}
			}

			for (const number of Object.keys(number_adjecent)) {
				if (number_count[number] < 3) {
					continue;
				}
				col_index = 0;
				for (const cell of row) {
					col_index++;
					if (cell !== +number) {
						continue;
					}
					if (statuses[row_index][col_index - 1] !== STATUS_UNKNOWN) {
						continue;
					}
					if (row[col_index] === cell) {
						continue;
					}
					if (row[col_index - 2] === cell) {
						continue;
					}
					alert('Row ' + row_index + ' has three ' + cell + '. (PI)');
					return;
				}
			}

			row_index++;
		}
		col_index = 0;
		for (const firstcell of response.state[0]) {
			const number_count = {};
			const number_adjecent = {};
			row_index = 0;
			for (const row of response.state) {
				const cell = row[col_index];
				if (number_count[cell]) {
					number_count[cell]++;
				} else {
					number_count[cell] = 1;
				}
				row_index++;
				if (response.state[row_index] && cell === response.state[row_index][col_index]) {
					number_adjecent[cell] = true;
				}
			}

			for (const number of Object.keys(number_adjecent)) {
				if (number_count[number] < 3) {
					continue;
				}
				row_index = 0;
				for (const row of response.state) {
					const cell = row[col_index];
					row_index++;

					if (cell !== +number) {
						continue;
					}
					if (statuses[row_index - 1][col_index] !== STATUS_UNKNOWN) {
						continue;
					}
					if (response.state[row_index][col_index] === cell) {
						continue;
					}
					if (response.state[row_index - 2][col_index] === cell) {
						continue;
					}
					alert('Column ' + col_index + ' has three ' + cell + '. (PI)');
					return;
				}
			}

			col_index++;
		}
		//</editor-fold>

		//<editor-fold desc="CC: Don't cut of a corner">
		// CC: if you have a black on edge one cell away from corner, cell on edge diag. adjacent must be white.
		const corner_neighbors = [
			[{"x": 0, "y": 1}, {"x": 1, "y": 0}],
			[{"x": max_x, "y": 1}, {"x": max_x - 1, "y": 0}],
			[{"x": 0, "y": max_y - 1}, {"x": 1, "y": max_y}],
			[{"x": max_x, "y": max_y - 1}, {"x": max_x - 1, "y": max_y}],
		];
		for (const corner_pair_outer of corner_neighbors) {
			for (const corner_pair of [corner_pair_outer, [corner_pair_outer[1], corner_pair_outer[0]]]) {
				if (statuses[corner_pair[0].y][corner_pair[0].x] === STATUS_REMOVED && statuses[corner_pair[1].y][corner_pair[1].x] === STATUS_UNKNOWN) {
					alert("Avoid cutting of corners. (CC)");
					return;
				}
			}
		}
		//</editor-fold>

		//<editor-fold desc="CC: No triangels on edges">
		// CE: if you have 2 black cells of triangle on edge, third cell must be white.
		const triangle_test = (a, b, c) =>
			(a === STATUS_UNKNOWN && b === STATUS_REMOVED && c === STATUS_REMOVED) ||
			(a === STATUS_REMOVED && b === STATUS_UNKNOWN && c === STATUS_REMOVED) ||
			(a === STATUS_REMOVED && b === STATUS_REMOVED && c === STATUS_UNKNOWN);
		for (row_index = 1; row_index < max_y; row_index++) {
			if (triangle_test(statuses[row_index][1], statuses[row_index - 1][0], statuses[row_index + 1][0])) {
				alert("You can't have an triangle at the west edge. (CE)");
				return;
			}

			if (triangle_test(statuses[row_index][max_x - 1], statuses[row_index - 1][max_x], statuses[row_index + 1][max_x])) {
				alert("You can't have an triangle at the east edge. (CE)");
				return;
			}
		}
		for (col_index = 1; col_index < max_x; col_index++) {
			if (triangle_test(statuses[1][col_index], statuses[0][col_index - 1], statuses[0][col_index + 1])) {
				alert("You can't have an triangle at the north edge. (CE)");
				return;
			}

			if (triangle_test(statuses[max_y - 1][col_index], statuses[max_y][col_index - 1], statuses[max_y][col_index + 1])) {
				alert("You can't have an triangle at the south edge. (CE)");
				return;
			}
		}
		//</editor-fold>

		//<editor-fold desc="QM: ?">
		// QM: if you have 3 black cells of diagonal square in middle, fourth cell must be white.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// QC: a corner with 4 identical numbers (or 2 and 2) must have the corner cell (and cell diagonal to that) black.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// TC: a corner with 3 identical numbers (with the L either way) must have the apex of L black, and other two white.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// DC: a corner with 2 identical numbers in domino can set a white cell along wall.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// IP: pair with one-offset-pair force whites by offset pair
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// MC: any cells diag. adjacent to black cells that would split board into separate white regions must be white.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// TEP: 3 pairs of dominos parallel to side, can mark 4 white cells  alongside.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// DEP: 2 pairs of dominos parallel to side, can mark 2 white cells.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// FI: if you have two sets of double-cells packed together, singles in that row/col must be white (qv. PI)
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// QuM: four identical cells (or 2 and 2) in middle of grid only have  two possible solutions each.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// FDE: doubles one row/column away from edge can force a white cell.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// FDM: doubles in centre (next to bits of diag. square) can force a white cell.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// MP: two pairs with same number between force number to black.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// CnC: if circling a cell leads to impossible board, cell is black.
		//</editor-fold>

		//<editor-fold desc="??: ?">
		// MC: if we have two possiblilities, can we force a white circle?
		//</editor-fold>

		//<editor-fold desc="Loop Templates">
		row_index = 0;
		for (const row of response.state) {
			col_index = 0;
			for (const cell of row) {
				col_index++;
			}
			row_index++;
		}
		col_index = 0;
		for (const firstcell of response.state[0]) {
			row_index = 0;
			for (const row of response.state) {
				row_index++;
			}
			col_index++;
		}
		//</editor-fold>
		alert("No hint avaible");
	});

	const gbFix = () => {
		const found = [];
		let row_index = 0;
		let col_index = 0;
		const cross_neighbors = [{"dx": -1, "dy": 0}, {"dx": 1, "dy": 0}, {"dx": 0, "dy": -1}, {"dx": 0, "dy": 1}];
		for (const row of response.state) {
			for (const cell of row) {
				if (statuses[row_index][col_index] === STATUS_UNKNOWN) {
					for (const neighbor of cross_neighbors) {
						const nx = col_index + neighbor.dx;
						const ny = row_index + neighbor.dy;
						if (statuses[ny] && statuses[ny][nx] === STATUS_REMOVED) {
							found.push({x: col_index, y: row_index});
							break;
						}
					}
				}
				col_index++;
			}
			row_index++;
			col_index = 0;
		}
		if (found.length < 1) {
			return found.length;
		}
		for (const position of found) {
			statuses[position.y][position.x] = STATUS_KEEP;
		}
		updateWarnings();
		for (const position of found) {
			updateCell(position.y, position.x);
		}
		return found.length;
	};
	gbButton.addEventListener('click', () => {
		if (gbFix() < 1) alert('No black-white borders found');
	});

	const rbFix = () => {
		const found = [];
		let row_index = 0;
		let col_index = 0;
		for (const row of response.state) {
			for (const cell of row) {
				if (statuses[row_index][col_index] === STATUS_UNKNOWN) {
					if (warnings[row_index][col_index] & 0xA) {
						found.push({x: col_index, y: row_index});
					}
				}
				col_index++;
			}
			row_index++;
			col_index = 0;
		}
		if (found.length < 1) {
			return found.length;
		}
		for (const position of found) {
			statuses[position.y][position.x] = STATUS_REMOVED;
		}
		updateWarnings();
		for (const position of found) {
			updateCell(position.y, position.x);
		}
		return found.length;
	};
	rbButton.addEventListener('click', () => {
		if (rbFix() < 1) alert('No red cells found');
	});

	const singlesFix = () => {
		const found = [];
		let row_index = 0;
		let col_index = 0;
		for (const row of response.state) {
			for (const cell of row) {
				if (statuses[row_index][col_index] === STATUS_UNKNOWN) {
					if (warnings[row_index][col_index] === 0) {
						found.push({x: col_index, y: row_index});
					}
				}
				col_index++;
			}
			row_index++;
			col_index = 0;
		}
		if (found.length < 1) {
			return found.length;
		}
		for (const position of found) {
			statuses[position.y][position.x] = STATUS_KEEP;
		}
		updateWarnings();
		for (const position of found) {
			updateCell(position.y, position.x);
		}
		return found.length;
	};
	autoButton.addEventListener('click', () => {
		let gb = 1;
		let rb = 1;
		while (gb + rb > 0) {
			rb = rbFix();
			gb = gbFix();
		}
		singlesFix();
	});
});
