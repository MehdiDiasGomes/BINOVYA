import { removeE2eAdmins } from '../support/admin'

/**
 * Deletes the admin shared by the run, which `removeE2eAdmins` keeps for the specs.
 * @returns Resolves once the shared admin is gone
 */
const globalTeardown = async (): Promise<void> => {
  await removeE2eAdmins({ includeShared: true })
}

export default globalTeardown
