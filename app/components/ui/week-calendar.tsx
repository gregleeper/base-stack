import { addDays, endOfWeek, format, getDay, isSameDay, isToday, startOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

export type CalendarEvent = {
	id: string
	bookingId?: string // Optional property to store the original booking ID
	title: string
	start: Date
	end: Date
	color?: string
}

export type WeekCalendarProps = {
	events?: CalendarEvent[]
	currentDate?: Date
	onEventClick?: (event: CalendarEvent) => void
	onDayClick?: (date: Date) => void
	onNavigate?: (date: Date) => void
	className?: string
	timeStart?: number
	timeEnd?: number
}

function WeekCalendar({
	events = [],
	currentDate = new Date(),
	onEventClick,
	onDayClick,
	onNavigate,
	className,
	timeStart = 8,
	timeEnd = 20,
}: WeekCalendarProps) {
	const [selectedDate, setSelectedDate] = React.useState<Date>(currentDate)

	const weekStart = React.useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate])
	const weekEnd = React.useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate])

	const weekDays = React.useMemo(() => {
		const days = []
		for (let i = 0; i < 7; i++) {
			days.push(addDays(weekStart, i))
		}
		return days
	}, [weekStart])

	const hourLabels = React.useMemo(() => {
		const hours = []
		for (let i = timeStart; i <= timeEnd; i++) {
			hours.push(i)
		}
		return hours
	}, [timeStart, timeEnd])

	const navigateWeek = (direction: "prev" | "next") => {
		const newDate = direction === "prev" ? addDays(selectedDate, -7) : addDays(selectedDate, 7)
		setSelectedDate(newDate)
		onNavigate?.(newDate)
	}

	const handleDayClick = (date: Date) => {
		onDayClick?.(date)
	}

	const handleEventClick = (event: CalendarEvent) => {
		onEventClick?.(event)
	}

	const handleKeyDown = (date: Date, e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			onDayClick?.(date)
		}
	}

	// Function to position events in the grid
	const getEventPositionStyles = (event: CalendarEvent, eventIndex = 0, totalOverlapping = 1): React.CSSProperties => {
		// Calculate which day column the event belongs to
		const eventDay = getDay(event.start)
		const dayIndex = eventDay === 0 ? 6 : eventDay - 1 // Adjust for week starting on Monday

		// Calculate start and end times
		const startHour = event.start.getHours() + event.start.getMinutes() / 60
		const endHour = event.end.getHours() + event.end.getMinutes() / 60

		// Calculate position within the grid
		const top = `${((startHour - timeStart) / (timeEnd - timeStart + 1)) * 100}%`
		const height = `${((endHour - startHour) / (timeEnd - timeStart + 1)) * 100}%`

		// Calculate left position based on the grid layout
		// The calendar has 8 columns (time + 7 days), with the first column being time labels
		// Events should be positioned in columns 2-8 (representing the days)
		// The first column (index 0) is used for time labels
		const columnWidth = 100 / 8 // 8 columns total (time column + 7 days)
		const leftOffset = columnWidth * (dayIndex + 1) // +1 to skip time column

		// If we have overlapping events, adjust width and position
		const width = (columnWidth * 0.9) / Math.max(1, totalOverlapping) // Divide column width by number of overlapping events
		const overlapOffset = eventIndex * width // Offset each overlapping event

		return {
			position: "absolute",
			top,
			height,
			left: `calc(${leftOffset}% + ${overlapOffset}% + 4px)`, // Add overlap offset and margin
			width: `calc(${width}% - 8px)`, // Subtract margin from both sides
			backgroundColor: event.color || "hsl(var(--primary))",
			zIndex: 10,
			borderRadius: "0.25rem",
			boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap",
		}
	}

	// Process events to handle overlapping
	const processedEvents = React.useMemo(() => {
		// Group events by day
		const eventsByDay: Record<string, CalendarEvent[]> = {}

		// Group events by day
		for (const event of events) {
			const dayKey = format(event.start, "yyyy-MM-dd")
			if (!eventsByDay[dayKey]) {
				eventsByDay[dayKey] = []
			}
			eventsByDay[dayKey].push(event)
		}

		// For each day, find overlapping events
		const processedEvents: Array<{
			event: CalendarEvent
			index: number
			total: number
		}> = []

		// Process each day's events
		for (const dayEvents of Object.values(eventsByDay)) {
			// Sort events by start time
			dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())

			// Find overlapping groups
			const overlappingGroups: CalendarEvent[][] = []

			// Group overlapping events
			for (const event of dayEvents) {
				// Try to find an existing group this event can join
				let foundGroup = false

				for (const group of overlappingGroups) {
					// Check if this event overlaps with the last event in the group
					const lastEvent = group[group.length - 1]
					if (event.start < lastEvent.end) {
						group.push(event)
						foundGroup = true
						break
					}
				}

				// If no existing group works, create a new one
				if (!foundGroup) {
					overlappingGroups.push([event])
				}
			}

			// Add processed events with their overlap information
			for (const group of overlappingGroups) {
				for (let index = 0; index < group.length; index++) {
					processedEvents.push({
						event: group[index],
						index,
						total: group.length,
					})
				}
			}
		}

		return processedEvents
	}, [events])

	return (
		<Card className={cn("w-full", className)}>
			<CardHeader className="flex flex-row items-center justify-between p-4">
				<CardTitle className="text-lg font-medium">
					{format(weekStart, "MMMM d")} - {format(weekEnd, "MMMM d, yyyy")}
				</CardTitle>
				<div className="flex gap-1">
					<Button variant="outline" size="icon" className="size-8 p-0" onClick={() => navigateWeek("prev")}>
						<ChevronLeft className="size-4" />
						<span className="sr-only">Previous week</span>
					</Button>
					<Button variant="outline" size="icon" className="size-8 p-0" onClick={() => setSelectedDate(new Date())}>
						<span className="text-xs">Today</span>
						<span className="sr-only">Today</span>
					</Button>
					<Button variant="outline" size="icon" className="size-8 p-0" onClick={() => navigateWeek("next")}>
						<ChevronRight className="size-4" />
						<span className="sr-only">Next week</span>
					</Button>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<div className="grid grid-cols-[auto_repeat(7,1fr)] border-b border-border">
					<div className="p-2 border-r border-border" />
					{weekDays.map((day) => (
						<button
							key={day.toString()}
							className={cn(
								"p-2 text-center font-medium border-r border-border",
								isToday(day) && "bg-accent text-accent-foreground"
							)}
							onClick={() => handleDayClick(day)}
							onKeyDown={(e) => handleKeyDown(day, e)}
							type="button"
							aria-label={format(day, "EEEE, MMMM d, yyyy")}
						>
							<div className="text-sm">{format(day, "EEE")}</div>
							<div
								className={cn(
									"flex size-8 mx-auto justify-center items-center rounded-full",
									isToday(day) && "bg-primary text-primary-foreground"
								)}
							>
								{format(day, "d")}
							</div>
						</button>
					))}
				</div>
				<div className="relative grid grid-cols-[auto_repeat(7,1fr)] min-h-[600px]">
					{/* Time labels */}
					<div className="border-r border-border">
						{hourLabels.map((hour) => (
							<div key={hour} className="h-20 border-b border-border text-xs text-muted-foreground pr-2">
								<div className="translate-y-[-0.5em] text-right">
									{hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
								</div>
							</div>
						))}
					</div>

					{/* Day columns with grid lines */}
					{weekDays.map((day, dayIndex) => (
						<div key={day.toString()} className="relative">
							{hourLabels.map((hour) => (
								<div
									key={hour}
									className={cn(
										"h-20 border-b border-r border-border",
										dayIndex === 6 && "border-r-0" // No right border on last column
									)}
								/>
							))}
						</div>
					))}

					{/* Events */}
					<TooltipProvider>
						{processedEvents.map(({ event, index, total }) => {
							const dayOfEvent = new Date(event.start).setHours(0, 0, 0, 0)
							const matchingDay = weekDays.find((day) => isSameDay(day, new Date(dayOfEvent)))

							if (!matchingDay) return null

							return (
								<Tooltip key={event.id}>
									<TooltipTrigger asChild>
										<button
											type="button"
											className="absolute rounded-md px-2 py-1 text-xs font-medium text-white overflow-hidden text-ellipsis whitespace-nowrap"
											style={getEventPositionStyles(event, index, total)}
											onClick={() => handleEventClick(event)}
										>
											{event.title}
										</button>
									</TooltipTrigger>
									<TooltipContent>
										<div className="text-sm font-medium">{event.title}</div>
										<div className="text-xs">
											{format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
										</div>
									</TooltipContent>
								</Tooltip>
							)
						})}
					</TooltipProvider>
				</div>
			</CardContent>
			<CardFooter className="p-3 text-xs text-muted-foreground">
				{events.length} events • Click on a day or event for details
			</CardFooter>
		</Card>
	)
}

export { WeekCalendar }
