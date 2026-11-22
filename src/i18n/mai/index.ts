import type {Translation} from "../i18n-types"

// Maithili, in Devanagari
const mai = {
	title: "दिवाली उत्सव",
	loading: "लोड भ' रहल अछि…",
	tools: {
		diyas: "दीया",
		fireworks: "पटाखा",
		kandil: "कंदील बनाउ",
		decorate: "घर सजाउ",
		rangoli: "रंगोली बनाउ",
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
		hide: "पट्टी नुकाउ",
		show: "पट्टी देखाउ",
	},
	screenshot: {
		take: "शेयर करबाक लेल फोटो लिअ",
		shareText: "हमर दिवाली उत्सव, {url} पर",
	},
	splashWarning: {
		heading: "चेतावनी",
		message: "एहि ऐपमे चमकैत आ टिमटिमाइत इजोत अछि, जाहिसँ फोटोसेंसिटिव मिर्गी बला लोककेँ दौरा पड़ि सकैत अछि। जँ अहाँकेँ मिर्गी अछि वा पहिने कहियो दौरा पड़ल अछि, तँ एकर उपयोग करैत काल सावधान रहू, आ तबियत ठीक नहि लागय तँ तुरंत बंद क' दिअ।",
	},
	soundSplash: {
		heading: "स्टीरियो ध्वनिक उपयोग करू",
		message: "नीक अनुभवक लेल हेडफोन वा स्टीरियो साउंड सिस्टमक उपयोग करू। सभ आवाज ओतहिसँ सुनाइ दैत अछि जतयसँ ओ अबैत अछि, अहाँक बामा वा दहिना दिससँ।",
	},
	portraitWarning: {
		heading: "पोर्ट्रेट मोड नहि चलैत अछि",
		message: "ई ऐप पोर्ट्रेट मोडमे नहि देखाओल जा सकैत अछि। आगाँ बढ़बाक लेल कृपया अपन डिवाइस घुमा क' लैंडस्केप मोडमे करू।",
	},
	footer: {
		credit: "{author} द्वारा {love} सँ बनाओल",
		love: "प्रेम",
		privacy: "गोपनीयता",
	},
	audio: {
		mute: "संगीत बंद करू",
		unmute: "संगीत चालू करू",
		volume: "आवाज",
	},
	// A guided first run, a step at a time, shown on the first visit and from the settings
	tour: {
		diya: "पट्टीसँ एकटा दीया घीचि क' ओसारा पर राखू",
		lightDiya: "आब बाती आ तेल एहि पर घीचू, फेर सलाइक काठीसँ एकरा लेसू",
		pickFireworks: "बामाँ दिससँ पटाखा चुनू",
		firework: "एकटा अनार घीचि क' ओसारा पर राखू, फेर सलाइक काठीसँ ओकरा लेसू",
		more: "एहिसँ आकाश कंदील बनाउ, झालर टाँगू आ रंगोली बनाउ। दिवालीक शुभकामना!",
		skip: "छोड़ू",
		done: "भ' गेल",
		// In the settings, to go through it again
		title: "मार्गदर्शन",
		replay: "फेरसँ देखाउ",
	},
	// Rating the app in its store, in the Android app only: a row in the settings, and now
	// and then, after something's been made, a card asking
	rating: {
		title: "ऐपकेँ रेटिंग दिअ",
		rate: "रेटिंग दिअ",
		ask: "दिवाली उत्सव नीक लागि रहल अछि? रेटिंग दिअ, जाहिसँ आनो लोक एकरा ताकि सकथि",
		later: "एखन नहि",
		never: "फेर नहि पुछू",
	},
	// Shown at the start, the first time, to pick the house to decorate
	housePicker: {
		heading: "अपन घर चुनू",
		hint: "एकरा दिवाली लेल सजाउ। अहाँक पड़ोसी अपन घर पहिनहि सजा लेने छथि, आ हुनक परिवार बाहर उत्सव मना रहल छथि।",
	},
	modeMenu: {
		heading: "अहाँ कोना मनाएब?",
		freePlay: "मुक्त खेल",
		freePlayAbout: "अपन घर अपन गति सँ सजाउ",
		tournament: "प्रतियोगिता",
		tournamentAbout: "सभसँ सुन्नर घरक लेल पड़ोसी सभ सँ प्रतियोगिता करू",
	},
	tournament: {
		you: "अहाँ",
		go: "शुरू!",
		results: "परिणाम",
		youWin: "अहाँ जीति गेलहुँ!",
		houseWins: "{house} जीति गेल!",
		playAgain: "फेर सँ खेलू",
	},
	// The settings panel, opened with the gear button in the top right corner
	settings: {
		open: "सेटिंग्स",
		close: "बंद करू",
		music: "संगीत",
		musicVolume: "संगीतक आवाज",
		effects: "ध्वनि प्रभाव",
		nextTrack: "अगिला गीत",
		language: "भाषा",
		// Also on the photosensitivity warning shown at the start
		reduceFlashing: "चमक कम करू",
		// The house picked at the start; tapping it starts the game again, to pick another
		house: "अहाँक घर",
	},
	tooltip: {
		hintButton: "आगाँ की करू",
		next: {
			addWickAndOil: "आगाँ: \"दीया\" पट्टीसँ बाती आ तेल एहि पर घीचू, कोनो क्रममे",
			addWick: "आगाँ: \"दीया\" पट्टीसँ बाती एहि पर घीचू",
			addOil: "आगाँ: \"दीया\" पट्टीसँ तेल एहि पर घीचू",
			lightDiya: "आगाँ: लेसबाक लेल \"दीया\" पट्टीसँ सलाइक काठी एहि पर घीचि ओतहि पकड़ने रहू, वा सलाइक काठी पर टैप करू, फेर एहि पर",
			lightFirework: "आगाँ: लेसबाक लेल \"पटाखा\" पट्टीसँ सलाइक काठी एहि पर घीचि ओतहि पकड़ने रहू, वा सलाइक काठी पर टैप करू, फेर एहि पर",
			addPaper: "आगाँ: लपेटबाक लेल \"कंदील बनाउ\" पट्टीसँ कागज एहि पर घीचू, वा एहि पर टैप करू, फेर कागज पर",
			addTails: "आगाँ: \"कंदील बनाउ\" पट्टीसँ लटकन एहि पर घीचू, वा एहि पर टैप करू, फेर लटकन पर",
			addBulb: "आगाँ: जरेबाक लेल \"कंदील बनाउ\" पट्टीसँ बल्ब एहि पर घीचू, वा एहि पर टैप करू, फेर बल्ब पर",
		},
		diya: {
			name: "दीया",
			stack: "तेलक दीया। एकटा घीचि क' ओसारा पर राखू",
			needsWickAndOil: "बाती आ तेल चाही",
			needsWick: "बाती चाही",
			needsOil: "तेल चाही",
			ready: "सलाइसँ लेसबाक लेल तैयार",
			lit: "जरि रहल अछि",
			turn: "घुमेबाक लेल टैप करू",
		},
		wick: {
			name: "बाती",
			hint: "दीया पर घीचि क' ओहिमे लगाउ",
		},
		oil: {
			name: "तेल",
			hint: "दीया पर घीचि क' ओकरा भरू",
		},
		matchstick: {
			name: "सलाइक काठी",
			diyaHint: "लेसबाक लेल बाती आ तेल बला दीया पर घीचि ओतहि पकड़ने रहू, वा एहि पर टैप करू, फेर दीया पर",
			fireworkHint: "लेसबाक लेल कोनो पटाखा पर घीचि ओतहि पकड़ने रहू, वा एहि पर टैप करू, फेर पटाखा पर",
		},
		anar: {
			name: "अनार",
			stack: "फुहारा सन पटाखा। एकटा घीचि क' ओसारा पर राखू",
		},
		laddi: {
			name: "लड़ी",
			stack: "पटाखाक लड़ी। एकटा घीचि क' ओसारा पर राखू",
		},
		chakri: {
			name: "चकरी",
			stack: "जमीन पर घुमय बला चकरी। एकटा घीचि क' ओसारा पर राखू",
		},
		sutli: {
			name: "सुतली बम",
			stack: "सुतलीमे कसि क' लपेटल पटाखा। एकटा घीचि क' ओसारा पर राखू",
		},
		rocket: {
			name: "रॉकेट",
			stack: "डंटा बला रॉकेट, खाली बोतलमे ठाढ़। एकटा घीचि क' ओसारा पर राखू",
		},
		skyshot: {
			name: "स्काई शॉट",
			stack: "आकाशमे ऊँच गोला दागऽ बला नली, जतय ओ फटैत अछि। एकटा घीचि क' ओसारा पर राखू",
		},
		kandil: {
			name: "आकाश कंदील",
			needsPaper: "कागज चाही",
			needsTails: "लटकन चाही",
			ready: "बल्बक लेल तैयार",
			lit: "जरि रहल अछि",
			move: "ओसारा वा घर पर ल' जेबाक लेल घीचू, वा ढाँचा घुरा क' रखबाक लेल \"कंदील बनाउ\" पट्टी पर घीचू",
			frame: {
				name: "कंदीलक ढाँचा",
				stack: "आकाश कंदीलक लेल बाँसक ढाँचा। बनेबाक लेल एकटा घीचि क' ओसारा पर राखू, वा टाँगबाक लेल घर पर",
			},
			paper: {
				red: "लाल कागज",
				orange: "नारंगी कागज",
				blue: "नील कागज",
				mixed: "रंग-बिरंगी कागज",
				hint: "लपेटबाक लेल कंदीलक ढाँचा पर घीचू",
			},
			tails: {
				green: "हरियर लटकन",
				red: "लाल लटकन",
				gold: "सोनहुला लटकन",
				mixed: "रंग-बिरंगी लटकन",
				hint: "कागज लपेटल कंदील पर घीचू, जाहिसँ ओ ओकरा नीचाँ लटकय",
			},
			bulb: {
				name: "बल्ब",
				hint: "जरेबाक लेल कागज आ लटकन बला कंदील पर घीचू",
			},
		},
		noneLeft: "एकोटा नहि बचल",
		move: "हटेबाक लेल घीचू, वा घुरा क' रखबाक लेल पट्टी पर घीचू",
		unlit: "सलाइसँ लेसू",
		spent: "मिझा गेल। हटेबाक लेल ओसाराक कूड़ादान मे घीचू",
		// The waste bin on the porch, for burnt-out fireworks
		bin: {
			name: "कूड़ादान",
			hint: "मिझायल पटाखा हटेबाक लेल एतय घीचू",
		},
		lights: {
			name: "झालर",
			red: "लाल झालर",
			orange: "नारंगी झालर",
			yellow: "पीयर झालर",
			green: "हरियर झालर",
			blue: "नील झालर",
			white: "उज्जर झालर",
			mixed: "रंग-बिरंगी झालर",
			hint: "चुनू, फेर घर पर एक ठामसँ दोसर ठाम धरि घीचि क' झालर टाँगू",
			move: "हटेबाक लेल घीचू, वा उतारबाक लेल \"घर सजाउ\" पट्टी पर घीचू",
		},
		rangoli: {
			// The first slot of the Draw Rangoli bar, which shows the design picked
			design: "अपन डिज़ाइन बनेबाक लेल टैप करू, फेर ओकरा रखबाक लेल ओसाराक फर्श पर टैप करू",
			clear: "साफ करू",
			clearHint: "फर्शसँ पूरा रंगोली मेटा दैत अछि",
		},
	},
} satisfies Translation

export default mai
