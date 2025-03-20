import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { cn } from "~/lib/utils"
import { Button } from "./button"

export type Option = {
	label: string
	value: string
}

interface MultiSelectProps {
	options: Option[]
	selected: string[]
	onChange: (selected: string[]) => void
	placeholder?: string
	className?: string
	badgeClassName?: string
	emptyMessage?: string
	name?: string
	id?: string
}

export function MultiSelect({
	options,
	selected = [],
	onChange,
	placeholder = "Select options...",
	className,
	badgeClassName,
	emptyMessage = "No options found.",
	name,
	id,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false)
	const [inputValue, setInputValue] = React.useState("")

	const handleUnselect = (value: string) => {
		onChange(selected.filter((item) => item !== value))
	}

	// Ensure options is always an array (even if empty)
	const safeOptions = options || []

	// Handle selection of an item
	const handleSelect = React.useCallback(
		(value: string) => {
			const isSelected = selected.includes(value)
			onChange(isSelected ? selected.filter((item) => item !== value) : [...selected, value])
		},
		[onChange, selected]
	)

	// When an item is selected, focus should return to the input
	const inputRef = React.useRef<HTMLInputElement>(null)
	const focusInput = () => {
		if (inputRef.current) {
			inputRef.current.focus()
		}
	}

	// Custom filter function that checks both value and label
	const customFilter = React.useCallback((value: string, search: string, keywords: string[] = []) => {
		// Combine the value with all keywords using template literals
		const extendedValue = `${value} ${keywords.join(" ")}`

		// Case-insensitive search
		if (extendedValue.toLowerCase().includes(search.toLowerCase())) {
			return 1
		}

		return 0
	}, [])

	return (
		<div className={className}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className={cn("w-full justify-between", selected.length > 0 ? "h-auto min-h-10" : "h-10")}
						aria-expanded={open}
						type="button"
					>
						<div className="flex flex-wrap gap-1">
							{selected.length > 0 ? (
								selected.map((value) => (
									<div
										key={value}
										className={cn("flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm", badgeClassName)}
									>
										{safeOptions.find((option) => option.value === value)?.label || value}
										<div
											className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
											onClick={(e) => {
												e.preventDefault()
												e.stopPropagation()
												handleUnselect(value)
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault()
													handleUnselect(value)
												}
											}}
											// biome-ignore lint/a11y/useSemanticElements: <explanation>
											role="button"
											tabIndex={0}
											aria-label={`Remove ${safeOptions.find((option) => option.value === value)?.label || value}`}
										>
											<XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
										</div>
									</div>
								))
							) : (
								<span className="text-sm text-muted-foreground">{placeholder}</span>
							)}
						</div>
						<ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
					<Command filter={customFilter}>
						<CommandInput ref={inputRef} placeholder="Search..." value={inputValue} onValueChange={setInputValue} />
						<CommandList>
							<CommandEmpty>{emptyMessage}</CommandEmpty>
							<CommandGroup className="max-h-64 overflow-auto">
								{safeOptions.map((option) => {
									const isSelected = selected.includes(option.value)
									return (
										<CommandItem
											key={option.value}
											value={option.value}
											keywords={[option.label, option.value]}
											onSelect={() => {
												handleSelect(option.value)
												setInputValue("") // Clear search on selection
												focusInput() // Return focus to search input
											}}
											className="flex items-center gap-2 cursor-pointer"
											data-state={isSelected ? "checked" : "unchecked"}
										>
											<div
												className={cn(
													"mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
													isSelected ? "bg-primary border-primary text-primary-foreground" : "opacity-50"
												)}
											>
												{isSelected && <CheckIcon className="h-3 w-3" />}
											</div>
											{option.label}
										</CommandItem>
									)
								})}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{/* Hidden input fields for form submission */}
			{name && selected.length > 0 && (
				<div className="sr-only">
					{/* Send as a single array instead of individual fields to avoid nesting issues */}
					<input type="hidden" name={name} value={JSON.stringify(selected)} id={id} />
				</div>
			)}
		</div>
	)
}
