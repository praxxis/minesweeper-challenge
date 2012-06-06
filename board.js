(function(global, $) {

/**
 * @param container jquery
 * @param game Minesweeper
 * @constructor
 */
function BoardController(container, game) {
	this.game = game;

	this.$container = container;

	this.$table = null;

	this.game.bind('game:start', $.proxy(this.game_started, this));
	this.game.bind('game:end', $.proxy(this.game_end, this));

	this.game.bind('game:cell:explode', $.proxy(this.explode, this));
	this.game.bind('game:cell:show', $.proxy(this.update_cell, this));
	this.game.bind('game:cell:flag', $.proxy(this.update_cell, this));
	
	var self = this;
	
	$(function () {
	
		$('#game_start').click(function () {
			self.start($('#width').val(), $('#height').val(), $('#mines').val());

			$('#controls').show();

			return false;
		})

		$('#game_save').click(function () {
			var state = self.export();

			$('#game_save_output').val(state);

			return false;
		})

		$('#game_load').click(function () {
			var state = $('#game_load_input').val();

			self.import(state);

			return false;
		})

		$('#game_validate').click($.proxy(self.validate, self));
		$('#game_cheat').click($.proxy(self.cheat, self));	
		
	});
}

BoardController.prototype = {
	reset_board: function () {
		this.$container.empty();
		
		$('#game_board_controls').hide();
		
		$('#game_win_message').hide();	
		$('#game_lose_message').hide();
	},
	
	start: function (width, height, mines) {
		this.game.init(width, height, mines);
	},

	game_started: function () {
		this.reset_board();

		this.build_table();

		this.$container.append(this.$table);

		$('#game_board_controls').show();		
	},

	game_end: function (event) {
		if (event['outcome'] == 'win') {
			$('#game_win_message').show();
		} else if (event['outcome'] == 'lose') {

			// show the position of mines
			var mines = this.game.mines;
			for (var i in mines) {
				this.explode(mines[i]);
			}

			$('#game_lose_message').show();
		}
	},

	build_table: function () {

		var width = this.game.width;
		var height = this.game.height;

		this.$table = $('<table id="game_board" cellpadding="0" cellspacing="0"></table>')
						.on('mousedown', 'td', $.proxy(this.click, this))
						.on('contextmenu', false); // don't show a context menu on right clicks

		for (var y = 0; y < height; y++) {
			var tr = $('<tr></tr>');

			for (var x = 0; x < width; x++) {
					var td = $('<td></td>')
								.html(this.symbol_from_cell(this.game.cell(x, y)));

				tr.append(td);
			}

			this.$table.append(tr);
		}
	},

	symbol_from_cell: function (cell) {
		if (cell.flagged) {
			return 'f';
		} else if (cell.visible) {
			return '&nbsp;';
		}

		return 'o';
	},

	click: function (event) {
		// work out the td that we clicked on, which gives us 
		// the x,y coordinate in the game board
		var x = event.target.cellIndex;
		var y = $(event.target).parent('tr').get(0).rowIndex;

		if (event.which == 1) {
			this.game.show(x, y);
		} else if (event.which == 3) {
			this.game.flag(x, y);
		}

		return false;
	},

	get_cell: function (x, y) {
		var table_dom = this.$table.get(0);

		var row = table_dom.rows[y];
		var cell = row.cells[x];

		return $(cell);
	},

	update_cell: function (coords) {
		var cell = this.get_cell(coords['x'], coords['y']);

		cell.html(this.symbol_from_cell(this.game.cell(coords['x'], coords['y'])));
	},

	explode: function (coords) {
		var cell = this.get_cell(coords['x'], coords['y']);

		cell.text('x');
	},

	validate: function () {
		this.game.validate_flags();
	},

	cheat: function () {
		this.game.flag_mines();
	},

	export: function () {
		return JSON.stringify(this.game.export());
	},

	import: function (exported) {
		try {
			var state = JSON.parse(exported);
		} catch(e) {
			return false;
		}

		this.game.import(state);
	}
}

global['BoardController'] = BoardController;

})(this, jQuery);
