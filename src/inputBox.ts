import {Application, Container, Graphics, Text, Ticker} from "pixi.js"

const boxHeight = 120
const cursorBlinkMs = 500

const createInputBox = (app: Application) => {
  const container = new Container()
  const box = new Graphics()
  const label = new Text({
    text: "",
    style: {
      fontFamily: "monospace",
      fontSize: 24,
      fill: 0x000000,
      align: "center",
      wordWrap: true,
    },
  })
  label.anchor.set(0.5)
  container.addChild(box, label)

  let prompt = ""
  let value = ""
  let cursorShow = true
  let elapsed = 0

  const render = () => {
    label.text = `${prompt}: ${value} ${cursorShow ? "|" : " "}`
  }

  const layout = () => {
    const boxWidth = app.screen.width - 200
    box.clear()
      .roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 32)
      .fill(0xffffff)
      .stroke({width: 4, color: 0x000000})
    label.style.wordWrapWidth = boxWidth
    container.position.set(app.screen.width / 2, app.screen.height / 2)
  }

  const blink = (ticker: Ticker) => {
    elapsed += ticker.deltaMS
    if (elapsed >= cursorBlinkMs) {
      elapsed = 0
      cursorShow = !cursorShow
      render()
    }
  }
  app.ticker.add(blink)

  layout()
  render()

  return {
    container,
    layout,
    get value() {
      return value
    },
    setPrompt(newPrompt: string) {
      prompt = newPrompt
      render()
    },
    append(ch: string) {
      value += ch
      render()
    },
    backspace() {
      value = value.substring(0, value.length - 1)
      render()
    },
    clear() {
      value = ""
      render()
    },
    destroy() {
      app.ticker.remove(blink)
      container.destroy({children: true})
    },
  }
}

export {createInputBox}
