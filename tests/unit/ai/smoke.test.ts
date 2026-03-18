describe('ai frontend test harness', () => {
  it('provides jsdom browser globals', () => {
    const marker = document.createElement('div')

    marker.textContent = 'frontend smoke'
    document.body.appendChild(marker)

    expect(window.document.body.textContent).toContain('frontend smoke')
  })
})
