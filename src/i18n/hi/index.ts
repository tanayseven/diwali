import type {Translation} from "../i18n-types"

// Hindi, in Devanagari
const hi = {
	title: "दिवाली उत्सव",
	loading: "लोड हो रहा है…",
	tools: {
		diyas: "दीये",
		fireworks: "पटाखे",
		kandil: "कंदील बनाएँ",
		decorate: "घर सजाएँ",
		rangoli: "रंगोली बनाएँ",
	},
	houses: {
		deepaNiwas: "दीपा निवास",
		lakshmiSadan: "लक्ष्मी सदन",
		thulasiMana: "तुलसी मना",
		saiKrupa: "साई कृपा",
		ganeshKunj: "गणेश कुंज",
		anandVilla: "आनंद विला",
	},
	zoom: {
		in: "ज़ूम इन",
		out: "ज़ूम आउट",
	},
	hud: {
		hide: "पट्टी छिपाएँ",
		show: "पट्टी दिखाएँ",
	},
	screenshot: {
		take: "शेयर करने के लिए फ़ोटो लें",
		shareText: "मेरा दिवाली उत्सव, {url} पर",
	},
	splashWarning: {
		heading: "चेतावनी",
		message: "इस ऐप में चमकती और टिमटिमाती रोशनियाँ हैं, जिनसे फ़ोटोसेंसिटिव मिर्गी वाले लोगों को दौरे पड़ सकते हैं। अगर आपको मिर्गी है या पहले कभी दौरे पड़े हैं, तो इसे इस्तेमाल करते समय सावधानी रखें, और तबीयत ठीक न लगे तो तुरंत बंद कर दें।",
	},
	soundSplash: {
		heading: "स्टीरियो साउंड का इस्तेमाल करें",
		message: "बेहतर अनुभव के लिए हेडफ़ोन या स्टीरियो साउंड सिस्टम का इस्तेमाल करें। हर आवाज़ वहीं से सुनाई देती है जहाँ से वह आती है, आपके बाएँ या दाएँ।",
	},
	portraitWarning: {
		heading: "पोर्ट्रेट मोड नहीं चलता",
		message: "यह ऐप पोर्ट्रेट मोड में नहीं दिखाया जा सकता। आगे बढ़ने के लिए कृपया अपना डिवाइस घुमाकर लैंडस्केप मोड में करें।",
	},
	footer: {
		credit: "{author} ने {love} से बनाया",
		love: "प्यार",
		privacy: "गोपनीयता",
	},
	audio: {
		mute: "संगीत बंद करें",
		unmute: "संगीत चालू करें",
		volume: "आवाज़",
	},
	// A guided first run, a step at a time, shown on the first visit and from the settings
	tour: {
		diya: "पट्टी से एक दीया खींचकर बरामदे में रखें",
		lightDiya: "अब बाती और तेल इस पर खींचें, फिर माचिस की तीली से इसे जलाएँ",
		pickFireworks: "बाईं ओर से पटाखे चुनें",
		firework: "एक अनार खींचकर बरामदे में रखें, फिर माचिस की तीली से उसे जलाएँ",
		more: "इनसे आकाश कंदील बनाएँ, झालर टाँगें और रंगोली बनाएँ। दिवाली की शुभकामनाएँ!",
		skip: "छोड़ें",
		done: "हो गया",
		// In the settings, to go through it again
		title: "मार्गदर्शन",
		replay: "फिर से दिखाएँ",
	},
	// Rating the app in its store, in the Android app only: a row in the settings, and now
	// and then, after something's been made, a card asking
	rating: {
		title: "ऐप को रेटिंग दें",
		rate: "रेटिंग दें",
		ask: "दिवाली उत्सव पसंद आ रहा है? रेटिंग दें, ताकि दूसरे भी इसे ढूँढ सकें",
		later: "अभी नहीं",
		never: "फिर न पूछें",
	},
	// Shown at the start, the first time, to pick the house to decorate
	housePicker: {
		heading: "अपना घर चुनें",
		hint: "इसे दिवाली के लिए सजाएँ। आपके पड़ोसी अपने घर पहले ही सजा चुके हैं, और उनके परिवार बाहर जश्न मना रहे हैं।",
	},
	modeMenu: {
		heading: "आप कैसे मनाएँगे?",
		freePlay: "मुक्त खेल",
		freePlayAbout: "अपने घर को अपनी रफ़्तार से सजाएँ",
		tournament: "टूर्नामेंट",
		tournamentAbout: "सबसे सुंदर घर के लिए पड़ोसियों से मुक़ाबला करें",
		greeting: "शुभकामना",
		greetingAbout: "भेजने के लिए वीडियो शुभकामना रिकॉर्ड करें",
	},
	// Recording a video greeting, picked from the menu, to send someone
	greeting: {
		heading: "दिवाली की शुभकामना भेजें",
		from: "आपका नाम",
		to: "किसके लिए",
		hint: "{min} से {max} सेकंड रिकॉर्ड करें",
		record: "रिकॉर्ड करें",
		stop: "रोकें",
		again: "फिर से रिकॉर्ड करें",
		send: "भेजें",
		back: "वापस",
		noCamera: "कैमरा नहीं खुल सका। शुभकामना रिकॉर्ड करने के लिए कैमरा और माइक्रोफ़ोन की अनुमति दें।",
		wish: "दिवाली की शुभकामनाएँ, {to}!",
		signed: "ढेर सारे प्यार के साथ, {from}",
		shareText: "दिवाली की शुभकामनाएँ, {to}! {from} की ओर से दिवाली की शुभकामना, {url} पर बनाई गई",
	},
	tournament: {
		you: "आप",
		go: "शुरू!",
		results: "नतीजे",
		youWin: "आप जीत गए!",
		houseWins: "{house} जीता!",
		playAgain: "फिर से खेलें",
		street: "पूरी गली दिखाएँ",
		streetLeft: "बाईं ओर के घर",
		streetRight: "दाईं ओर के घर",
		feed: {
			lights: "{house} ने रोशनी लगाई",
			kandil: "{house} ने कंदील टाँगा",
			rangoli: "{house} ने रंगोली बनाई",
			hit: "{house} का रॉकेट {target} के ऊपर फटा",
			hitYou: "{house} का रॉकेट आपके घर के ऊपर फटा",
			youHit: "आपका रॉकेट {house} के ऊपर फटा",
			shielded: "{house} के कंदील ने बचा लिया",
			youShielded: "आपके कंदील ने बचा लिया",
		},
		challenge: {
			kandil: "सबसे पहले कंदील टाँगो",
			lights: "सबसे पहले रोशनी की लड़ी लगाओ",
			rangoli: "सबसे पहले रंगोली बनाओ",
			won: "{house} ने होड़ जीती",
			youWon: "आपने होड़ जीती!",
		},
	},
	// The settings panel, opened with the gear button in the top right corner
	settings: {
		open: "सेटिंग्स",
		close: "बंद करें",
		music: "संगीत",
		musicVolume: "संगीत की आवाज़",
		effects: "साउंड इफ़ेक्ट",
		nextTrack: "अगला गाना",
		language: "भाषा",
		// Also on the photosensitivity warning shown at the start
		reduceFlashing: "चमक कम करें",
		// The house picked at the start; tapping it starts the game again, to pick another
		house: "आपका घर",
	},
	tooltip: {
		hintButton: "आगे क्या करें",
		next: {
			addWickAndOil: "आगे: \"दीये\" पट्टी से बाती और तेल इस पर खींचें, किसी भी क्रम में",
			addWick: "आगे: \"दीये\" पट्टी से बाती इस पर खींचें",
			addOil: "आगे: \"दीये\" पट्टी से तेल इस पर खींचें",
			lightDiya: "आगे: जलाने के लिए \"दीये\" पट्टी से माचिस की तीली इस पर खींचकर वहीं पकड़े रखें, या माचिस की तीली पर टैप करें, फिर इस पर",
			lightFirework: "आगे: जलाने के लिए \"पटाखे\" पट्टी से माचिस की तीली इस पर खींचकर वहीं पकड़े रखें, या माचिस की तीली पर टैप करें, फिर इस पर",
			addPaper: "आगे: लपेटने के लिए \"कंदील बनाएँ\" पट्टी से कागज़ इस पर खींचें, या इस पर टैप करें, फिर कागज़ पर",
			addTails: "आगे: \"कंदील बनाएँ\" पट्टी से लटकनें इस पर खींचें, या इस पर टैप करें, फिर लटकनों पर",
			addBulb: "आगे: जलाने के लिए \"कंदील बनाएँ\" पट्टी से बल्ब इस पर खींचें, या इस पर टैप करें, फिर बल्ब पर",
		},
		diya: {
			name: "दीया",
			stack: "तेल का दीया। एक खींचकर बरामदे में रखें",
			needsWickAndOil: "बाती और तेल चाहिए",
			needsWick: "बाती चाहिए",
			needsOil: "तेल चाहिए",
			ready: "माचिस से जलाने के लिए तैयार",
			lit: "जल रहा है",
			turn: "घुमाने के लिए टैप करें",
		},
		wick: {
			name: "बाती",
			hint: "दीये पर खींचकर उसमें लगाएँ",
		},
		oil: {
			name: "तेल",
			hint: "दीये पर खींचकर उसे भरें",
		},
		matchstick: {
			name: "माचिस की तीली",
			diyaHint: "जलाने के लिए बाती और तेल वाले दीये पर खींचकर वहीं पकड़े रखें, या इस पर टैप करें, फिर दीये पर",
			fireworkHint: "जलाने के लिए किसी पटाखे पर खींचकर वहीं पकड़े रखें, या इस पर टैप करें, फिर पटाखे पर",
		},
		anar: {
			name: "अनार",
			stack: "फव्वारे जैसा पटाखा। एक खींचकर बरामदे में रखें",
		},
		laddi: {
			name: "लड़ी",
			stack: "पटाखों की लड़ी। एक खींचकर बरामदे में रखें",
		},
		chakri: {
			name: "चकरी",
			stack: "ज़मीन पर घूमने वाली चकरी। एक खींचकर बरामदे में रखें",
		},
		sutli: {
			name: "सुतली बम",
			stack: "सुतली में कसकर लिपटा पटाखा। एक खींचकर बरामदे में रखें",
		},
		rocket: {
			name: "रॉकेट",
			stack: "डंडी वाला रॉकेट, खाली बोतल में खड़ा। एक खींचकर बरामदे में रखें",
		},
		skyshot: {
			name: "स्काई शॉट",
			stack: "आसमान में ऊँचे गोला दागने वाली नली, जहाँ वह फटता है। एक खींचकर बरामदे में रखें",
		},
		kandil: {
			name: "आकाश कंदील",
			needsPaper: "कागज़ चाहिए",
			needsTails: "लटकनें चाहिए",
			ready: "बल्ब के लिए तैयार",
			lit: "जल रहा है",
			move: "बरामदे या घर पर ले जाने के लिए खींचें, या ढाँचा वापस रखने के लिए \"कंदील बनाएँ\" पट्टी पर खींचें",
			frame: {
				name: "कंदील का ढाँचा",
				stack: "आकाश कंदील के लिए बाँस का ढाँचा। बनाने के लिए एक खींचकर बरामदे में रखें, या टाँगने के लिए घर पर",
			},
			paper: {
				red: "लाल कागज़",
				orange: "नारंगी कागज़",
				blue: "नीला कागज़",
				mixed: "रंग-बिरंगा कागज़",
				hint: "लपेटने के लिए कंदील के ढाँचे पर खींचें",
			},
			tails: {
				green: "हरी लटकनें",
				red: "लाल लटकनें",
				gold: "सुनहरी लटकनें",
				mixed: "रंग-बिरंगी लटकनें",
				hint: "कागज़ लिपटे कंदील पर खींचें, ताकि वे उसके नीचे लटकें",
			},
			bulb: {
				name: "बल्ब",
				hint: "जलाने के लिए कागज़ और लटकनों वाले कंदील पर खींचें",
			},
		},
		noneLeft: "एक भी नहीं बचा",
		move: "हिलाने के लिए खींचें, या वापस रखने के लिए पट्टी पर खींचें",
		unlit: "माचिस से जलाएँ",
		spent: "बुझ गया। हटाने के लिए बरामदे के कूड़ेदान में खींचें",
		// The waste bin on the porch, for burnt-out fireworks
		bin: {
			name: "कूड़ेदान",
			hint: "बुझे हुए पटाखे हटाने के लिए यहाँ खींचें",
		},
		lights: {
			name: "झालर",
			red: "लाल झालर",
			orange: "नारंगी झालर",
			yellow: "पीली झालर",
			green: "हरी झालर",
			blue: "नीली झालर",
			white: "सफ़ेद झालर",
			mixed: "रंग-बिरंगी झालर",
			hint: "चुनें, फिर घर पर एक जगह से दूसरी जगह तक खींचकर झालर टाँगें",
			move: "हिलाने के लिए खींचें, या उतारने के लिए \"घर सजाएँ\" पट्टी पर खींचें",
		},
		rangoli: {
			// The first slot of the Draw Rangoli bar, which shows the design picked
			design: "अपना डिज़ाइन बनाने के लिए टैप करें, फिर उसे रखने के लिए बरामदे के फ़र्श पर टैप करें",
			clear: "साफ़ करें",
			clearHint: "फ़र्श से पूरी रंगोली मिटा देता है",
		},
	},
} satisfies Translation

export default hi
