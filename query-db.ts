import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function queryData() {
	try {
		console.log("--- BookingCategories ---")
		const categories = await prisma.bookingCategory.findMany()
		console.log(JSON.stringify(categories, null, 2))

		console.log("\n--- BookingStatuses ---")
		const statuses = await prisma.bookingStatus.findMany()
		console.log(JSON.stringify(statuses, null, 2))

		// Check specific IDs from error message
		const categoryId = "5fef3a8c-8091-4732-b628-9ffd2a40831d"
		const statusId = "4c0e0719-7752-4388-8637-6ca2aea9f1ef"

		console.log(`\nChecking if category ID ${categoryId} exists:`)
		const category = await prisma.bookingCategory.findUnique({ where: { id: categoryId } })
		console.log(category ? "Found" : "Not found")
		if (category) console.log(JSON.stringify(category, null, 2))

		console.log(`\nChecking if status ID ${statusId} exists:`)
		const status = await prisma.bookingStatus.findUnique({ where: { id: statusId } })
		console.log(status ? "Found" : "Not found")
		if (status) console.log(JSON.stringify(status, null, 2))
	} catch (error) {
		console.error("Error occurred during database query:")
		if (error instanceof Error) {
			console.error(`Name: ${error.name}`)
			console.error(`Message: ${error.message}`)
			console.error(`Stack: ${error.stack}`)
		} else {
			console.error(error)
		}
	} finally {
		await prisma.$disconnect()
		console.log("Disconnected from database")
	}
}

queryData().catch((error) => {
	console.error("Unhandled promise rejection:", error)
	process.exit(1)
})
