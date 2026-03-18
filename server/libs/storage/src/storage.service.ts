import { Injectable } from '@nestjs/common'
import fs from 'node:fs/promises'
import path from 'node:path'

@Injectable()
export class StorageService {
  constructor(private readonly rootDir = path.resolve(process.cwd(), 'storage')) {}

  async writeFile(relativePath: string, contents: string | Uint8Array) {
    const targetPath = path.resolve(this.rootDir, relativePath)
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, contents)
    return targetPath
  }
}
