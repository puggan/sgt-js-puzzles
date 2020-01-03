/// <reference path="./tents.d.ts" />

document.addEventListener("DOMContentLoaded", async () =>
{
    const CLEAR = 0;
    const TREE = 1;
    const TENT = 2;
    const NONTENT = 3;
    const LOCKEDNONTENT = 4;
    const LONYERROR = 1;
    const ADJECENTERROR = 2;

    if(!window.tents)
    {
        // @ts-ignore
        window.tents = {};
    }

    const grid = document.getElementById("grid");
    const loading = document.getElementById("grid-loading");
    const bindings = document.getElementById("option-toolbar-bindings");
    const swap = document.getElementById("option-swap");
    const ruleTreePairs = document.getElementById("rule-tree-pairs");
    const ruleTentPairs = document.getElementById("rule-tent-pairs");
    const ruleAdjecent = document.getElementById("rule-adjecent");
    const ruleNumber = document.getElementById("rule-numbers");

    let swaped = false;

    const swaping = () =>
    {
        swaped = !swaped;
        bindings.classList.toggle('swaped', swaped);
        //console.log({swaped, classes: bindings.classList});
    };
    swap.addEventListener("click", swaping);
    window.tents.swap = swaping;

    document.body.addEventListener("keyup", (event: HTMLElementEventMap["keyup"]) =>
    {
        // noinspection JSRedundantSwitchStatement TODO add more keybindings
        switch(event.key)
        {
            case "s":
                swaping();
                break;
            default:
                console.log("keyup on body, char: " + event.char);
        }
    });

    loading.textContent = "Generating new game.";

    const response: TentsJson = await (await fetch("https://sgt.sundragon.se/api/tents.php")).json();
    window.tents.fetched = response;

    loading.textContent = "Parsing new game.";

    const refCells: HTMLElement[][] = [];
    const colCountCells: HTMLElement[] = [];
    const rowCountCells: HTMLElement[] = [];
    const statuses: number[][] = [];

    /** TODO: bellow is for Singles
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

    const updateCell = (rowIndex, colIndex) => {
        const cell = refCells[rowIndex][colIndex];
        const status = statuses[rowIndex][colIndex];
        const warning = warnings[rowIndex][colIndex];
        cell.classList.toggle("clear", status === CLEAR && warning === 0);
        cell.classList.toggle("tent", status === TENT);
        cell.classList.toggle("notent", status === NONTENT);
        cell.classList.toggle("error", warning !== CLEAR);
        cell.classList.toggle("lonly", warning === LONYERROR);
        cell.classList.toggle("adjecent", warning === ADJECENTERROR);
        cell.title = `Status: ${status}, Warning: ${warning} @ ${rowIndex}x${colIndex}`;
    };

    const colCount = (colIndex) => {
        let clear = 0;
        let noTents = 0;
        let tents = 0;
        let trees = 0;
        for(const statusRow of statuses) {
            switch (statusRow[colIndex]) {
                case TENT:
                    tents++;
                    break;
                case CLEAR:
                    clear++;
                    break;
                case NONTENT:
                    noTents++;
                    break;
                case TREE:
                    trees++;
                    break;
            }
        }
        const maxTents = tents + clear;
        return {clear, maxTents, noTents, tents, trees};
    };

    const rowCount = (rowIndex) => {
        let clear = 0;
        let noTents = 0;
        let tents = 0;
        let trees = 0;
        for(const statusColumn of statuses[rowIndex]) {
            switch (statusColumn) {
                case TENT:
                    tents++;
                    break;
                case CLEAR:
                    clear++;
                    break;
                case NONTENT:
                    noTents++;
                    break;
                case TREE:
                    trees++;
                    break;
            }
        }
        const maxTents = tents + clear;
        return {clear, maxTents, noTents, tents, trees};
    };

    const adjecentCount = (rowIndex, colIndex, type) => {
        let orthogonal = 0;
        let diagonal = 0;

        if(statuses[rowIndex][colIndex - 1] === type) {
            orthogonal++;
        }
        if(statuses[rowIndex][colIndex + 1] === type) {
            orthogonal++;
        }
        if (statuses[rowIndex - 1]) {
            if (statuses[rowIndex - 1][colIndex] === type) {
                orthogonal++;
            }
            if (statuses[rowIndex - 1][colIndex - 1] === type) {
                diagonal++;
            }
            if (statuses[rowIndex - 1][colIndex + 1] === type) {
                diagonal++;
            }
        }
        if (statuses[rowIndex + 1]) {
            if (statuses[rowIndex + 1][colIndex] === type) {
                orthogonal++;
            }
            if (statuses[rowIndex + 1][colIndex - 1] === type) {
                diagonal++;
            }
            if (statuses[rowIndex + 1][colIndex + 1] === type) {
                diagonal++;
            }
        }

        return {diagonal, orthogonal};
    };

    const updateWarnings = () => {
        let countErrors = 0;
        let countMaybe = 0;
        let countMaybeMin = 0;
        let countMaybeMax = 0;
        let adjacentError = 0;
        let lonelyTent = 0;
        let lonelyTree = 0;
        let tentList = [] as PointXY[];
        let treeList = [] as PointXY[];

        let colIndex = 0;
        for(const cellNr of response.state.columns) {
            const colCounts = colCount(colIndex);

            const cellError = cellNr < colCounts.tents || cellNr > colCounts.maxTents;
            let cellClass = 'col-count ';
            if(cellError) {
                countErrors++;
                cellClass += 'error';
            } else if(colCounts.clear > 0) {
                countMaybe++;
                if(colCounts.tents == cellNr) {
                    countMaybeMin++;
                    cellClass += 'solved solved-low';
                }
                else if(colCounts.maxTents == cellNr) {
                    countMaybeMax++;
                    cellClass += 'solved solved-max';
                } else {
                    cellClass += 'ok';
                }
            } else {
                cellClass += 'done';
            }
            colCountCells[colIndex].className = cellClass;
            colIndex++;
        }
        let rowIndex = 0;
        for(const cellNr of response.state.rows) {
            const rowCounts = rowCount(rowIndex);

            const cellError = cellNr < rowCounts.tents || cellNr > rowCounts.maxTents;
            let cellClass = 'row-count ';
            if(cellError) {
                countErrors++;
                cellClass += 'error';
            } else if(rowCounts.tents < rowCounts.maxTents) {
                countMaybe++;
                if(rowCounts.tents == cellNr) {
                    countMaybeMin++;
                    cellClass += 'solved solved-low';
                }
                else if(rowCounts.maxTents == cellNr) {
                    countMaybeMax++;
                    cellClass += 'solved solved-max';
                } else {
                    cellClass += 'ok';
                }
            } else {
                cellClass += 'done';
            }
            rowCountCells[rowIndex].className = cellClass;
            rowIndex++;
        }

        rowIndex = 0;
        for(const statusRow of statuses) {
            colIndex = 0;
            for(const cell of statusRow) {
                const before = warnings[rowIndex][colIndex];
                warnings[rowIndex][colIndex] = CLEAR;
                switch (cell) {
                    case TREE:
                        treeList.push({x: colIndex, y: rowIndex});
                        const tentCount = adjecentCount(rowIndex, colIndex, TENT);
                        if(tentCount.orthogonal < 1) {
                            const clearCount = adjecentCount(rowIndex, colIndex, CLEAR);
                            if(clearCount.orthogonal < 1) {
                                lonelyTree++;
                                warnings[rowIndex][colIndex] = LONYERROR;
                            }
                        }
                        break;

                    case TENT:
                        tentList.push({x: colIndex, y: rowIndex});
                        const adjecentTentCount = adjecentCount(rowIndex, colIndex, TENT);
                        if(adjecentTentCount.orthogonal > 0 || adjecentTentCount.diagonal > 0) {
                            warnings[rowIndex][colIndex] = ADJECENTERROR;
                            adjacentError++;
                        } else {
                            const treeCount = adjecentCount(rowIndex, colIndex, TREE);
                            if(treeCount.orthogonal < 1) {
                                lonelyTent++;
                                warnings[rowIndex][colIndex] = LONYERROR;
                            }
                        }
                        break;
                }
                if(before !== warnings[rowIndex][colIndex]) {
                    updateCell(rowIndex, colIndex);
                }
                colIndex++;
            }
            rowIndex++;
        }

        ruleTreePairs.classList.toggle('error', lonelyTree > 0);
        ruleTentPairs.classList.toggle('error', lonelyTent > 0);
        ruleAdjecent.classList.toggle('error', adjacentError > 0);
        ruleNumber.classList.toggle('error', countErrors > 0);

        let allOk = countMaybe === countMaybeMin && countErrors === 0 && lonelyTent === 0 && lonelyTree === 0 && adjacentError === 0;
        if(allOk) {
            const adjecentDirections = [{x: -1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}, {x: 1, y: 0}];
            let tentIndex;
            let treeIndex;
            let matchedIndex;
            let lastCount = treeList.length * 2 + 1;
            while(treeList.length > 0 && lastCount > treeList.length + tentList.length) {
                lastCount = treeList.length + tentList.length;
                for(tentIndex = tentList.length -1; tentIndex >= 0; tentIndex--) {
                    matchedIndex = -1;
                    for(treeIndex = treeList.length -1; treeIndex >= 0; treeIndex--) {
                        for(const dir of adjecentDirections) {
                            if(treeList[treeIndex].x + dir.x === tentList[tentIndex].x && treeList[treeIndex].y + dir.y === tentList[tentIndex].y) {
                                if(matchedIndex >= 0) {
                                    matchedIndex = -2;
                                    break;
                                }
                                matchedIndex = treeIndex;
                            }
                        }
                        if (matchedIndex < -1) {
                            break;
                        }
                    }
                    if(matchedIndex >= 0) {
                        treeIndex = matchedIndex;
                        console.log('pair', {tent: tentList[tentIndex], tree: treeList[treeIndex], left: treeList.length - 1});
                        treeList.splice(treeIndex, 1);
                        tentList.splice(tentIndex, 1);
                    }
                }
                for(treeIndex = treeList.length -1; treeIndex >= 0; treeIndex--) {
                    matchedIndex = -1;
                    for(tentIndex = tentList.length -1; tentIndex >= 0; tentIndex--) {
                        for(const dir of adjecentDirections) {
                            if(treeList[treeIndex].x + dir.x === tentList[tentIndex].x && treeList[treeIndex].y + dir.y === tentList[tentIndex].y) {
                                if(matchedIndex >= 0) {
                                    matchedIndex = -2;
                                    break;
                                }
                                matchedIndex = tentIndex;
                            }
                        }
                        if (matchedIndex < -1) {
                            break;
                        }
                    }
                    if(matchedIndex >= 0) {
                        tentIndex = matchedIndex;
                        console.log('pair', {tent: tentList[tentIndex], tree: treeList[treeIndex], left: treeList.length - 1});
                        treeList.splice(treeIndex, 1);
                        tentList.splice(tentIndex, 1);
                    }
                }
            }
            if(treeList.length > 0) {
                allOk = false;
            }
        }
        ruleNumber.classList.toggle('done', allOk || countMaybe === 0 && countErrors === 0);
        ruleTreePairs.classList.toggle('done', allOk);
        ruleTentPairs.classList.toggle('done', allOk);
        ruleAdjecent.classList.toggle('done', allOk);
        document.body.classList.toggle("done", allOk);
    };

    const baseToggle = (rowIndex, colIndex) => {
        switch(statuses[rowIndex][colIndex])
        {
            case CLEAR:
                statuses[rowIndex][colIndex] = NONTENT;
                break;
            case NONTENT:
                statuses[rowIndex][colIndex] = TENT;
                break;
            case TENT:
                statuses[rowIndex][colIndex] = CLEAR;
                break;
        }
        updateWarnings();
        return updateCell(rowIndex, colIndex);
    };

    const reverseToggle = (rowIndex, colIndex) => {
        switch(statuses[rowIndex][colIndex])
        {
            case CLEAR:
                statuses[rowIndex][colIndex] = TENT;
                break;
            case TENT:
                statuses[rowIndex][colIndex] = NONTENT;
                break;
            case NONTENT:
                statuses[rowIndex][colIndex] = CLEAR;
                break;
            case TREE:
                return;
        }
        updateWarnings();
        return updateCell(rowIndex, colIndex);
    };

    const tentArea = (rowIndex, colIndex) => {
        if(statuses[rowIndex][colIndex] === CLEAR) {
            statuses[rowIndex][colIndex] = TENT;
            updateCell(rowIndex, colIndex);
        }
        if(statuses[rowIndex][colIndex] != TENT) {
            return;
        }
        for(const y of [rowIndex - 1, rowIndex, rowIndex + 1]) {
            for(const x of [colIndex - 1, colIndex, colIndex + 1]) {
                if(statuses[y] && statuses[y][x] === CLEAR) {
                    statuses[y][x] = NONTENT;
                    updateCell(y, x);
                }
            }
        }
    };

    const cellMouseUpEvent = (rowIndex, colIndex) => (event: HTMLElementEventMap["mouseup"]) => {
        if(event.button)
        {
            if(swaped)
            {
                return reverseToggle(rowIndex, colIndex);
            }
            return baseToggle(rowIndex, colIndex);
        }
        if(swaped)
        {
            return baseToggle(rowIndex, colIndex);
        }
        return reverseToggle(rowIndex, colIndex);
    };

    const colCountMouseUpEvent = (colIndex) => (event: HTMLElementEventMap["mouseup"]) => {
        const expected = response.state.columns[colIndex];
        const colCounts = colCount(colIndex);

        if(colCounts.clear < 1) return;
        if(expected < colCounts.tents) return;
        if(expected > colCounts.maxTents) return;

        let clearsFound = [] as number[];
        let rowIndex = 0;
        for(const statusColumn of statuses) {
            if (statusColumn[colIndex] === CLEAR) {
                clearsFound.push(rowIndex);
            }
            rowIndex++;
        }

        if (colCounts.tents === expected) {
            for (rowIndex of clearsFound) {
                statuses[rowIndex][colIndex] = NONTENT;
            }
        } else if (colCounts.maxTents === expected) {
            for (rowIndex of clearsFound) {
                statuses[rowIndex][colIndex] = TENT;
            }
        } else {
            for (rowIndex of clearsFound) {
                const treeCount = adjecentCount(rowIndex, colIndex, TREE);
                if (treeCount.orthogonal === 0) {
                    statuses[rowIndex][colIndex] = NONTENT;
                }
            }
        }

        for(rowIndex of clearsFound) {
            updateCell(rowIndex, colIndex)
        }
        rowIndex = 0;
        for(const statusColumn of statuses) {
            if (statusColumn[colIndex] === TENT) {
                tentArea(rowIndex, colIndex);
            }
            rowIndex++;
        }
        updateWarnings();
    };

    const rowCountMouseUpEvent = (rowIndex) => (event: HTMLElementEventMap["mouseup"]) => {
        const expected = response.state.rows[rowIndex];
        const rowCounts = rowCount(rowIndex);

        if(rowCounts.clear < 1) return;
        if(expected < rowCounts.tents) return;
        if(expected > rowCounts.maxTents) return;

        let clearsFound = [] as number[];
        let colIndex = 0;
        for(const statusColumn of statuses[rowIndex]) {
            if (statusColumn === CLEAR) {
                clearsFound.push(colIndex);
            }
            colIndex++;
        }

        if (rowCounts.tents === expected) {
            for (colIndex of clearsFound) {
                statuses[rowIndex][colIndex] = NONTENT;
            }
        } else if (rowCounts.maxTents === expected) {
            for (colIndex of clearsFound) {
                statuses[rowIndex][colIndex] = TENT;
            }
        } else {
            for (colIndex of clearsFound) {
                const treeCount = adjecentCount(rowIndex, colIndex, TREE);
                if (treeCount.orthogonal === 0) {
                    statuses[rowIndex][colIndex] = NONTENT;
                }
            }
        }

        for(colIndex of clearsFound) {
            updateCell(rowIndex, colIndex)
        }
        colIndex = 0;
        for(const statusColumn of statuses[rowIndex]) {
            if (statusColumn === TENT) {
                tentArea(rowIndex, colIndex);
            }
            colIndex++;
        }
        updateWarnings();
    };

    const totalCountMouseUpEvent = (event: HTMLElementEventMap["mouseup"]) => {
        let rowIndex = 0;
        for(const statusRow of statuses) {
            let colIndex = 0;
            for (const cell of statusRow) {
                if(cell === CLEAR) {
                    const treeCount = adjecentCount(rowIndex, colIndex, TREE);
                    if (treeCount.orthogonal === 0) {
                        statuses[rowIndex][colIndex] = NONTENT;
                        updateCell(rowIndex, colIndex);
                    }
                } else if (cell === TENT) {
                    tentArea(rowIndex, colIndex);
                }
                colIndex++;
            }
            rowIndex++;
        }
        updateWarnings();
    };

    const preventEvent = (event) => event.preventDefault();

    let rowIndex = 0;
    for(const row of response.state.grid) {
        let colIndex = 0;
        const refRow = [];
        const statusRow = [];
        const warningRow = [];
        const rowElement = document.createElement("DIV");
        for(const cell of row)
        {
            const cellElement = document.createElement("DIV");
            cellElement.addEventListener("mouseup", cellMouseUpEvent(rowIndex, colIndex));
            cellElement.addEventListener("contextmenu", preventEvent);
            cellElement.classList.add(cell ? 'tree' : 'clear');
            rowElement.append(cellElement);
            refRow.push(cellElement);
            statusRow.push(cell ? TREE : CLEAR);
            warningRow.push(0);
            colIndex++;
        }
        const cellElement = document.createElement("DIV");
        cellElement.addEventListener("mouseup", rowCountMouseUpEvent(rowIndex));
        cellElement.classList.add('row-count');
        cellElement.innerText = ''+response.state.rows[rowIndex];
        rowCountCells.push(cellElement);
        rowElement.append(cellElement);

        grid.append(rowElement);
        refCells.push(refRow);
        statuses.push(statusRow);
        warnings.push(warningRow);
        rowIndex++;
    }
    const rowElement = document.createElement("DIV");
    let tentCount = 0;
    let colIndex = 0;
    for(const cell of response.state.columns) {
        tentCount += cell;
        const cellElement = document.createElement("DIV");
        cellElement.addEventListener("mouseup", colCountMouseUpEvent(colIndex));
        cellElement.classList.add('col-count');
        cellElement.innerText = ''+cell;
        colCountCells.push(cellElement);
        rowElement.append(cellElement);
        colIndex++;
    }
    const cellElement = document.createElement("DIV");
    cellElement.addEventListener("mouseup", totalCountMouseUpEvent);
    cellElement.classList.add('fill-count');
    cellElement.textContent = ''+tentCount;
    colCountCells.push(cellElement);
    rowCountCells.push(cellElement);
    rowElement.append(cellElement);
    grid.append(rowElement);
    updateWarnings();

    grid.classList.remove("loading");
});
