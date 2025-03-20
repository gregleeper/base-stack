declare module "~/components/MultiSelect" {
	export type Option = {
		label: string
		value: string
	}

	export interface MultiSelectProps {
		options: Option[]
		selected: string[]
		onChange: (selected: string[]) => void
		placeholder?: string
		className?: string
		id?: string
	}

	export function MultiSelect(props: MultiSelectProps): JSX.Element
}
