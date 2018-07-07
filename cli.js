#! /usr/bin/env node

const { splitdiff } = require(`./index`)
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
			console.log(``)
		})
		.parse(process.argv)

	try {

		if (cli.args.length < 2) {
			throw `need two files`
		}

		console.log(
			splitdiff(
				cli.args[0] + `\n\n` + readFileSync(cli.args[0], { encoding: `utf8` }),
				cli.args[1] + `\n\n` + readFileSync(cli.args[1], { encoding: `utf8` }),
				{ 
					diffType: `diffLines`,
					lineNumbers: true,
					lineOffset: 2
				}
			)
		)

	} catch (error) {
		console.log(`splitdiff:`, error)
		process.exit(1)
	}
}

main()
