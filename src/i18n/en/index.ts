import type {BaseTranslation} from "../i18n-types"

// English, the base locale. Every other locale translates these same keys; run
// `npm run i18n` after changing them to regenerate the types
const en = {
	title: "Diwali this year",
	loading: "Loading…",
	// The side rail's tools, each with its own bar of things to use
	tools: {
		diyas: "Diyas",
		fireworks: "Fireworks",
		kandil: "Craft Kandil",
		decorate: "Decorate House",
		rangoli: "Draw Rangoli",
	},
	zoom: {
		in: "Zoom in",
		out: "Zoom out",
	},
	hud: {
		hide: "Hide the bar",
		show: "Show the bar",
	},
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
	// Shown on hovering over things in the inventory bar and in the scene
	tooltip: {
		diya: {
			name: "Diya",
			stack: "An oil lamp. Drag one onto the porch",
			needsWickAndOil: "Needs a wick and oil",
			needsWick: "Needs a wick",
			needsOil: "Needs oil",
			ready: "Ready to light with the matchstick",
			lit: "Lit",
		},
		wick: {
			name: "Wick",
			hint: "Drag onto a diya to put it in",
		},
		oil: {
			name: "Oil",
			hint: "Drag onto a diya to fill it",
		},
		matchstick: {
			name: "Matchstick",
			diyaHint: "Drag onto a diya with a wick and oil to light it",
			fireworkHint: "Drag onto an anar, a laddi or a chakri to light it",
		},
		anar: {
			name: "Anar",
			stack: "A flowerpot firework. Drag one onto the porch",
		},
		laddi: {
			name: "Laddi",
			stack: "A string of firecrackers. Drag one onto the porch",
		},
		chakri: {
			name: "Chakri",
			stack: "A ground spinner. Drag one onto the porch",
		},
		noneLeft: "None left",
		move: "Drag to move it, or onto the bar to put it back",
		unlit: "Light it with the matchstick",
		spent: "Burnt out. Drag onto the bar to clear it away",
		lights: {
			name: "Fairy lights",
			red: "Red fairy lights",
			orange: "Orange fairy lights",
			yellow: "Yellow fairy lights",
			green: "Green fairy lights",
			blue: "Blue fairy lights",
			white: "White fairy lights",
			mixed: "Mixed fairy lights",
			hint: "Pick, then drag from one point on the house to another to hang a string",
			move: "Drag to move them, or onto the Decorate House bar to take them down",
		},
		rangoli: {
			red: "Red powder",
			orange: "Orange powder",
			yellow: "Yellow powder",
			green: "Green powder",
			blue: "Blue powder",
			purple: "Purple powder",
			pink: "Pink powder",
			white: "White powder",
			hint: "Pick, then draw on the porch floor",
			eraser: "Eraser",
			eraserHint: "Pick, then rub out parts of the rangoli",
			clear: "Clear",
			clearHint: "Wipes the whole rangoli off the floor",
		},
	},
} satisfies BaseTranslation

export default en
