import { getOctokit } from '@actions/github'

export function createOctokit(token: string) {
  return getOctokit(token)
}

export type Octokit = ReturnType<typeof createOctokit>
