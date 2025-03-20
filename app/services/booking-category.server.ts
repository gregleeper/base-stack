import { prisma } from "./db.server"

/**
 * Booking Category service for managing booking categories
 */

export async function getBookingCategories() {
	return prisma.bookingCategory.findMany({
		orderBy: {
			name: "asc",
		},
	})
}

export async function getBookingCategoryById(id: string) {
	return prisma.bookingCategory.findUnique({
		where: { id },
	})
}
