const diff = require(`diff`)
const chalk = require(`chalk`)
const stripAnsi = require(`strip-ansi`)

const terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80

const colwidth = Math.floor((terminalWidth - 2) / 2)

function leftPad(str, width) {
	let s = width - stripAnsi(str).length
	for (s; s > 1; s--) {
		str = ` ` + str
	}
	return str
}

function fit(str, width) {
	let strProcessed = ``
	const center = width / 2

	str = str.replace(/\t/g, '    ')

	if (stripAnsi(str).length > width) {
		// truncate middle (this is buggy. strip out part of an ANSI escape code and stuff breaks)
		const overflow = stripAnsi(str).length - width + 1
		const remove = str.substr(center, overflow)
		strProcessed = str.replace(remove, `…`)
	} else {
		// right-pad
		strProcessed = str
		let s = width - stripAnsi(str).length
		for (s; s > 0; s--) {
			strProcessed += ` `
		}
	}
	return strProcessed
}

module.exports = {
	splitdiff(one, two, { diffType = `diffChars`, lineNumbers = false, lineOffset = 0, truncate = true } = {}) {
		if (diffType !== `diffChars` && diffType !== `diffLines`) {
			throw (`unsupported diffType!`)
		}
		function alignLines() {
			let lastLine = left.pop()
			while (left.length+1 < right.length) {
				left.push({})
			}
			left.push(lastLine)

			lastLine = right.pop()
			while (left.length > right.length+1) {
				right.push({})
			}
			right.push(lastLine)
		}

		let leftLineNumber = -lineOffset
		let rightLineNumber = -lineOffset

		let left = [{ line: '', number: ++leftLineNumber }]
		let right = [{ line: '', number: ++rightLineNumber }]

		const splitLines = str => str.match(/\n([^\n]*)/g) || []

		let bufferLength = 4
		let leftTruncateBuffer = new Array(bufferLength)
		let rightTruncateBuffer = new Array(bufferLength)

		function pushBufferorLines(line, lineBuffer, lines) {

			if(lineBuffer.length < bufferLength) {
				lines.push(line)
			}
			lineBuffer.push(line)

			if(lineBuffer.length > bufferLength*2) { 
				lineBuffer.splice(0, 1)
			} 
		}

		function emptyBuffer(lineBuffer) {
			let ret = lineBuffer.splice(bufferLength, bufferLength)
			lineBuffer.splice(0)
			return ret
		}


		diff[diffType](one, two).forEach(e => {
			if (!e.added && !e.removed) {
				alignLines()

				for(let chars of e.value.match(/^([^\n]*)/g)) {
					let lastLine = left[left.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + chars

					lastLine = right[right.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + chars
				}

				for(let line of splitLines(e.value)) {
					line = line.replace('\n', '')
					pushBufferorLines({ line, number: ++leftLineNumber }, leftTruncateBuffer, left)
					pushBufferorLines({ line, number: ++rightLineNumber }, rightTruncateBuffer, right)
				}

			}
			if (e.removed) {

				let bufferResults = emptyBuffer(leftTruncateBuffer)
				if(bufferResults.length > 0) left.push({endTruncation: true})
				left = left.concat(bufferResults)

				for(let chars of e.value.match(/^([^\n]*)/g)) {
					let lastLine = left[left.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + chalk.bold.red(chars)
				}

				for(let line of splitLines(e.value)) {
					line = chalk.bold.red(line.replace('\n', ''))
					left.push({ line, number: ++leftLineNumber })
				}

			}
			if (e.added) {

				let bufferResults = emptyBuffer(rightTruncateBuffer)
				if(bufferResults.length > 0) right.push({endTruncation: true})
				right = right.concat(bufferResults)

				for(let chars of e.value.match(/^([^\n]*)/g)) {
					let lastLine = right[right.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + chalk.bold.green(chars)
				}

				for(let line of splitLines(e.value)) {
					line = chalk.bold.green(line.replace('\n', ''))
					right.push({ line, number: ++rightLineNumber })
				}
			}
		})

		alignLines()

		// draw
		let output = ``

		let widestLineNumberLeft = String(leftLineNumber).length
		let widestLineNumberRight = String(rightLineNumber).length
		let backgrounds = [
			chalk.bgRgb(25, 25, 25),
			chalk.bgRgb(30, 30, 30),
			chalk.bgRgb(15, 15, 15),
		]

		for (let i = 0; i < left.length; i++) {
			let leftString, rightString

			// truncation?
			if(left[i].endTruncation) {
				leftString = backgrounds[2](fit(' ... ', colwidth))
			} 
			// padding?
			else if(!(left[i].number && left[i].number > 0)) {
				leftString = backgrounds[2](fit(left[i].line ? left[i].line : '', colwidth))
			} 
			else {
				let leftLineNumber = chalk.grey(leftPad(String(left[i].number), widestLineNumberLeft))
				leftString = backgrounds[i%2](fit(backgrounds[2]('  ' + leftLineNumber + '  ') + left[i].line, colwidth))
			}

			// truncation?
			if(right[i].endTruncation) {
				rightString = backgrounds[2](fit(' ... ', colwidth))
			} 
			// padding?
			else if(!(right[i].number && right[i].number > 0)) {
				rightString = backgrounds[2](fit(right[i].line ? right[i].line : '', colwidth))
			} 
			else {
				let rightLineNumber = chalk.grey(leftPad(String(right[i].number), widestLineNumberRight))
				rightString = backgrounds[i%2](fit(backgrounds[2]('  ' + rightLineNumber + '  ') + right[i].line, colwidth))
			}

			output += leftString + '  ' + rightString + '\n'
		}

		return output
	},
}
