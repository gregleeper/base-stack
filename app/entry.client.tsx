import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"
import { HydratedRouter } from "react-router/dom"

async function hydrate() {
	// eslint-disable-next-line import/no-named-as-default-member

	startTransition(() => {
		hydrateRoot(
			document,
			<StrictMode>
				<HydratedRouter />
			</StrictMode>
		)
	})
}

if (window.requestIdleCallback) {
	window.requestIdleCallback(hydrate)
} else {
	// Safari doesn't support requestIdleCallback
	// https://caniuse.com/requestidlecallback
	window.setTimeout(hydrate, 1)
}
