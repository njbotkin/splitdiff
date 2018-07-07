const diff = require(`diff`)
const chalk = require(`chalk`)
const stripAnsi = require(`strip-ansi`)

const terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80

const colwidth = Math.floor((terminalWidth) / 2)

function repeatChar(char, times) {
	let ret = ''
	while(--times > 0) ret += char
	return ret
}

const leftPad = (str, width) => repeatChar(' ', width - stripAnsi(str).length) + str
const rightPad = (str, width) => str + repeatChar(' ', width - stripAnsi(str).length)

function fit(str, width) {
	let strProcessed
	const center = width / 2

	str = str.replace(/\t/g, '    ')

	if (stripAnsi(str).length > width) {
		// truncate middle (this is buggy. strip out part of an ANSI escape code and stuff breaks)
		const overflow = stripAnsi(str).length - width + 1
		const remove = str.substr(center, overflow)
		strProcessed = str.replace(remove, `…`)
	} else {
		strProcessed = rightPad(str, width)
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
					left.push({ line, number: ++leftLineNumber })
					right.push({ line, number: ++rightLineNumber })
				}

			}
			if (e.removed) {

				let color = diffType === 'diffChars' ? chalk.bold.red : chalk.bold.white

				for(let chars of e.value.match(/^([^\n]*)/g)) {
					let lastLine = left[left.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + color(chars)
					lastLine.changed = true
				}

				for(let line of splitLines(e.value)) {
					line = color(line.replace('\n', ''))
					left.push({ line, number: ++leftLineNumber, changed: !!line })
				}

			}
			if (e.added) {

				let color = diffType === 'diffChars' ? chalk.bold.green : chalk.bold.white

				for(let chars of e.value.match(/^([^\n]*)/g)) {
					let lastLine = right[right.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + color(chars)
					lastLine.changed = true
				}

				for(let line of splitLines(e.value)) {
					line = color(line.replace('\n', ''))
					right.push({ line, number: ++rightLineNumber, changed: !!line })
				}
			}
		})

		alignLines()

		// draw
		let output = []

		let widestLineNumberLeft = String(leftLineNumber).length
		let widestLineNumberRight = String(rightLineNumber).length

		let lineBackground = chalk.bgRgb(25, 25, 25)
		let fileBackground = chalk.bgRgb(15, 15, 15)

		let bufferLength = 4
		let truncateBuffer = new Array(bufferLength)

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


		for (let i = 0; i < left.length; i++) {
			let leftString, rightString

			// padding?
			if(!(left[i].number && left[i].number > 0)) {
				leftString = fileBackground(fit(left[i].line ? left[i].line : '', colwidth))
			} 
			else {
				let leftLineNumber = leftPad(String(left[i].number), widestLineNumberLeft)
				if(left[i].changed) {
					leftString = chalk.bgRgb(70, 0, 0)(fit(chalk.bgRgb(50, 0, 0)('  ' + chalk.white(leftLineNumber) + '  ') + left[i].line, colwidth))
				} else {
					leftString = lineBackground(fit(fileBackground('  ' + chalk.grey(leftLineNumber) + '  ') + left[i].line, colwidth))
				}
			}

			// padding?
			if(!(right[i].number && right[i].number > 0)) {
				rightString = fileBackground(fit(right[i].line ? right[i].line : '', colwidth))
			} 
			else {
				let rightLineNumber = chalk.grey(leftPad(String(right[i].number), widestLineNumberRight))
				if(right[i].changed) {
					rightString = chalk.bgRgb(0, 70, 0)(fit(chalk.bgRgb(0, 50, 0)('  ' + chalk.white(rightLineNumber) + '  ') + right[i].line, colwidth))
				} else {
					rightString = lineBackground(fit(fileBackground('  ' + chalk.grey(rightLineNumber) + '  ') + right[i].line, colwidth))
				}
			}

			let combined = leftString + rightString

			if(truncate) {
				if(!left[i].changed && !right[i].changed) {
					pushBufferorLines(combined, truncateBuffer, output)
				} else {
					let bufferResults = emptyBuffer(truncateBuffer)
					if(bufferResults.length > 0) output.push(fileBackground(fit(leftPad('......', (colwidth/2)-3), colwidth) + fit(leftPad('......', (colwidth/2)-3), colwidth)))
					output = output.concat(bufferResults)

					output.push(combined)
				}
			} else {
				output.push(combined)
			}

		}

		return output.join('\n')
	},
}
