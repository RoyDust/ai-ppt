export interface StyleFingerprint {
  templateId?: string
  palette?: string[]
  typography?: {
    headingFont?: string
    bodyFont?: string
  }
  spacingScale?: string
  decorationHints?: string[]
}
