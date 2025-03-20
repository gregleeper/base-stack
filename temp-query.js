import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
	const userGroups = await prisma.userGroup.findMany({
		include: {
			members: {
				include: {
					user: true,
				},
			},
			access: {
				include: {
					room: true,
				},
			},
		},
	})

	console.log("User Groups and Their Access Rights:")
	for (const group of userGroups) {
		console.log(`\nGroup: ${group.name} (${group.id})`)

		console.log("Members:")
		if (group.members.length === 0) {
			console.log("- No members assigned")
		} else {
			for (const member of group.members) {
				console.log(`- ${member.user.name} (${member.user.email})`)
			}
		}

		console.log("Resource Access:")
		if (group.access.length === 0) {
			console.log("- No resource access permissions defined")
		} else {
			for (const access of group.access) {
				const accessLevel = []
				if (access.canView) accessLevel.push("View")
				if (access.canBook) accessLevel.push("Book")
				if (access.canApprove) accessLevel.push("Approve")
				if (access.canManage) accessLevel.push("Manage")

				console.log(`- ${access.room.name} (${access.resourceType}): ${accessLevel.join(", ")}`)
			}
		}
	}

	await prisma.$disconnect()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
