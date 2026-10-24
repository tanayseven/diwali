import {Application, Color, Container, Text} from "pixi.js"

const wave = (low: number, high: number, t: number): number =>
  low + (high - low) * (Math.sin(t) + 1) / 2

const degToRad = (deg: number): number => deg * Math.PI / 180

const createGreeting = (app: Application, message: string) => {
  const container = new Container()
  let chars: Text[] = []

  const layout = () => {
    container.removeChildren().forEach(child => child.destroy())
    const fontSize = app.screen.width / 20
    let x = 0
    // Split on grapheme clusters so combining marks (e.g. Devanagari matras) stay attached
    const graphemes = Array.from(new Intl.Segmenter().segment(message), s => s.segment)
    chars = graphemes.map(ch => {
      const text = new Text({
        text: ch,
        style: {fontFamily: "monospace", fontSize, fill: 0xffffff},
      })
      text.anchor.set(0.5)
      text.x = x + text.width / 2
      x += text.width
      container.addChild(text)
      return text
    })
    container.position.set(
      app.screen.width / 2 - x / 2,
      app.screen.height / 2,
    )
  }

  const animate = () => {
    const t = performance.now() / 1000
    chars.forEach((text, idx) => {
      text.tint = new Color({h: ((t * 0.2 + idx * 0.1) % 1) * 360, s: 70, l: 80})
      text.y = wave(-4, 4, t * 4 + idx * 0.5)
      text.scale.set(wave(1, 1.2, t * 3 + idx))
      text.rotation = degToRad(wave(-9, 9, t * 3 + idx))
    })
  }

  layout()
  app.ticker.add(animate)
  return {
    container,
    layout,
    destroy() {
      app.ticker.remove(animate)
      container.destroy({children: true})
    },
  }
}

export {createGreeting}
