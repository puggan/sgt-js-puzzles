interface GameJson {
	id: string;
	name: string;
	seed: string;
	settings: any;
	state: any;
}

interface GameSettingsSize {
	columns: number;
	rows: number;
}

interface GameSettingsDifficulty extends GameSettingsSize {
	difficulty: string;
}

interface GameGrid {
	columns: number[];
	rows: number[];
	grid: number[][];
}

interface SinglesJson extends GameJson {
	settings: GameSettingsDifficulty;
	state: number[][];
}

interface TentsJson extends GameJson {
	settings: GameSettingsDifficulty;
	state: GameGrid;
}
