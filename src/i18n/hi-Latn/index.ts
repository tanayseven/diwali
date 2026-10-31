import type {Translation} from "../i18n-types"

// Hinglish: Hindi written in the Latin alphabet, with English words where people use them
const hiLatn = {
	title: "Diwali Celebration",
	loading: "Load ho raha hai…",
	tools: {
		diyas: "Diye",
		fireworks: "Patakhe",
		kandil: "Kandil banao",
		decorate: "Ghar sajao",
		rangoli: "Rangoli banao",
	},
	zoom: {
		in: "Zoom in",
		out: "Zoom out",
	},
	hud: {
		hide: "Bar chhupao",
		show: "Bar dikhao",
	},
	screenshot: {
		take: "Share karne ke liye photo lo",
		shareText: "Mera Diwali Celebration, {url} pe",
	},
	splashWarning: {
		heading: "Warning",
		message: "Is app mein chamakti aur timtimati lights hain, jinse photosensitive epilepsy wale logon ko seizures aa sakte hain. Agar aapko epilepsy hai ya pehle kabhi seizure aaya hai, toh ise use karte waqt dhyaan rakhein, aur tabiyat theek na lage toh turant band kar dein.",
	},
	portraitWarning: {
		heading: "Portrait mode support nahi hai",
		message: "Yeh app portrait mode mein nahi dikh sakta. Aage badhne ke liye apna device ghuma ke landscape mode mein karein.",
	},
	footer: {
		credit: "{author} ne {love} se banaya",
		love: "Pyaar",
	},
	audio: {
		mute: "Music band karo",
		unmute: "Music chalu karo",
		volume: "Volume",
	},
	tooltip: {
		diya: {
			name: "Diya",
			stack: "Tel ka diya. Ek drag karke porch pe rakho",
			needsWickAndOil: "Baati aur tel chahiye",
			needsWick: "Baati chahiye",
			needsOil: "Tel chahiye",
			ready: "Maachis se jalane ke liye ready",
			lit: "Jal raha hai",
			turn: "Ghumane ke liye tap karo",
		},
		wick: {
			name: "Baati",
			hint: "Diye pe drag karke lagao",
		},
		oil: {
			name: "Tel",
			hint: "Diye pe drag karke bharo",
		},
		matchstick: {
			name: "Maachis ki teeli",
			diyaHint: "Baati aur tel wale diye pe drag karo, aur jalane ke liye wahin pakad ke rakho",
			fireworkHint: "Kisi patakhe pe drag karo, aur jalane ke liye wahin pakad ke rakho",
		},
		anar: {
			name: "Anar",
			stack: "Phuhaare jaisa patakha. Ek drag karke porch pe rakho",
		},
		laddi: {
			name: "Laddi",
			stack: "Patakhon ki laddi. Ek drag karke porch pe rakho",
		},
		chakri: {
			name: "Chakri",
			stack: "Zameen pe ghoomne wali chakri. Ek drag karke porch pe rakho",
		},
		sutli: {
			name: "Sutli Bomb",
			stack: "Sutli mein kaske lipta patakha. Ek drag karke porch pe rakho",
		},
		rocket: {
			name: "Rocket",
			stack: "Dandi wala rocket, khaali bottle mein khada. Ek drag karke porch pe rakho",
		},
		noneLeft: "Ek bhi nahi bacha",
		move: "Hilane ke liye drag karo, ya wapas rakhne ke liye bar pe drag karo",
		unlit: "Maachis se jalao",
		spent: "Bujh gaya. Hatane ke liye bar pe drag karo",
		lights: {
			name: "Fairy lights",
			red: "Laal fairy lights",
			orange: "Narangi fairy lights",
			yellow: "Peeli fairy lights",
			green: "Hari fairy lights",
			blue: "Neeli fairy lights",
			white: "Safed fairy lights",
			mixed: "Rang-birangi fairy lights",
			hint: "Chuno, phir ghar pe ek jagah se doosri jagah tak drag karke lights lagao",
			move: "Hilane ke liye drag karo, ya utaarne ke liye Ghar sajao bar pe drag karo",
		},
		rangoli: {
			red: "Laal rang",
			orange: "Narangi rang",
			yellow: "Peela rang",
			green: "Hara rang",
			blue: "Neela rang",
			purple: "Baingani rang",
			pink: "Gulabi rang",
			white: "Safed rang",
			hint: "Chuno, phir porch ke farsh pe banao",
			eraser: "Rubber",
			eraserHint: "Chuno, phir rangoli ke hisse mitao",
			clear: "Saaf karo",
			clearHint: "Farsh se poori rangoli mita deta hai",
		},
	},
} satisfies Translation

export default hiLatn
