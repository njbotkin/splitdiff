const diff = require(`diff`)
const chalk = require(`chalk`)
const stripAnsi = require(`strip-ansi`)

let terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80
let colwidth
const bgColor = chalk.bgRgb(15, 15, 15)
const hunkSizeLimit = 150000

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

const leftPadArray = (arr, width) => arr.map(str => leftPad(str, width))
const rightPadArray = (arr, width) => arr.map(str => rightPad(str, width))

const colorArray = (arr, color) => arr.map(str => color(str))

const wrapString = (str, width) => {
	if(str === ''){ return [''] }

	width = Number(width)
	let output = []

	for(let index = 0; index < str.length; index += width){
		output.push(str.slice(index, index + width))
	}

	return output
}

const outputArray = (arr) => arr.join('\n')

const outputWrappedWithBGRightPad = (str, width) => {
	return outputArray(
		colorArray(
			rightPadArray(
				wrapString(
					str, width
				),
				width
			),
			bgColor
		)
	)
}

const formatHunkOutput = (str, width, color) => {
	return colorArray(
		rightPadArray(
			wrapString(
				str,
				width
			),
			width
		),
		color
	)
}

class Pair {
	constructor(left, right) {
		this.left = left
		this.right = right
		this.too_large = false
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
	addLines(rawLineLeft, rawLineRight) {
		this.left.addLine(rawLineLeft)
		this.right.addLine(rawLineRight)
	}
	combine() {
		if(this.too_large){
			return outputWrappedWithBGRightPad(`
				-- This patch section is too large to be displayed with
				 this utility by default. If you want to show this section,
				 add --show-large-hunks to your command for cli use --
			`.replace(/[\n\t]*/gm, ''), terminalWidth)
		}

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

class DiffOutput {
	constructor(args = {}) {
		Object.assign(this, {
			outputLines: []
		}, args)

		this.gutterWidth = 0
		this.wrapWidth = colwidth
	}
	ellipses() {
		this.outputLines.push(bgColor( repeatChar(' ', this.gutterWidth) + rightPad(leftPad('...', this.wrapWidth/2 + 1), this.wrapWidth)))
	}
	padLines(number) {
		while(number-- > 0) this.outputLines.push(bgColor(repeatChar(' ', colwidth)))
	}
}

class HunkHeader extends DiffOutput {
	addLine(rawLine) {
		Array.prototype.push.apply(
			this.outputLines,
			colorArray(
				rightPadArray(
					wrapString(rawLine, this.wrapWidth),
					this.wrapWidth
				),
				bgColor
			)
		)
	}
}

class HunkContent extends DiffOutput {
	constructor(args = {}) {
		super(args)
		Object.assign(this, {
			lineNumbers: true,
			lineLength: 0,
			currentLineNumber: 0,
			changedLineColor: chalk.bgRgb(70, 70, 70),
			changedLineNumberColor: chalk.bgRgb(50, 50, 50),
			sanctioned: []
		}, args)

		if(this.lineNumbers){
			this.lineNumberWidth = String(this.lineLength).length
			this.gutterWidth = this.lineNumberWidth + 4
			this.wrapWidth = colwidth - this.gutterWidth
		}
	}
	addGutterToLines(lines, changed = false){
		const gutterColor = changed ? chalk.white : chalk.grey
		const gutterBackground = this.currentLineNumber ? (changed ? this.changedLineNumberColor : bgColor) : bgColor

		const gutter = [
			gutterBackground('  ' + leftPad(gutterColor(String(this.currentLineNumber)), this.lineNumberWidth) + '  '),
			gutterBackground(repeatChar(' ', this.gutterWidth))
		]

		return lines.map((line, i) => `${gutter[i === 0 ? 0 : 1]}${line}`)
	}
	addLine(rawLine, changed = false) {
		if(this.sanctioned.length > 0) {
			if(!this.sanctioned[this.currentLineNumber]) return

			if(this.sanctioned[this.currentLineNumber] && !this.sanctioned[this.currentLineNumber-1]) {
				this.ellipses()
			}
		}

		// figure out what color we'll be using for the background
		const lineBackground = this.currentLineNumber ? (changed ? this.changedLineColor : chalk.bgRgb(25, 25, 25)) : bgColor

		// get the new lines from rawLine
		const lines = formatHunkOutput(rawLine, this.wrapWidth, lineBackground)

		// add our parsed lines to the entire output stored.
		if(this.lineNumbers){
			Array.prototype.push.apply(this.outputLines, this.addGutterToLines(lines, changed))
		} else {
			Array.prototype.push.apply(this.outputLines, lines)
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
			new HunkContent({
				lineLength: one.split('\n').length,
				currentLineNumber: -lineOffset,
				changedLineColor: chalk.bgRgb(70, 0, 0),
				changedLineNumberColor: chalk.bgRgb(50, 0, 0)
			}),
			new HunkContent({
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
				pair.addLines(firstChars, firstChars)

				for(let sourceLine of sourceLines) {
					pair.addLines(sourceLine, sourceLine)
				}
			}

			if(e.removed) {
				pair.left.addLine(firstChars, true)

				for(let sourceLine of sourceLines) {
					pair.left.addLine(sourceLine, true)
				}
			}

			if(e.added) {
				pair.right.addLine(firstChars, true)

				for(let sourceLine of sourceLines) {
					pair.right.addLine(sourceLine, true)
				}
			}
		}

		return pair.combine()
	},

	splitPatch(patch, options = {}) {
		let parsedPatch = diff.parsePatch(patch)
		let output = []

		if(options.columns){
			terminalWidth = options.columns
			updateColWidth()
		}

		for(let patch of parsedPatch) {
			if (!patch.oldFileName || !patch.newFileName) {
				continue
			}
			let pair = new Pair(
				new HunkHeader(),
				new HunkHeader()
			)

			pair.addLines(patch.oldFileName, patch.newFileName)
			pair.padLines(1)
			output.push(pair.combine())

			for(let hunk of patch.hunks) {
				let hunkSize = 0

				let pair = new Pair(
					new HunkContent({
						currentLineNumber: hunk.oldStart,
						lineLength: hunk.oldStart + hunk.oldLines,
						changedLineColor: chalk.bgRgb(70, 0, 0),
						changedLineNumberColor: chalk.bgRgb(50, 0, 0)
					}),
					new HunkContent({
						currentLineNumber: hunk.newStart,
						lineLength: hunk.newStart + hunk.newLines,
						changedLineColor: chalk.bgRgb(0, 70, 0),
						changedLineNumberColor: chalk.bgRgb(0, 50, 0)
					})
				)

				for( let line of hunk.lines ) {
					if(!options.showLargeHunks){
						hunkSize += line.length

						if(hunkSize > hunkSizeLimit){
							pair.too_large = true
							break
						}
					}

					let symbol = line[0]
					line = line.slice(1).replace(/\t/g, '    ')

					if(symbol === ' ') {
						pair.align()
						pair.addLines(line, line)
					}

					if(symbol === '-') {
						pair.left.addLine(line, true)
					}

					if(symbol === '+') {
						pair.right.addLine(line, true)
					}
				}

				output.push(pair.combine())
				output.push('')
			}
		}

		return output.join('\n')
	}
}
