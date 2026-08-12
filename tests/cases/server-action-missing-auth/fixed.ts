'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function deleteProject(projectId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  // Scope the delete to rows the caller owns rather than checking separately.
  const { count } = await db.project.deleteMany({
    where: { id: projectId, ownerId: session.user.id },
  })
  if (count === 0) throw new Error('Not found')
  return { ok: true }
}
