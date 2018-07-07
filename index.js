const diff = require(`diff`)
const chalk = require(`chalk`)
const stripAnsi = require(`strip-ansi`)

const terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80

const colwidth = Math.floor((terminalWidth - 6) / 2)

function leftPad(str, width) {
	let s = width - stripAnsi(str).length
	for (s; s > 0; s--) {
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
	splitdiff(one, two, { diffType = `diffChars`, lineNumbers = false, lineOffset = 0 } = {}) {
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

		const splitLines = str => str.match(/\n([^\n]*)/g)

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

				for(let chars of e.value.match(/^([^\n]*)/g)) {
					let lastLine = left[left.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + chalk.bold.red(chars)
				}

				for(let line of splitLines(e.value)) {
					line = chalk.bold.red(line.replace('\n', ''))
					left.push({ line, number: ++leftLineNumber })
				}

/*				if(numBreaks(e.value) > 0) {
					for(let line of e.value.split('\n')) {
						left.push({ line: chalk.bold.red(line), number: ++leftLineNumber })
					}
				}
				else {
					let lastLine = left[left.length-1]
					lastLine.line = (lastLine.line ? lastLine.line : '') + e.value
				}*/
			}
			if (e.added) {
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
			chalk.bgRgb(30, 30, 30)
		]

		for (let i = 0; i < left.length; i++) {
			output += backgrounds[i%2](
				fit((left[i].number && left[i].number > 0 ? chalk.grey(leftPad(String(left[i].number), widestLineNumberLeft)) : '') + '  ' + (left[i].line ? left[i].line : ''), colwidth) + 
				`  ` + 
				fit((right[i].number && right[i].number > 0 ? chalk.grey(leftPad(String(right[i].number), widestLineNumberRight)) : '') + '  ' + (right[i].line ? right[i].line : ''), colwidth) + `\n`
			)
		}

		return output
	},
}
