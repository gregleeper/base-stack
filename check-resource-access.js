import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
	const resourceAccess = await prisma.resourceAccess.findMany({
		include: {
			userGroup: true,
		},
	})

	console.log("Resource Access Entries:")
	console.log("=======================\n")
	console.log(`Total entries: ${resourceAccess.length}\n`)

	// Group by resource type
	const byResourceType = {}
	for (const access of resourceAccess) {
		byResourceType[access.resourceType] = (byResourceType[access.resourceType] || 0) + 1
	}

	console.log("Entries by resource type:")
	for (const [type, count] of Object.entries(byResourceType)) {
		console.log(`- ${type}: ${count}`)
	}

	console.log("\nSample entries:")
	// Show a few examples of different resource types
	for (const type of Object.keys(byResourceType)) {
		const examples = resourceAccess.filter((a) => a.resourceType === type).slice(0, 2)

		console.log(`\n${type.toUpperCase()} examples:`)
		for (const example of examples) {
			console.log(`- Group: ${example.userGroup.name}`)
			console.log(`  Resource ID: ${example.resourceId}`)
			console.log(
				`  Permissions: ${[
					example.canView ? "View" : "",
					example.canBook ? "Book" : "",
					example.canApprove ? "Approve" : "",
					example.canManage ? "Manage" : "",
				]
					.filter(Boolean)
					.join(", ")}`
			)
		}
	}

	await prisma.$disconnect()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
