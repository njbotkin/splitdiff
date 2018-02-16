const diff = require(`diff`)
const chalk = require(`chalk`)
const stripAnsi = require(`strip-ansi`)

const terminalWidth = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80

const colwidth = Math.floor((terminalWidth - 6) / 2)

function fit(str, width) {
	let strProcessed = ``
	const center = width / 2

	if (stripAnsi(str).length > width) {
		// truncate middle (this is buggy. strip out part of an ANSI escape code and stuff breaks)
		const overflow = str.length - width + 1
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
	splitdiff(one, two, { diffType = `diffChars` } = {}) {
		if (diffType !== `diffChars` && diffType !== `diffLines`) {
			throw (`unsupported diffType!`)
		}

		let left = ``
		let right = ``

		function alignLines() {
			while ((left.match(/\n/g) || []).length < (right.match(/\n/g) || []).length) {
				left += `\n`
			}
			while ((left.match(/\n/g) || []).length > (right.match(/\n/g) || []).length) {
				right += `\n`
			}
		}

		diff[diffType](one, two).forEach(e => {
			if (!e.added && !e.removed) {
				alignLines()

				left += e.value
				right += e.value
			}
			if (e.removed) {
				left += chalk.bold.red(e.value)
			}
			if (e.added) {
				right += chalk.bold.green(e.value)
			}
		})

		alignLines()

		// draw
		const leftLines = left.split(`\n`)
		const rightLines = right.split(`\n`)
		let output = ``

		for (let i = 0; i < leftLines.length; i++) {
			output += fit(leftLines[i], colwidth) + `  ` + fit(rightLines[i], colwidth) + `\n`
		}

		return output
	},
}
