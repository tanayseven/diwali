import type {BaseTranslation} from "../i18n-types"

// English, the base locale. Every other locale translates these same keys; run
// `npm run i18n` after changing them to regenerate the types
const en = {
	title: "Diwali this year",
	loading: "Loading…",
	menu: {
		diyas: "Diyas",
		fireworks: "Fireworks",
		craftKandil: "Craft Kandil",
		decorateHouse: "Decorate House",
		drawRangoli: "Draw Rangoli",
	},
	back: "← Back",
	splashWarning: {
		heading: "Warning",
		message: "This app contains flashing and twinkling lights that may trigger seizures in people with photosensitive epilepsy. If you have epilepsy or have had seizures before, please take care while using it, and stop at once if you feel unwell.",
	},
	portraitWarning: {
		heading: "Portrait mode isn't supported",
		message: "This app can't be shown in portrait mode. Please rotate your device to landscape mode to continue.",
	},
	footer: {
		// {love}, {sweat} and {author} are replaced with the emoji and the author's link,
		// so they can go wherever the sentence needs them
		credit: "Made with {love} and {sweat} by {author}",
		love: "Love",
		sweat: "Sweat",
	},
	audio: {
		mute: "Mute music",
		unmute: "Unmute music",
		volume: "Volume",
	},
} satisfies BaseTranslation

export default en
