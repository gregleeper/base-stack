import { PassThrough } from "node:stream"
import { createReadableStreamFromReadable } from "@react-router/node"
import { createInstance } from "i18next"
import { isbot } from "isbot"
import { renderToPipeableStream } from "react-dom/server"
import { I18nextProvider, initReactI18next } from "react-i18next"
import { type AppLoadContext, type EntryContext, ServerRouter } from "react-router"

// Reject all pending promises from handler functions after 10 seconds
export const streamTimeout = 10000

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	context: EntryContext,
	appContext: AppLoadContext
) {
	const callbackName = isbot(request.headers.get("user-agent")) ? "onAllReady" : "onShellReady"
	const instance = createInstance()
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>

	await instance.use(initReactI18next) // Tell our instance to use react-i18next

	return new Promise((resolve, reject) => {
		let didError = false

		const { pipe, abort } = renderToPipeableStream(
			<I18nextProvider i18n={instance}>
				<ServerRouter context={context} url={request.url} />
			</I18nextProvider>,
			{
				[callbackName]: () => {
					const body = new PassThrough()
					const stream = createReadableStreamFromReadable(body)
					responseHeaders.set("Content-Type", "text/html")

					resolve(
						// @ts-expect-error - We purposely do not define the body as existent so it's not used inside loaders as it's injected there as well
						appContext.body(stream, {
							headers: responseHeaders,
							status: didError ? 500 : responseStatusCode,
						})
					)

					pipe(body)
				},
				onShellError(error: unknown) {
					reject(error)
				},
				onError(error: unknown) {
					didError = true
					// biome-ignore lint/suspicious/noConsole: We console log the error
					console.error(error)
				},
			}
		)
		// Abort the streaming render pass after 11 seconds so to allow the rejected
		// boundaries to be flushed
		setTimeout(abort, streamTimeout + 1000)
	})
}
