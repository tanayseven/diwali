import {fontFamily} from "./app"

const highlight = "#ffd700"
const footerHeight = 40

// Tooltips are styled in a stylesheet, as inline styles can't reach ::after or :hover
const style = `
.footer-tip {
  position: relative;
  cursor: help;
  outline: none;
}
.footer-tip::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 10px;
  border-radius: 8px;
  background: ${highlight};
  color: #000000;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease-in-out;
}
.footer-tip:hover::after,
.footer-tip:focus::after {
  opacity: 1;
}
`

// An emoji that shows a word above it when hovered, or tapped on touch screens
const createTip = (emoji: string, tip: string) => {
  const span = document.createElement("span")
  span.className = "footer-tip"
  span.textContent = emoji
  span.dataset.tip = tip
  span.setAttribute("role", "img")
  span.setAttribute("aria-label", tip)
  // Focusable, so a tap shows the tooltip where there's no hover
  span.tabIndex = 0
  return span
}

// A bar along the bottom of the menu crediting who made it
const createFooter = () => {
  const stylesheet = document.createElement("style")
  stylesheet.textContent = style
  document.head.appendChild(stylesheet)

  const footer = document.createElement("footer")
  Object.assign(footer.style, {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "0",
    height: `${footerHeight}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.3em",
    background: "rgba(0, 0, 0, 0.6)",
    color: "#ffffff",
    fontFamily,
    fontSize: "20px",
  })

  const link = document.createElement("a")
  link.href = "https://blog.tanay.tech"
  link.target = "_blank"
  link.rel = "noopener"
  link.textContent = "Tanay PrabhuDesai"
  Object.assign(link.style, {color: highlight, textDecoration: "none"})

  footer.append("Made with", createTip("❤️", "Love"), "and", createTip("😓", "Sweat"), "by", link)
  document.body.appendChild(footer)

  return {
    height: footerHeight,
    setOpacity(alpha: number) {
      footer.style.opacity = String(alpha)
      footer.style.visibility = alpha > 0 ? "visible" : "hidden"
    },
    setInteractive(interactive: boolean) {
      footer.style.pointerEvents = interactive ? "auto" : "none"
    },
  }
}

export {createFooter}
