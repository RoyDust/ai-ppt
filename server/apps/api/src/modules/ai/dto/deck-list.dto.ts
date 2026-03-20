export class DeckListItemDto {
  id!: string
  title!: string
  status!: string
  thumbnailUrl!: string | null
  updatedAt!: Date
  actualPageCount!: number | null
  currentVersionId!: string | null
}

export class DeckCurrentVersionDto {
  id!: string
  versionNo!: number
  titleSnapshot!: string | null
  actualPageCount!: number | null
  aiDeckJson!: unknown
  pptistSlidesJson!: unknown
}

export class DeckDetailDto extends DeckListItemDto {
  currentVersion!: DeckCurrentVersionDto | null
}
