import { Check, ChevronsUpDown, X } from "lucide-react"
import * as React from "react"
import { Button } from "~/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { cn } from "~/lib/utils"

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
	id?: string
}

export function MultiSelect({
	options,
	selected,
	onChange,
	placeholder = "Select items...",
	className,
	id,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false)

	// Filter to only show unselected options
	const filteredOptions = options.filter((option) => !selected.includes(option.value))

	// Handle toggling an option
	const handleSelect = (value: string) => {
		const newSelected = [...selected, value]
		onChange(newSelected)
		// Keep popover open after selection
	}

	// Handle removing an option
	const handleRemove = (value: string) => {
		const newSelected = selected.filter((item) => item !== value)
		onChange(newSelected)
	}

	// Get the labels for selected items
	const selectedLabels = selected.map((value) => {
		const option = options.find((o) => o.value === value)
		return option ? option.label : value
	})

	return (
		<div className="flex flex-col gap-1">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						aria-haspopup="listbox"
						aria-expanded={open}
						className={cn("w-full justify-between", className)}
						id={id}
					>
						<span className="truncate">{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-full min-w-[300px] p-0" align="start">
					<Command className="max-h-[400px]">
						<CommandInput placeholder="Search..." />
						<CommandEmpty>No items found.</CommandEmpty>
						<CommandGroup className="max-h-[300px] overflow-auto">
							{filteredOptions.map((option) => (
								<CommandItem key={option.value} onSelect={() => handleSelect(option.value)} className="cursor-pointer">
									<Check
										className={cn("mr-2 h-4 w-4", selected.includes(option.value) ? "opacity-100" : "opacity-0")}
									/>
									<span>{option.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</Command>
				</PopoverContent>
			</Popover>

			{/* Display selected items */}
			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1 mt-1.5">
					{selectedLabels.map((label, i) => (
						<Badge key={selected[i]} onRemove={() => handleRemove(selected[i])}>
							{label}
						</Badge>
					))}
				</div>
			)}
		</div>
	)
}

// Badge component for selected items
function Badge({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter" || event.key === " ") {
			onRemove()
			event.preventDefault()
		}
	}

	return (
		<button
			type="button"
			className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/25 hover:bg-primary/35 text-sm text-primary font-semibold transition-colors dark:bg-primary/40 dark:hover:bg-primary/50 dark:text-primary-foreground dark:font-medium"
			onKeyDown={handleKeyDown}
		>
			{children}
			<X className="ml-1 h-3 w-3 cursor-pointer" onClick={onRemove} aria-label="Remove" />
		</button>
	)
}
