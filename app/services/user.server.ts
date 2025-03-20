import { prisma } from "./db.server"

export const getUserGroupsForUser = async (userId: string) => {
	const userGroups = await prisma.userGroup.findMany({
		where: {
			members: {
				some: {
					userId,
				},
			},
		},
	})
	return userGroups
}

export const getAllUsers = async () => {
	return prisma.user.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			email: true,
		},
		orderBy: {
			name: "asc",
		},
	})
}
