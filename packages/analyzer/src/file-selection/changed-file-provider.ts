export interface ChangedFileProvider {
  getChangedFiles(): Promise<string[]>
}
