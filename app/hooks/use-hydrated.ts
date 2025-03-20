import { useEffect, useState } from "react"

/**
 * Hook to determine if the component is mounted/hydrated on the client.
 * Used to safely access browser APIs that aren't available during server-side rendering.
 */
export function useHydrated() {
	const [isHydrated, setIsHydrated] = useState(false)

	useEffect(() => {
		setIsHydrated(true)
	}, [])

	return isHydrated
}
