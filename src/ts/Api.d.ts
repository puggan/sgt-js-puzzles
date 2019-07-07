interface GameJson
{
	id: string;
	name: string;
	seed: string;
	settings: any;
	state: any;
}

interface GameSettingsSize
{
	columns: number;
	rows:number;
}

interface GameSettingsDifficulty extends GameSettingsSize
{
	difficulty: string;
}

interface SinglesJson extends GameJson
{
	settings: GameSettingsDifficulty;
	state: number[][];
}
