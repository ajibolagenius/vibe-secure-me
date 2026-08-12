'use server'

import { db } from '@/lib/db'

// Server Actions are public HTTP endpoints. This one has no auth check.
export async function deleteProject(projectId: string) {
  await db.project.delete({ where: { id: projectId } })
  return { ok: true }
}
