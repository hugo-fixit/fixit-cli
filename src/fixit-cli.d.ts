declare interface ReleaseInfo {
  version: string
  changelog: string
  homeUrl: string
}

declare interface Timer {
  __start: number
  __end: number
  start: () => void
  stop: () => number
}
