import type {Translation} from "../i18n-types"

// Urdu, in Perso-Arabic (Nastaliq) script
const ur = {
	title: "دیوالی کا جشن",
	loading: "لوڈ ہو رہا ہے…",
	tools: {
		diyas: "دیے",
		fireworks: "پٹاخے",
		kandil: "قندیل بنائیں",
		decorate: "گھر سجائیں",
		rangoli: "رنگولی بنائیں",
	},
	houses: {
		deepaNiwas: "دیپا نواس",
		lakshmiSadan: "لکشمی سدن",
		thulasiMana: "تلسی منا",
		saiKrupa: "سائی کرپا",
		ganeshKunj: "گنیش کنج",
		anandVilla: "آنند ولا",
	},
	zoom: {
		in: "زوم اِن",
		out: "زوم آؤٹ",
	},
	hud: {
		hide: "پٹی چھپائیں",
		show: "پٹی دکھائیں",
	},
	screenshot: {
		take: "شیئر کرنے کے لیے تصویر لیں",
		shareText: "میرا دیوالی کا جشن، {url} پر",
	},
	splashWarning: {
		heading: "انتباہ",
		message: "اس ایپ میں چمکتی اور ٹمٹماتی روشنیاں ہیں، جن سے فوٹو سینسیٹو مرگی والے لوگوں کو دورے پڑ سکتے ہیں۔ اگر آپ کو مرگی ہے یا پہلے کبھی دورے پڑ چکے ہیں، تو اسے استعمال کرتے وقت احتیاط کریں، اور طبیعت خراب لگے تو فوراً بند کر دیں۔",
	},
	soundSplash: {
		heading: "اسٹیریو آواز استعمال کریں",
		message: "بہتر تجربے کے لیے ہیڈ فون یا اسٹیریو ساؤنڈ سسٹم استعمال کریں۔ ہر آواز وہیں سے سنائی دیتی ہے جہاں سے وہ آتی ہے، آپ کے بائیں یا دائیں۔",
	},
	portraitWarning: {
		heading: "پورٹریٹ موڈ دستیاب نہیں",
		message: "یہ ایپ پورٹریٹ موڈ میں نہیں دکھائی جا سکتی۔ جاری رکھنے کے لیے براہِ کرم اپنا آلہ گھما کر لینڈ اسکیپ موڈ میں کریں۔",
	},
	footer: {
		credit: "{author} نے {love} سے بنایا",
		love: "محبت",
		privacy: "رازداری",
	},
	audio: {
		mute: "موسیقی بند کریں",
		unmute: "موسیقی چلائیں",
		volume: "آواز",
	},
	// A guided first run, a step at a time, shown on the first visit and from the settings
	tour: {
		diya: "پٹی سے ایک دیا کھینچ کر برآمدے میں رکھیں",
		lightDiya: "اب بتی اور تیل اس پر کھینچیں، پھر ماچس کی تیلی سے اسے جلائیں",
		pickFireworks: "بائیں طرف سے پٹاخے چنیں",
		firework: "ایک انار کھینچ کر برآمدے میں رکھیں، پھر ماچس کی تیلی سے اسے جلائیں",
		more: "ان سے آکاش قندیل بنائیں، جھالر لٹکائیں اور رنگولی بنائیں۔ دیوالی مبارک!",
		skip: "چھوڑیں",
		done: "ہو گیا",
		// In the settings, to go through it again
		title: "رہنمائی",
		replay: "دوبارہ دکھائیں",
	},
	// Rating the app in its store, in the Android app only: a row in the settings, and now
	// and then, after something's been made, a card asking
	rating: {
		title: "ایپ کو ریٹنگ دیں",
		rate: "ریٹنگ دیں",
		ask: "دیوالی کا جشن پسند آ رہا ہے؟ ریٹنگ دیں، تاکہ دوسرے بھی اسے ڈھونڈ سکیں",
		later: "ابھی نہیں",
		never: "دوبارہ نہ پوچھیں",
	},
	// Shown at the start, the first time, to pick the house to decorate
	housePicker: {
		heading: "اپنا گھر چنیں",
		hint: "اسے دیوالی کے لیے سجائیں۔ آپ کے پڑوسی اپنے گھر پہلے ہی سجا چکے ہیں، اور ان کے گھر والے باہر جشن منا رہے ہیں۔",
	},
	modeMenu: {
		heading: "آپ کیسے منائیں گے؟",
		freePlay: "آزاد کھیل",
		freePlayAbout: "اپنے گھر کو اپنی رفتار سے سجائیں",
		tournament: "مقابلہ",
		tournamentAbout: "سب سے خوبصورت گھر کے لیے پڑوسیوں سے مقابلہ کریں",
	},
	tournament: {
		you: "آپ",
		go: "شروع!",
		results: "نتائج",
		youWin: "آپ جیت گئے!",
		houseWins: "{house} جیت گیا!",
		playAgain: "دوبارہ کھیلیں",
		street: "پوری گلی دکھائیں",
		streetLeft: "بائیں طرف کے گھر",
		streetRight: "دائیں طرف کے گھر",
		feed: {
			lights: "{house} نے روشنیاں لگائیں",
			kandil: "{house} نے قندیل لٹکائی",
			rangoli: "{house} نے رنگولی بنائی",
		},
	},
	// The settings panel, opened with the gear button in the top right corner
	settings: {
		open: "ترتیبات",
		close: "بند کریں",
		music: "موسیقی",
		musicVolume: "موسیقی کی آواز",
		effects: "صوتی اثرات",
		nextTrack: "اگلا گانا",
		language: "زبان",
		// Also on the photosensitivity warning shown at the start
		reduceFlashing: "چمک کم کریں",
		// The house picked at the start; tapping it starts the game again, to pick another
		house: "آپ کا گھر",
	},
	tooltip: {
		hintButton: "آگے کیا کریں",
		next: {
			addWickAndOil: "آگے: \"دیے\" پٹی سے بتی اور تیل اس پر کھینچیں، کسی بھی ترتیب میں",
			addWick: "آگے: \"دیے\" پٹی سے بتی اس پر کھینچیں",
			addOil: "آگے: \"دیے\" پٹی سے تیل اس پر کھینچیں",
			lightDiya: "آگے: جلانے کے لیے \"دیے\" پٹی سے ماچس کی تیلی اس پر کھینچ کر وہیں پکڑے رکھیں، یا ماچس کی تیلی پر ٹیپ کریں، پھر اس پر",
			lightFirework: "آگے: جلانے کے لیے \"پٹاخے\" پٹی سے ماچس کی تیلی اس پر کھینچ کر وہیں پکڑے رکھیں، یا ماچس کی تیلی پر ٹیپ کریں، پھر اس پر",
			addPaper: "آگے: لپیٹنے کے لیے \"قندیل بنائیں\" پٹی سے کاغذ اس پر کھینچیں، یا اس پر ٹیپ کریں، پھر کاغذ پر",
			addTails: "آگے: \"قندیل بنائیں\" پٹی سے لٹکنیں اس پر کھینچیں، یا اس پر ٹیپ کریں، پھر لٹکنوں پر",
			addBulb: "آگے: روشن کرنے کے لیے \"قندیل بنائیں\" پٹی سے بلب اس پر کھینچیں، یا اس پر ٹیپ کریں، پھر بلب پر",
		},
		diya: {
			name: "دیا",
			stack: "تیل کا دیا۔ ایک کھینچ کر برآمدے میں رکھیں",
			needsWickAndOil: "بتی اور تیل چاہیے",
			needsWick: "بتی چاہیے",
			needsOil: "تیل چاہیے",
			ready: "ماچس سے جلانے کے لیے تیار",
			lit: "جل رہا ہے",
			turn: "گھمانے کے لیے ٹیپ کریں",
		},
		wick: {
			name: "بتی",
			hint: "دیے پر کھینچ کر اس میں لگائیں",
		},
		oil: {
			name: "تیل",
			hint: "دیے پر کھینچ کر اسے بھریں",
		},
		matchstick: {
			name: "ماچس کی تیلی",
			diyaHint: "جلانے کے لیے بتی اور تیل والے دیے پر کھینچ کر وہیں پکڑے رکھیں، یا اس پر ٹیپ کریں، پھر دیے پر",
			fireworkHint: "جلانے کے لیے کسی پٹاخے پر کھینچ کر وہیں پکڑے رکھیں، یا اس پر ٹیپ کریں، پھر پٹاخے پر",
		},
		anar: {
			name: "انار",
			stack: "فوارے جیسا پٹاخا۔ ایک کھینچ کر برآمدے میں رکھیں",
		},
		laddi: {
			name: "لڑی",
			stack: "پٹاخوں کی لڑی۔ ایک کھینچ کر برآمدے میں رکھیں",
		},
		chakri: {
			name: "چکری",
			stack: "زمین پر گھومنے والی چکری۔ ایک کھینچ کر برآمدے میں رکھیں",
		},
		sutli: {
			name: "سُتلی بم",
			stack: "سُتلی میں کس کر لپٹا پٹاخا۔ ایک کھینچ کر برآمدے میں رکھیں",
		},
		rocket: {
			name: "راکٹ",
			stack: "ڈنڈی والا راکٹ، خالی بوتل میں کھڑا۔ ایک کھینچ کر برآمدے میں رکھیں",
		},
		skyshot: {
			name: "اسکائی شاٹ",
			stack: "آسمان میں اونچا گولا داغنے والی نلی، جہاں وہ پھٹتا ہے۔ ایک کھینچ کر برآمدے میں رکھیں",
		},
		kandil: {
			name: "آکاش قندیل",
			needsPaper: "کاغذ چاہیے",
			needsTails: "لٹکنیں چاہییں",
			ready: "بلب کے لیے تیار",
			lit: "روشن ہے",
			move: "برآمدے یا گھر پر لے جانے کے لیے کھینچیں، یا ڈھانچہ واپس رکھنے کے لیے \"قندیل بنائیں\" پٹی پر کھینچیں",
			frame: {
				name: "قندیل کا ڈھانچہ",
				stack: "آکاش قندیل کے لیے بانس کا ڈھانچہ۔ بنانے کے لیے ایک کھینچ کر برآمدے میں رکھیں، یا لٹکانے کے لیے گھر پر",
			},
			paper: {
				red: "لال کاغذ",
				orange: "نارنجی کاغذ",
				blue: "نیلا کاغذ",
				mixed: "رنگ برنگا کاغذ",
				hint: "لپیٹنے کے لیے قندیل کے ڈھانچے پر کھینچیں",
			},
			tails: {
				green: "ہری لٹکنیں",
				red: "لال لٹکنیں",
				gold: "سنہری لٹکنیں",
				mixed: "رنگ برنگی لٹکنیں",
				hint: "کاغذ لپٹی قندیل پر کھینچیں، تاکہ وہ اس کے نیچے لٹکیں",
			},
			bulb: {
				name: "بلب",
				hint: "روشن کرنے کے لیے کاغذ اور لٹکنوں والی قندیل پر کھینچیں",
			},
		},
		noneLeft: "ایک بھی نہیں بچا",
		move: "جگہ بدلنے کے لیے کھینچیں، یا واپس رکھنے کے لیے پٹی پر کھینچیں",
		unlit: "ماچس سے جلائیں",
		spent: "بجھ گیا۔ ہٹانے کے لیے برآمدے کے کوڑے دان میں کھینچیں",
		// The waste bin on the porch, for burnt-out fireworks
		bin: {
			name: "کوڑے دان",
			hint: "بجھے ہوئے پٹاخے ہٹانے کے لیے یہاں کھینچیں",
		},
		lights: {
			name: "جھالر",
			red: "لال جھالر",
			orange: "نارنجی جھالر",
			yellow: "پیلی جھالر",
			green: "ہری جھالر",
			blue: "نیلی جھالر",
			white: "سفید جھالر",
			mixed: "رنگ برنگی جھالر",
			hint: "چنیں، پھر گھر پر ایک جگہ سے دوسری جگہ تک کھینچ کر جھالر لٹکائیں",
			move: "جگہ بدلنے کے لیے کھینچیں، یا اتارنے کے لیے \"گھر سجائیں\" پٹی پر کھینچیں",
		},
		rangoli: {
			// The first slot of the Draw Rangoli bar, which shows the design picked
			design: "اپنا ڈیزائن بنانے کے لیے ٹیپ کریں، پھر اسے رکھنے کے لیے برآمدے کے فرش پر ٹیپ کریں",
			clear: "صاف کریں",
			clearHint: "فرش سے پوری رنگولی مٹا دیتا ہے",
		},
	},
} satisfies Translation

export default ur
