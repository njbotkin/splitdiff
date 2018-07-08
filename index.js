const diff = require(`diff`)
const chalk = require(`chalk`)
const stripAnsi = require(`strip-ansi`)

const terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80

const colwidth = Math.floor((terminalWidth) / 2)

function repeatChar(char, times) {
	let ret = ''
	while(--times >= 0) ret += char
	return ret
}

const leftPad = (str, width) => repeatChar(' ', width - stripAnsi(str).length) + str
const rightPad = (str, width) => str + repeatChar(' ', width - stripAnsi(str).length)

module.exports = {
	splitdiff(one, two, { diffType = `diffLines`, lineNumbers = false, lineOffset = 0, truncate = true } = {}) {
		if (/*diffType !== `diffChars` && */diffType !== `diffLines`) {
			throw (`unsupported diffType!`)
		}

		let left = {
			lineLength: one.split('\n').length,
			currentLineNumber: -lineOffset,
			currentSourceLine: '',
			outputLines: [],
			changedLineColor: chalk.bgRgb(70, 0, 0),
			changedLineNumberColor: chalk.bgRgb(50, 0, 0),
			sanctioned: []
		}
		left.lineNumberWidth = String(left.lineLength).length
		left.gutterWidth = left.lineNumberWidth + 4
		left.wrapWidth = colwidth - left.gutterWidth

		let right = {
			lineLength: two.split('\n').length,
			currentLineNumber: -lineOffset,
			currentSourceLine: '',
			outputLines: [],
			changedLineColor: chalk.bgRgb(0, 70, 0),
			changedLineNumberColor: chalk.bgRgb(0, 50, 0),
			sanctioned: []
		}
		right.lineNumberWidth = String(right.lineLength).length
		right.gutterWidth = right.lineNumberWidth + 4
		right.wrapWidth = colwidth - right.gutterWidth

		let bgColor = chalk.bgRgb(15, 15, 15)

		function drawLine(side, changed = false) {

			side.currentLineNumber++

			if(truncate) {
				if(!side.sanctioned[side.currentLineNumber]) return

				if(side.sanctioned[side.currentLineNumber] && !side.sanctioned[side.currentLineNumber-1]) {
					side.outputLines.push(bgColor( repeatChar(' ', side.gutterWidth) + rightPad(leftPad('...', side.wrapWidth/2 + 1), side.wrapWidth)))
				}
			}

			let sourceLine = side.currentSourceLine
			let emptyLine = (sourceLine.length === 0)
			let lineNumber = side.currentLineNumber > 0 ? side.currentLineNumber : ''

			let lineNumberBackground = lineNumber ? (changed ? side.changedLineNumberColor : bgColor) : bgColor
			let lineBackground = lineNumber ? (changed ? side.changedLineColor : chalk.bgRgb(25, 25, 25)) : bgColor
			let lineColor = changed ? chalk.white : chalk.grey

			let outputLine = lineNumberBackground('  ' + leftPad(lineColor(String(lineNumber)), side.lineNumberWidth) + '  ')

			while(stripAnsi(sourceLine).length > 0 || emptyLine === true) {

				emptyLine = false
				let ansiDifference = (sourceLine.length - stripAnsi(sourceLine).length) / 2

				outputLine += lineBackground(rightPad(sourceLine.slice(0, side.wrapWidth + ansiDifference), side.wrapWidth))

				side.outputLines.push(outputLine)

				sourceLine = sourceLine.slice(side.wrapWidth + ansiDifference)
				outputLine = lineNumberBackground(repeatChar(' ', side.gutterWidth))

			}
		}

		function padLines(side, number) {
			while(number-- > 0) side.outputLines.push(bgColor(repeatChar(' ', colwidth)))
		}

		let theDiff = diff[diffType](one, two)

		if(truncate) {
			let curLineLeft = -lineOffset
			let curLineRight = -lineOffset

			function sanctionRange(side, start, end) {
				start = Math.max(-lineOffset, start - 4)
				end = Math.min(end + 4, side.lineLength)

				while(start <= end) side.sanctioned[start++] = true
			}

			function sanctionOffset(side) {
				let line = -lineOffset
				while(line < 0) side.sanctioned[line++] = true
			}

			sanctionOffset(left)
			sanctionOffset(right)

			// "sanctioned" lines to be shown
			for(let e of theDiff) {

				let sourceLines = e.value.split('\n')
				sourceLines.shift()

				if(!e.removed && !e.added) {
					curLineLeft += sourceLines.length
					curLineRight += sourceLines.length
				}
				if(e.removed) {
					if(curLineLeft > 0) sanctionRange(left, curLineLeft, curLineLeft += sourceLines.length )
				}
				if(e.added) {
					if(curLineRight > 0) sanctionRange(right, curLineRight, curLineRight += sourceLines.length )
				}
			}
		}

		for(let e of theDiff) {
			e.value = e.value.replace(/\t/g, '    ')

			let sourceLines = e.value.split('\n')
			let firstChars = sourceLines.shift()

			if(!e.removed && !e.added) {
				let misalignmentDelta = left.outputLines.length - right.outputLines.length
				if(misalignmentDelta > 0) {
					padLines(right, misalignmentDelta)
				}
				if(misalignmentDelta < 0) {
					padLines(left, -misalignmentDelta)
				}

				left.currentSourceLine += firstChars
				right.currentSourceLine += firstChars

				for(let sourceLine of sourceLines) {
					drawLine(left)
					drawLine(right)

					left.currentSourceLine = sourceLine
					right.currentSourceLine = sourceLine
				}
			}

			if(e.removed) {
				left.currentSourceLine += firstChars

				for(let sourceLine of sourceLines) {
					drawLine(left, true)
					left.currentSourceLine = sourceLine
				}
			}

			if(e.added) {
				right.currentSourceLine += firstChars

				for(let sourceLine of sourceLines) {
					drawLine(right, true)
					right.currentSourceLine = sourceLine
				}
			}
		}
		drawLine(left)
		drawLine(right)

		let output = []

		for(let i = 0; i < left.outputLines.length; i++) {
			output.push(left.outputLines[i] + right.outputLines[i])
		}

		return output.join('\n')

	},
}
