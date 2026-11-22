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
	soundSplash: {
		heading: "Stereo sound use karein",
		message: "Behtar experience ke liye headphones ya stereo sound system use karein. Har awaaz wahin se sunaai deti hai jahaan se woh aati hai, aapke left ya right.",
	},
	portraitWarning: {
		heading: "Portrait mode support nahi hai",
		message: "Yeh app portrait mode mein nahi dikh sakta. Aage badhne ke liye apna device ghuma ke landscape mode mein karein.",
	},
	footer: {
		credit: "{author} ne {love} se banaya",
		love: "Pyaar",
		privacy: "Privacy",
	},
	audio: {
		mute: "Music band karo",
		unmute: "Music chalu karo",
		volume: "Volume",
	},
	// A guided first run, a step at a time, shown on the first visit and from the settings
	tour: {
		diya: "Bar se ek diya drag karke porch pe rakho",
		lightDiya: "Ab baati aur tel ispe drag karo, phir maachis ki teeli se ise jalao",
		pickFireworks: "Left se Patakhe chuno",
		firework: "Ek anar drag karke porch pe rakho, phir maachis ki teeli se use jalao",
		more: "Inse akash kandil banao, fairy lights lagao aur rangoli banao. Happy Diwali!",
		skip: "Skip karo",
		done: "Ho gaya",
		// In the settings, to go through it again
		title: "Walkthrough",
		replay: "Phir se dikhao",
	},
	// Rating the app in its store, in the Android app only: a row in the settings, and now
	// and then, after something's been made, a card asking
	rating: {
		title: "App ko rate karo",
		rate: "Rate karo",
		ask: "Diwali Celebration pasand aa raha hai? Rate karo, taaki doosre bhi ise dhoondh sakein",
		later: "Abhi nahi",
		never: "Phir mat poochho",
	},
	// Shown at the start, the first time, to pick the house to decorate
	housePicker: {
		heading: "Apna ghar chuno",
		hint: "Ise Diwali ke liye sajao. Tumhare padosi apne ghar pehle hi saja chuke hain, aur unke parivaar bahar jashn mana rahe hain.",
	},
	// The settings panel, opened with the gear button in the top right corner
	settings: {
		open: "Settings",
		close: "Band karo",
		music: "Music",
		musicVolume: "Music volume",
		effects: "Sound effects",
		nextTrack: "Agla gaana",
		language: "Bhasha",
		// Also on the photosensitivity warning shown at the start
		reduceFlashing: "Chamak kam karein",
		// The house picked at the start; tapping it starts the game again, to pick another
		house: "Tumhara ghar",
	},
	tooltip: {
		hintButton: "Aage kya karein",
		next: {
			addWickAndOil: "Aage: Diye bar se baati aur tel ispe drag karo, kisi bhi order mein",
			addWick: "Aage: Diye bar se baati ispe drag karo",
			addOil: "Aage: Diye bar se tel ispe drag karo",
			lightDiya: "Aage: jalane ke liye Diye bar se maachis ki teeli ispe drag karke wahin pakad ke rakho, ya maachis ki teeli pe tap karo, phir ispe",
			lightFirework: "Aage: jalane ke liye Patakhe bar se maachis ki teeli ispe drag karke wahin pakad ke rakho, ya maachis ki teeli pe tap karo, phir ispe",
			addPaper: "Aage: lapetne ke liye Kandil banao bar se kaagaz ispe drag karo, ya ispe tap karo, phir kaagaz pe",
			addTails: "Aage: Kandil banao bar se latkanein ispe drag karo, ya ispe tap karo, phir latkanon pe",
			addBulb: "Aage: jalaane ke liye Kandil banao bar se bulb ispe drag karo, ya ispe tap karo, phir bulb pe",
		},
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
			diyaHint: "Jalane ke liye baati aur tel wale diye pe drag karke wahin pakad ke rakho, ya ispe tap karo, phir diye pe",
			fireworkHint: "Jalane ke liye kisi patakhe pe drag karke wahin pakad ke rakho, ya ispe tap karo, phir patakhe pe",
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
		skyshot: {
			name: "Sky Shot",
			stack: "Aasmaan mein ooncha gola daagne wali nali, jahaan woh phat-ta hai. Ek drag karke porch pe rakho",
		},
		kandil: {
			name: "Akash Kandil",
			needsPaper: "Kaagaz chahiye",
			needsTails: "Latkanein chahiye",
			ready: "Bulb ke liye taiyaar",
			lit: "Jal raha hai",
			move: "Porch ya ghar pe le jaane ke liye drag karo, ya dhaancha wapas rakhne ke liye Kandil banao bar pe drag karo",
			frame: {
				name: "Kandil ka dhaancha",
				stack: "Akash kandil ke liye baans ka dhaancha. Banane ke liye ek drag karke porch pe rakho, ya taangne ke liye ghar pe",
			},
			paper: {
				red: "Laal kaagaz",
				orange: "Narangi kaagaz",
				blue: "Neela kaagaz",
				mixed: "Rang-birangi kaagaz",
				hint: "Lapetne ke liye kandil ke dhaanche pe drag karo",
			},
			tails: {
				green: "Hari latkanein",
				red: "Laal latkanein",
				gold: "Sunehri latkanein",
				mixed: "Rang-birangi latkanein",
				hint: "Kaagaz lipte kandil pe drag karo, taaki woh uske neeche latkein",
			},
			bulb: {
				name: "Bulb",
				hint: "Jalaane ke liye kaagaz aur latkanon waale kandil pe drag karo",
			},
		},
		noneLeft: "Ek bhi nahi bacha",
		move: "Hilane ke liye drag karo, ya wapas rakhne ke liye bar pe drag karo",
		unlit: "Maachis se jalao",
		spent: "Bujh gaya. Hatane ke liye porch ke dustbin mein drag karo",
		// The waste bin on the porch, for burnt-out fireworks
		bin: {
			name: "Dustbin",
			hint: "Bujhe hue patakhe hatane ke liye yahan drag karo",
		},
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
			// The first slot of the Draw Rangoli bar, which shows the design picked
			design: "Apna design banane ke liye tap karo, phir use rakhne ke liye porch ke farsh pe tap karo",
			clear: "Saaf karo",
			clearHint: "Farsh se poori rangoli mita deta hai",
		},
	},
} satisfies Translation

export default hiLatn
