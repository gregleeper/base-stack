import "../app/tailwind.css"
import { renderHook as renderReactHook } from "@testing-library/react"
import { createInstance } from "i18next"
import { I18nextProvider, initReactI18next } from "react-i18next"
import { Outlet, type RoutesTestStubProps, createRoutesStub } from "react-router"
import { render } from "vitest-browser-react"
type StubRouteEntry = Parameters<typeof createRoutesStub>[0][0]

const renderStub = async (args?: {
	props?: RoutesTestStubProps
	entries?: StubRouteEntry[]
}) => {
	const instance = createInstance()
	// Initialize the i18next instance
	await instance
		.use(initReactI18next) // Tell our instance to use react-i18next
		.init({})

	// We create the entries array to be rendered by react-router
	const entries: StubRouteEntry[] = [
		{
			id: "root",
			path: "/",
			children: args?.entries ?? [],
			Component: () => (
				<div data-testid="root">
					<I18nextProvider i18n={instance}>
						<Outlet />
					</I18nextProvider>
				</div>
			),
		},
	]
	// We generate the props to be passed into the react-router stub
	const props: RoutesTestStubProps = {
		...args?.props,
		initialEntries: args?.props?.initialEntries ?? ["/"],
	}
	// We generate the stub using the entries and props
	const Stub = createRoutesStub(entries)
	// We render the container so it can be used in tests
	const renderedScreen = render(<Stub {...props} />)

	return renderedScreen
}

const renderHook = renderReactHook

// We extend the global test context with our custom functions that we pass into the context in beforeEach
declare module "vitest" {
	export interface TestContext {
		renderStub: typeof renderStub
		renderHook: typeof renderHook
	}
}
// We pass in our custom functions to the test context
beforeEach((ctx) => {
	ctx.renderStub = renderStub
	ctx.renderHook = renderHook
})

// We clear all mocks after each test (optional, feel free to remove it)
afterEach(() => {
	vi.clearAllMocks()
})
