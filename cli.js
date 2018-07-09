#! /usr/bin/env node

const { splitDiffStrings, splitPatch } = require(`./index`)
const cli = require(`commander`)

const { readFileSync } = require('fs')



async function main() {

	cli
		.version(`0.1.0`)
		.usage(`[options] <file1> <file2>`)
		.on(`--help`, () => {
			console.log(``)
			console.log(`  Example:`)
			console.log(``)
			console.log(`    $ splitdiff file1 file2`)
			console.log(`    $ git diff file1 file2 | splitdiff`)
			console.log(``)
		})
		.parse(process.argv)

	try {

		if (cli.args.length < 2) {

			process.stdin.setEncoding('utf8')

			let data = ''

			process.stdin.on('readable', () => {
				const chunk = process.stdin.read()
				if (chunk !== null) {
					data += chunk
				}
			})
			process.stdin.on('end', () => {
				if(data !== '') {
					console.log(splitPatch(data, {}))
				}
			})

		} 
		else {
			console.log(
				splitDiffStrings(
					cli.args[0] + `\n\n` + readFileSync(cli.args[0], { encoding: `utf8` }),
					cli.args[1] + `\n\n` + readFileSync(cli.args[1], { encoding: `utf8` }),
					{ 
						diffType: `diffLines`,
						lineNumbers: true,
						lineOffset: 2
					}
				)
			)
		}

	} catch (error) {
		console.log(`splitdiff:`, error)
		process.exit(1)
	}
}

main()
