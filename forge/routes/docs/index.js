var MarkdownIt = require('markdown-it'), md = new MarkdownIt();
const path = require('path')
const { stat } = require('fs')
const { readFile } = require('fs/promises')

const docsBasePath = path.normalize(path.join(__dirname, "..", "..", "..", "docs"))
const indexFile = "README.md"

// User requests are unsafe and need to be validated so there's no path
// traversal or related issues.
function safeDocRequestPath(unsafeSuffix) {
	  var safeSuffix = path.normalize(unsafeSuffix).replace(/^(\.\.(\/|\\|$))+/, '');

	  // after the call to normalize() there should be no more path traversal
	  return path.join(docsBasePath, safeSuffix);
}

/**
 * Render documentation from this repository locally. So users always have a
 * rendered version at hand.
 *
 * - /docs
 *
 * @namespace docs
 * @memberof ???
 */
module.exports = async function (app) {
	app.get('/*', async (request, response) => {
		const cleanPath = safeDocRequestPath(request.params["*"])

		// Assume rendering of the index is requested
		let mdFile = mdFile = "${cleanPath}.md"
		let mdFile = path.join(cleanPath, indexFile)
		await stat(mdFile, (err, statResult) => {
			if (!err) {
			}
		})

		const data = await readFile(mdFile, { encoding: 'utf8' });

		response
			.type('text/html')
			.send(md.render(data))
	})
}
