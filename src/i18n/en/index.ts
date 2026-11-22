import type {BaseTranslation} from "../i18n-types"

// English, the base locale. Every other locale translates these same keys; run
// `npm run i18n` after changing them to regenerate the types
const en = {
	title: "Diwali Celebration",
	loading: "Loading…",
	// The side rail's tools, each with its own bar of things to use
	tools: {
		diyas: "Diyas",
		fireworks: "Fireworks",
		kandil: "Craft Kandil",
		decorate: "Decorate House",
		rangoli: "Draw Rangoli",
	},
	// The houses along the street, by name, shown on a plaque over each one's door.
	// Names, so written out in each language's script rather than translated
	houses: {
		deepaNiwas: "Deepa Niwas",
		lakshmiSadan: "Lakshmi Sadan",
		thulasiMana: "Thulasi Mana",
		saiKrupa: "Sai Krupa",
		ganeshKunj: "Ganesh Kunj",
		anandVilla: "Anand Villa",
	},
	zoom: {
		in: "Zoom in",
		out: "Zoom out",
	},
	hud: {
		hide: "Hide the bar",
		show: "Show the bar",
	},
	screenshot: {
		take: "Take a photo to share",
		// Sent with the photo when it's shared
		shareText: "My Diwali Celebration, at {url}",
	},
	splashWarning: {
		heading: "Warning",
		message: "This app contains flashing and twinkling lights that may trigger seizures in people with photosensitive epilepsy. If you have epilepsy or have had seizures before, please take care while using it, and stop at once if you feel unwell.",
	},
	// Shown after the warning, as sounds are heard from where they are in the scene
	soundSplash: {
		heading: "Use stereo sound",
		message: "For a better experience, use headphones or a stereo sound system. Each sound is heard from where it is, to your left or right.",
	},
	portraitWarning: {
		heading: "Portrait mode isn't supported",
		message: "This app can't be shown in portrait mode. Please rotate your device to landscape mode to continue.",
	},
	footer: {
		// {love} and {author} are replaced with the emoji and the author's link,
		// so they can go wherever the sentence needs them
		credit: "Made with {love} by {author}",
		love: "Love",
		// The link to the privacy policy
		privacy: "Privacy",
	},
	audio: {
		mute: "Mute music",
		unmute: "Unmute music",
		volume: "Volume",
	},
	// A guided first run, a step at a time, shown on the first visit and from the settings
	tour: {
		diya: "Drag a diya from the bar onto the porch",
		lightDiya: "Now drag a wick and the oil onto it, then light it with the matchstick",
		pickFireworks: "Pick the fireworks from the left",
		firework: "Drag an anar onto the porch, then light it with the matchstick",
		more: "Make akash kandils, hang fairy lights and draw rangoli with these. Happy Diwali!",
		skip: "Skip",
		done: "Done",
		// In the settings, to go through it again
		title: "Walkthrough",
		replay: "Show again",
	},
	// Rating the app in its store, in the Android app only: a row in the settings, and now
	// and then, after something's been made, a card asking
	rating: {
		title: "Rate the app",
		rate: "Rate",
		ask: "Enjoying Diwali Celebration? Rate it, so others can find it too",
		later: "Not now",
		never: "Don't ask again",
	},
	// Shown at the start, the first time, to pick the house to decorate
	housePicker: {
		heading: "Pick your house",
		hint: "Decorate it for Diwali. Your neighbours have decorated theirs already, and their families are out celebrating.",
	},
	// The settings panel, opened with the gear button in the top right corner
	settings: {
		open: "Settings",
		close: "Close",
		music: "Music",
		musicVolume: "Music volume",
		effects: "Sound effects",
		nextTrack: "Next track",
		language: "Language",
		// Also on the photosensitivity warning shown at the start
		reduceFlashing: "Reduce flashing",
		// The house picked at the start; tapping it starts the game again, to pick another
		house: "Your house",
	},
	// Shown on hovering over things in the inventory bar and in the scene
	tooltip: {
		// The "?" badge on something placed that's still to be finished, read out by screen readers
		hintButton: "What to do next",
		// Shown from that badge: what to do next with it, naming the side rail's tool whose bar has what's needed
		next: {
			addWickAndOil: "Next: drag a wick and the oil from the Diyas bar onto it, in either order",
			addWick: "Next: drag a wick from the Diyas bar onto it",
			addOil: "Next: drag the oil from the Diyas bar onto it",
			lightDiya: "Next: drag the matchstick from the Diyas bar onto it and hold it there, or tap the matchstick, then this, to light it",
			lightFirework: "Next: drag the matchstick from the Fireworks bar onto it and hold it there, or tap the matchstick, then this, to light it",
			addPaper: "Next: drag a paper from the Craft Kandil bar onto it to wrap it, or tap it, then a paper",
			addTails: "Next: drag some tails from the Craft Kandil bar onto it, or tap it, then some tails",
			addBulb: "Next: drag the bulb from the Craft Kandil bar onto it to light it, or tap it, then the bulb",
		},
		diya: {
			name: "Diya",
			stack: "An oil lamp. Drag one onto the porch",
			needsWickAndOil: "Needs a wick and oil",
			needsWick: "Needs a wick",
			needsOil: "Needs oil",
			ready: "Ready to light with the matchstick",
			lit: "Lit",
			turn: "Tap to turn it",
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
			diyaHint: "Drag onto a diya with a wick and oil and hold it there, or tap it, then the diya, to light it",
			fireworkHint: "Drag onto a firework and hold it there, or tap it, then the firework, to light it",
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
		sutli: {
			name: "Sutli Bomb",
			stack: "A firecracker wound tight in twine. Drag one onto the porch",
		},
		rocket: {
			name: "Rocket",
			stack: "A rocket on a stick, stood in an empty bottle. Drag one onto the porch",
		},
		skyshot: {
			name: "Sky Shot",
			stack: "A tube that fires a shell high into the sky, where it bursts. Drag one onto the porch",
		},
		kandil: {
			name: "Akash Kandil",
			needsPaper: "Needs paper",
			needsTails: "Needs tails",
			ready: "Ready for a bulb",
			lit: "Lit",
			move: "Drag to move it onto the porch or the house, or onto the Craft Kandil bar to put its frame back",
			frame: {
				name: "Kandil frame",
				stack: "A bamboo frame for an akash kandil. Drag one onto the porch to make it there, or onto the house to hang it",
			},
			paper: {
				red: "Red paper",
				orange: "Orange paper",
				blue: "Blue paper",
				mixed: "Mixed paper",
				hint: "Drag onto a kandil frame to wrap it",
			},
			tails: {
				green: "Green tails",
				red: "Red tails",
				gold: "Gold tails",
				mixed: "Mixed tails",
				hint: "Drag onto a kandil wrapped in paper to hang them below it",
			},
			bulb: {
				name: "Bulb",
				hint: "Drag onto a kandil with its paper and tails to light it",
			},
		},
		noneLeft: "None left",
		move: "Drag to move it, or onto the bar to put it back",
		unlit: "Light it with the matchstick",
		spent: "Burnt out. Drag it into the waste bin on the porch to clear it away",
		// The waste bin on the porch, for burnt-out fireworks
		bin: {
			name: "Waste bin",
			hint: "Drag burnt-out fireworks here to clear them away",
		},
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
			// The first slot of the Draw Rangoli bar, which shows the design picked
			design: "Tap to make your own design, then tap the porch floor to put it down",
			clear: "Clear",
			clearHint: "Wipes the whole rangoli off the floor",
		},
	},
} satisfies BaseTranslation

export default en
