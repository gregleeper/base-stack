import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * A utility function to combine multiple class names together,
 * while properly handling Tailwind classes and their specificity/conflicts.
 *
 * @param inputs - The class names to combine
 * @returns Combined and cleaned class names string
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
