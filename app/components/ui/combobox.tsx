"use client"

import { ChevronDownIcon } from "lucide-react"
import { cn } from "~/lib/utils"

export type ComboboxOption = {
	value: string
	label: string
}

interface ComboboxProps {
	options: ComboboxOption[]
	value?: string
	onValueChange: (value: string) => void
	placeholder?: string
	emptyMessage?: string
	className?: string
	name?: string
	id?: string
	error?: string
}

export function Combobox({
	options = [],
	value,
	onValueChange,
	placeholder = "Select an option",
	emptyMessage = "No options found.",
	className,
	name,
	id,
	error,
}: ComboboxProps) {
	// Ensure options is always an array
	const safeOptions = Array.isArray(options) ? options : []

	// Handle the case when there are no options
	const hasOptions = safeOptions.length > 0

	const selectedOption = safeOptions.find((option) => option.value === value)

	return (
		<div className={className}>
			<div className="relative">
				<select
					name={name}
					id={id}
					value={value || ""}
					onChange={(e) => onValueChange(e.target.value)}
					className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
					aria-describedby={error ? `${id}-error` : undefined}
				>
					<option value="" disabled>
						{placeholder}
					</option>
					{safeOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>

				{/* Custom styled display for the select */}
				<div
					className={cn(
						"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
						error ? "border-red-500" : "",
						!value && "text-muted-foreground",
						"text-foreground"
					)}
				>
					<span>{selectedOption ? selectedOption.label : placeholder}</span>
					<ChevronDownIcon className="h-4 w-4 opacity-50" />
				</div>
			</div>

			{error && (
				<p id={`${id}-error`} className="text-sm font-medium text-destructive mt-1">
					{error}
				</p>
			)}

			{!hasOptions && emptyMessage && <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>}
		</div>
	)
}
