const diff = require('diff')
const chalk = require('chalk')
const stripAnsi = require('strip-ansi')

const terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80

var colwidth = Math.floor((terminalWidth - 6) / 2)

function fit(str, width) {
	var strProcessed = ''
	var center = width/2

	if(stripAnsi(str).length > width) {
		// truncate middle (this is buggy. strip out part of an ANSI escape code and stuff breaks)
		var overflow = str.length - width + 1
		var remove = str.substr( center, overflow )
		strProcessed = str.replace(remove, '…')
	} else {
		// right-pad
		strProcessed = str
		var s = width - stripAnsi(str).length
		for(s; s > 0; s--) strProcessed += ' '
	}
	return strProcessed
}

module.exports = {
	prettyDiff(one, two, { diffType = 'diffChars'}) {

		if(diffType !== 'diffChars' && diffType !== 'diffLines') throw('unsupported diffType!')

		var left = ''
		var right = ''

		function alignLines() {
			while((left.match(/\n/g) || []).length < (right.match(/\n/g) || []).length) left += '\n'
			while((left.match(/\n/g) || []).length > (right.match(/\n/g) || []).length) right += '\n'
		}

		diff[diffType](one, two).forEach(e => {
			if(!e.added && !e.removed) {
				alignLines()

				left += e.value
				right += e.value
			}
			if(e.removed) {
				left += chalk.bold.red(e.value)
			}
			if(e.added) {
				right += chalk.bold.green(e.value)
			}
		})

		alignLines()

		// draw
		var leftLines = left.split('\n')
		var rightLines = right.split('\n')

		for(var i = 0; i < leftLines.length; i++) {
			console.log(fit(leftLines[i], colwidth) + '  '+fit(rightLines[i], colwidth))
		}
	}
}