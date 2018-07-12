const diff = require(`diff`)
const chalk = require(`chalk`)
const stripAnsi = require(`strip-ansi`)

let terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80
let colwidth
const bgColor = chalk.bgRgb(15, 15, 15)

function updateColWidth(){
	colwidth = Math.floor((terminalWidth) / 2)
}

updateColWidth()

function repeatChar(char, times) {
	let ret = ''
	while(--times >= 0) ret += char
	return ret
}

const leftPad = (str, width) => repeatChar(' ', width - stripAnsi(str).length) + str
const rightPad = (str, width) => str + repeatChar(' ', width - stripAnsi(str).length)

class Pair {
	constructor(left, right) {
		this.left = left
		this.right = right
	}
	align() {
		let misalignmentDelta = this.left.outputLines.length - this.right.outputLines.length
		if(misalignmentDelta > 0) {
			this.right.padLines(misalignmentDelta)
		}
		if(misalignmentDelta < 0) {
			this.left.padLines(-misalignmentDelta)
		}
	}
	padLines(n) {
		this.left.padLines(n)
		this.right.padLines(n)
	}
	drawLines() {
		this.left.drawLine()
		this.right.drawLine()
	}
	combine() {
		// this.drawLines()

		if(this.left.sanctioned && this.left.sanctioned.length > 0 && !this.left.sanctioned[this.left.lineLength]) this.left.ellipses()
		if(this.right.sanctioned && this.right.sanctioned.length > 0 && !this.right.sanctioned[this.right.lineLength]) this.right.ellipses()

		this.align()
		let output = []
		for(let i = 0; i < this.left.outputLines.length; i++) {
			output.push(this.left.outputLines[i] + this.right.outputLines[i])
		}
		return output.join('\n')
	}
}

class Side {
	constructor(args) {
		Object.assign(this, Object.assign({
			currentSourceLine: '',
			outputLines: []
		}, args))
		this.gutterWidth = 0
		this.wrapWidth = colwidth
	}
	ellipses() {
		this.outputLines.push(bgColor( repeatChar(' ', this.gutterWidth) + rightPad(leftPad('...', this.wrapWidth/2 + 1), this.wrapWidth)))
	}
	padLines(number) {
		while(number-- > 0) this.outputLines.push(bgColor(repeatChar(' ', colwidth)))
	}
	drawLine() {

		let sourceLine = this.currentSourceLine
		let emptyLine = (sourceLine.length === 0)
		let outputLine = ''

		while(stripAnsi(sourceLine).length > 0 || emptyLine === true) {

			emptyLine = false
			let ansiDifference = (sourceLine.length - stripAnsi(sourceLine).length) / 2

			outputLine += bgColor(rightPad(sourceLine.slice(0, this.wrapWidth + ansiDifference), this.wrapWidth))
			this.outputLines.push(outputLine)

			sourceLine = sourceLine.slice(this.wrapWidth + ansiDifference)
			outputLine = ''

		}
	}
}

class SideLines extends Side {
	constructor(args) {
		super()
		Object.assign(this, Object.assign({
			lineLength: 0,
			currentLineNumber: 0,
			changedLineColor: chalk.bgRgb(70, 70, 70),
			changedLineNumberColor: chalk.bgRgb(50, 50, 50),
			sanctioned: []
		}, args))
		this.lineNumberWidth = String(this.lineLength).length
		this.gutterWidth = this.lineNumberWidth + 4
		this.wrapWidth = colwidth - this.gutterWidth
	}
	drawLine(changed = false) {

		if(this.sanctioned.length > 0) {
			if(!this.sanctioned[this.currentLineNumber]) return

			if(this.sanctioned[this.currentLineNumber] && !this.sanctioned[this.currentLineNumber-1]) {
				this.ellipses()
			}
		}

		let sourceLine = this.currentSourceLine
		let emptyLine = (sourceLine.length === 0)
		let lineNumber = this.currentLineNumber > 0 ? this.currentLineNumber : ''

		let lineNumberBackground = lineNumber ? (changed ? this.changedLineNumberColor : bgColor) : bgColor
		let lineBackground = lineNumber ? (changed ? this.changedLineColor : chalk.bgRgb(25, 25, 25)) : bgColor
		let lineColor = changed ? chalk.white : chalk.grey

		let outputLine = lineNumberBackground('  ' + leftPad(lineColor(String(lineNumber)), this.lineNumberWidth) + '  ')

		while(stripAnsi(sourceLine).length > 0 || emptyLine === true) {

			emptyLine = false
			let ansiDifference = (sourceLine.length - stripAnsi(sourceLine).length) / 2

			outputLine += lineBackground(rightPad(sourceLine.slice(0, this.wrapWidth + ansiDifference), this.wrapWidth))

			this.outputLines.push(outputLine)

			sourceLine = sourceLine.slice(this.wrapWidth + ansiDifference)
			outputLine = lineNumberBackground(repeatChar(' ', this.gutterWidth))

		}

		this.currentLineNumber++
	}
}


module.exports = {
	splitDiffStrings(one, two, { diffType = `diffLines`, lineNumbers = false, lineOffset = 0, truncate = true } = {}) {
		if (/*diffType !== `diffChars` && */diffType !== `diffLines`) {
			throw (`unsupported diffType!`)
		}

		let theDiff = diff[diffType](one, two)

		let pair = new Pair(
			new SideLines({
				lineLength: one.split('\n').length,
				currentLineNumber: -lineOffset,
				changedLineColor: chalk.bgRgb(70, 0, 0),
				changedLineNumberColor: chalk.bgRgb(50, 0, 0)
			}),
			new SideLines({
				lineLength: two.split('\n').length,
				currentLineNumber: -lineOffset,
				changedLineColor: chalk.bgRgb(0, 70, 0),
				changedLineNumberColor: chalk.bgRgb(0, 50, 0),
			})
		)


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

			sanctionOffset(pair.left)
			sanctionOffset(pair.right)

			// "sanctioned" lines to be shown
			for(let e of theDiff) {

				let sourceLines = e.value.split('\n')
				sourceLines.shift()

				if(!e.removed && !e.added) {
					curLineLeft += sourceLines.length
					curLineRight += sourceLines.length
				}
				if(e.removed) {
					if(curLineLeft > 0) sanctionRange(pair.left, curLineLeft, curLineLeft += sourceLines.length )
				}
				if(e.added) {
					if(curLineRight > 0) sanctionRange(pair.right, curLineRight, curLineRight += sourceLines.length )
				}
			}
		}

		for(let e of theDiff) {
			e.value = e.value.replace(/\t/g, '    ')

			let sourceLines = e.value.split('\n')
			let firstChars = sourceLines.shift()

			if(!e.removed && !e.added) {

				pair.align()

				pair.left.currentSourceLine += firstChars
				pair.right.currentSourceLine += firstChars

				for(let sourceLine of sourceLines) {
					pair.left.drawLine()
					pair.right.drawLine()

					pair.left.currentSourceLine = sourceLine
					pair.right.currentSourceLine = sourceLine
				}
			}

			if(e.removed) {
				pair.left.currentSourceLine += firstChars

				for(let sourceLine of sourceLines) {
					pair.left.drawLine(true)
					pair.left.currentSourceLine = sourceLine
				}
			}

			if(e.added) {
				pair.right.currentSourceLine += firstChars

				for(let sourceLine of sourceLines) {
					pair.right.drawLine(true)
					pair.right.currentSourceLine = sourceLine
				}
			}
		}

		return pair.combine()
	},

	splitPatch(patch, options) {
		let parsedPatch = diff.parsePatch(patch)
		let output = []

		if(options.columns){
			terminalWidth = options.columns
			updateColWidth()
		}

		for(let patch of parsedPatch) {

			let pair = new Pair(
				new Side({ currentSourceLine: patch.oldFileName }),
				new Side({ currentSourceLine: patch.newFileName })
			)

			pair.drawLines()
			pair.padLines(1)
			output.push(pair.combine())

			for(let hunk of patch.hunks) {

				let pair = new Pair(
					new SideLines({
						currentLineNumber: hunk.oldStart,
						lineLength: hunk.oldStart + hunk.oldLines,
						changedLineColor: chalk.bgRgb(70, 0, 0),
						changedLineNumberColor: chalk.bgRgb(50, 0, 0)
					}),
					new SideLines({
						currentLineNumber: hunk.newStart,
						lineLength: hunk.newStart + hunk.newLines,
						changedLineColor: chalk.bgRgb(0, 70, 0),
						changedLineNumberColor: chalk.bgRgb(0, 50, 0)
					})
				)

				for( let line of hunk.lines ) {

					let symbol = line[0]
					line = line.slice(1).replace(/\t/g, '    ')

					if(symbol === ' ') {
						pair.align()
						pair.left.currentSourceLine = line
						pair.right.currentSourceLine = line
						pair.drawLines()
					}

					if(symbol === '-') {
						pair.left.currentSourceLine = line
						pair.left.drawLine(true)
					}

					if(symbol === '+') {
						pair.right.currentSourceLine = line
						pair.right.drawLine(true)
					}
				}

				output.push(pair.combine())
				output.push('')

			}

		}

		return output.join('\n')
	}
}
