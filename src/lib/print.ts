const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

export async function printWhenReady() {
  if (document.fonts?.ready) await document.fonts.ready

  const deadline = Date.now() + 10000
  while (document.querySelector('[data-print-ready="false"]') && Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 50))
  }
  if (document.querySelector('[data-print-ready="false"]')) throw new Error('QR belum siap dicetak. Coba lagi sebentar.')

  await Promise.all(Array.from(document.images, async (image) => {
    if (!image.complete) await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
    if (image.complete && image.naturalWidth > 0 && typeof image.decode === 'function') {
      try { await image.decode() } catch { /* Cetak tetap dapat memakai fallback browser. */ }
    }
  }))
  await nextFrame()
  await nextFrame()
  window.print()
}
