(function(global) {

/**
 * Quick and dirty pub/sub system
 * @constructor
 */
function PubSubMixin() {}
PubSubMixin.prototype = {
	/**
	 * @param event string
	 * @param callback callable
	 */
	bind: function (event, callback) {
		this._events = this._events || {};
		this._events[event] = this._events[event] || [];
		this._events[event].push(callback);
	},

	/**
	 * @param event string
	 * @return {Boolean}
	 */
	trigger: function (event /*, arguments */) {
		this._events = this._events || {};

		if (!(event in this._events)) {
			return false;
		}

		for (var i = 0; i < this._events[event].length; i++) {
			this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
		}

		return true;
	}
}

/**
 * @param to object
 */
PubSubMixin.mixin = function (to) {
	for (var prop in {'bind': true, 'trigger': true}) {
		to.prototype[prop] = PubSubMixin.prototype[prop];
	}

}

/**
 * @param min int
 * @param max int
 * @return {Number}
 */
function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param x int
 * @param y int
 * @constructor
 */
function Cell(x, y) {
	this.x = x;
	this.y = y;
	this.visible = false;
	this.mine = false;
	this.flagged = false;
}

/**
 * @constructor
 */
function Game() {
	this.reset();
}

Game.prototype = {
	/**
	 * Start a new game of size width * height, with a specified amount of mines randomly placed
	 * @param width int
	 * @param height int
	 * @param mines int
	 */
	init: function (width, height, mines) {

		this.reset();

		this.width = parseInt(width);
		this.height = parseInt(height);

		this.build_board();

		var mine_coords = this.random_coords(mines);

		for (var coord in mine_coords) {
			this.mine(mine_coords[coord][0], mine_coords[coord][1])
		}

		this.start_game();
	},

	/**
	 * Set the game state to started and fire off a notice to our observers that the game has started
	 */
	start_game: function () {
		this.state = 'started';

		this.trigger('game:start');
	},

	/**
	 * Build a representation of the game board with width * height cells
	 */
	build_board: function () {
		for (var x = 0; x < this.width; x++) {
			this.board[x] = [];

			for (var y = 0; y < this.height; y++) {
				this.board[x][y] = new Cell(x, y);
			}
		}
	},

	/**
	 * Generate a list of {number} unique random coordinates
	 * @param number int
	 * @return {Array}
	 */
	random_coords: function(number) {

		// make sure we have enough space on the board
		// to generate the number of coordinates we want
		if (this.width * this.height < number) {
			return [];
		}

		var width = this.width - 1;
		var height = this.height - 1;

		var i = 0;
		var coords = {};
		var coord, x, y;

		while (i < number) {
			x = random(0, width);
			y = random(0, height);

			coord = x + '|' + y;

			// skip duplicate coordinates
			if (coord in coords) {
				continue;
			}

			coords[coord] = [x, y];
			i++;
		}

		return coords;
	},

	/**
	 * @param x int
	 * @param y int
	 * @return {Cell}
	 */
	cell: function (x, y) {
		if (this.board[x] === undefined
			|| this.board[x][y] === undefined) {
			return false;
		}

		return this.board[x][y];
	},

	/**
	 * Flag a cell as a mine
	 * @param x int
	 * @param y int
	 * @return {Boolean}
	 */
	mine: function (x, y) {
		var cell = this.cell(x, y);

		if (!cell) {
			return false;
		}

		cell.mine = true;

		this.mines.push(cell);

		return true;
	},

	/**
	 * Show a cell. If the cell is a mine, explode the mine and notify observers. If the cell has already been
	 * shown, do nothing. If the cell hasn't been shown, flag mines adjacent to the cell.
	 * @param x int
	 * @param y int
	 * @return {Boolean}
	 */
	show: function (x, y) {
		if (this.state != 'started') {
			return false;
		}

		var cell = this.cell(x, y);

		if (!cell || cell.visible) {
			return false;
		}

		if (cell.mine) {

			this.trigger('game:cell:explode', {'x': x, 'y': y});

			this.lose_game();

		} else if (!cell.visible) {

			cell.visible = true;

			this.shown.push(cell);

			this.trigger('game:cell:show', {'x': x, 'y': y});

			this.flag_adjacent_mines(x, y);
		}

		return true;
	},

	/**
	 * @param x
	 * @param y
	 */
	flag_adjacent_mines: function(x, y) {
		var adjacent = this.adjacent_cells(x, y);
		var cell, adj_x, adj_y;

		for (var i in adjacent) {
			adj_x = adjacent[i][0];
			adj_y = adjacent[i][1];

			cell = this.cell(adj_x, adj_y);

			if (cell.mine) {
				this.flag(adj_x, adj_y, true);
			}
		}
	},

	/**
	 * Return x,y coordinates of adjacent cells
	 * @param x
	 * @param y
	 * @return {Array}
	 */
	adjacent_cells: function(x, y) {
		var cells = [];

		if (x > 0) {
			// cell is to the right of the far left row
			cells.push([x - 1, y]);

			if (y > 0) {
				// below the top row
				cells.push([x - 1, y - 1]);
				cells.push([x, y - 1]);
			}

			if (y < this.height - 1) {
				// above the bottom row
				cells.push([x - 1, y + 1]);
			}
		}

		if (x < this.width - 1) {
			// cell is to the left of the far right row
			cells.push([x + 1, y]);

			if (y < this.height - 1) {
				// above the bottom row
				cells.push([x, y + 1]);
				cells.push([x + 1, y + 1]);
			}

			if (y > 0) {
				// below the top row
				cells.push([x + 1, y - 1]);
			}
		}

		return cells;
	},

	/**
	 * Flag a cell, indicating that it may be a mine
	 * @param x int
	 * @param y int
	 * @param to boolean Optionally force the flag status, instead of toggling
	 * @return {Boolean}
	 */
	flag: function (x, y, to) {
		if (this.state != 'started') {
			return false;
		}

		var cell = this.cell(x, y);

		// if the cell has been shown there is no use flagging it
		if (!cell || cell.visible) {
			return false;
		}

		var prior = cell.flagged;

		if (to === undefined) {
			cell.flagged = !cell.flagged;
		} else {
			cell.flagged = to;
		}

		// if the flag state has changed fire an notification
		if (cell.flagged != prior) {
			this.trigger('game:cell:flag', {'x': x, 'y': y, 'state': cell.flagged});
		}

		if (cell.flagged) {
			this.flagged[x+'|'+y] = cell;
		} else {
			delete this.flagged[x+'|'+y];
		}

		return true;
	},

	flag_mines: function () {
		for (var i in this.mines) {
			this.flag(this.mines[i].x, this.mines[i].y, true);
		}
	},

	/**
	 * Finish the game by validating whether we've flagged all of the mines on the board
	 * @return {Boolean}
	 */
	validate_flags: function () {

		var count = 0;
		for (var coord in this.flagged) {

			// if we haven't flagged a mine, we lose
			if (!this.flagged[coord].mine) {

				this.lose_game();

				return false;
			}

			count++;
		}

		// if we haven't flagged any cells, or we have flagged too many or too few cells, we lose
		if (!coord || count != this.mines.length) {
			this.lose_game();

			return false;
		}

		this.win_game();

		return true;
	},

	lose_game: function () {
		this.state = 'ended';
		this.trigger('game:end', {outcome: 'lose'});
	},

	win_game: function () {
		this.state = 'ended';
		this.trigger('game:end', {outcome: 'win'});
	},

	/**
	 * Return an object representing the current state of the game board
	 * @return {Object}
	 */
	export: function () {

		var shown = [];
		for (var i in this.shown) {
			shown.push([this.shown[i].x, this.shown[i].y]);
		}

		var mines = [];
		for (var i in this.mines) {
			mines.push([this.mines[i].x, this.mines[i].y]);
		}

		var flagged = [];
		for (var i in this.flagged) {
			flagged.push([this.flagged[i].x, this.flagged[i].y]);
		}

		return {width: this.width,
				height: this.height,
				shown: shown,
				mines: mines,
				flagged: flagged}
	},

	/**
	 * Import an object representing the state of a game board
	 * @param state object
	 */
	import: function(state) {
		this.reset();

		this.width = state.width;
		this.height = state.height;

		this.build_board();

		this.state = 'started';

		for (var i in state.mines) {
			this.mine(state.mines[i][0], state.mines[i][1]);
		}

		for (var i in state.shown) {
			this.show(state.shown[i][0], state.shown[i][1]);
		}

		for (var i in state.flagged) {
			this.flag(state.flagged[i][0], state.flagged[i][1], true);
		}

		this.start_game();
	},

	/**
	 * Reset the board back to its starting state
	 */
	reset:function () {
		this.state = 'preinit';
		this.board = [];
		this.width = null;
		this.height = null;

		this.shown = [];
		this.mines = [];
		this.flagged = {};
	}
};

PubSubMixin.mixin(Game);

if (typeof define === 'function' && define.amd) { // AMD
	define(Game);
} else if (typeof module !== 'undefined' && module.exports) { // Node
	module.exports = Game;
} else { // Browser
	global['Minesweeper'] = Game;
}

})(this);
