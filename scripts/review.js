if (typeof browser === "undefined") {
	var browser = chrome;
}

var cssURL = browser.runtime.getURL('resource/css/vinehelper.css')
fetch(cssURL).then(response => response.text()).then(cssText => {
	const styleElement = document.createElement("style");
	styleElement.type = 'text/css';
	styleElement.appendChild(document.createTextNode(cssText));
	document.head.appendChild(styleElement);
})
.catch(error => console.log(error));


var appSettings = {};
var arrReview = [];
var arrTemplate = [];
var asin = null;
var Tpl = new Template();
var TplMgr = new TemplateMgr();

function showRuntime() {
	//Function must exist for the Template system, but not needed for this page
}
async function loadSettings() {
	var data;
	data = await browser.storage.local.get("settings");
	if (data == null || Object.keys(data).length === 0) {
		return; //Can't display this page before settings are initiated
	}
	Object.assign(appSettings, data.settings);

	//If no reviews exist already, create an empty array
	data = await browser.storage.local.get("reviews");
	if (data == null || Object.keys(data).length === 0) {
		await browser.storage.local.set({ reviews: [] });
	} else {
		Object.assign(arrReview, data.reviews);
	}

	//If no template exist already, create an empty array
	data = await browser.storage.local.get("reviews_templates");
	if (data == null || Object.keys(data).length === 0) {
		await browser.storage.local.set({ reviews_templates: [] });
	} else {
		Object.assign(arrTemplate, data.reviews_templates);
	}

	init_review(); //We want to wait for the settings to be loaded before continuing
}
loadSettings();

function init_review() {
	let currentUrl = window.location.href;
	let regex = /^(?:.+?).amazon\.(?:.+?)\/review\/create-review.*&asin=(.+)$/;
	arrMatches = currentUrl.match(regex);
	if (arrMatches != null) {
		asin = arrMatches[1];
		boot_review();
	}
}

async function boot_review() {
	//Load the toolbar template
	const prom = await Tpl.loadFile("/view/review_toolbar.html");
	Tpl.setVar(
		"tpl_manage_url",
		browser.runtime.getURL("page/reviews_templates.html")
	);
	Tpl.setVar(
		"review_manage_url",
		browser.runtime.getURL("page/reviews_manage.html")
	);
	Tpl.setVar("asin", asin);
	let content = Tpl.render(prom);

	arrZone = document.querySelectorAll(
		"form.ryp__review-form__form .ryp__card-frame"
	);
	container = arrZone[arrZone.length - 1];
	container.insertAdjacentHTML("afterend", content);

	//Add the template titles in the select box
	let selectBox = document.getElementById("template_name");
	for (let i = 0; i < arrTemplate.length; i++) {
		selectBox.insertAdjacentHTML(
			"beforeend",
			"<option value='" +
				arrTemplate[i].id +
				"'>" +
				JSON.parse(arrTemplate[i].title) +
				"</option>"
		);
	}

	//If the Insert button is clicked, insert the content of the selected
	//template into the review box.
	document
		.getElementById("insertTemplate")
		.addEventListener("click", function () {
			let id = document.getElementById("template_name").value;
			for (let i = 0; i < arrTemplate.length; i++) {
				if (arrTemplate[i].id == id) {
					let review = document.getElementById(
						"scarface-review-text-card-title"
					);
					review.value += JSON.parse(arrTemplate[i].content);
					return;
				}
			}
		});

	//Save review button
	document
		.getElementById("saveReview")
		.addEventListener("click", async function () {
			let found = false;
			let reviewTitle = document.getElementById(
				"scarface-review-title-label"
			).value;

			let reviewContent = document.getElementById(
				"scarface-review-text-card-title"
			).value;

			if(reviewTitle === "" || reviewContent === ""){
				return;
			}

			let index = arrReview.findIndex((review) => review.asin === asin);
			if (index > -1) {
				//Update the review
				arrReview[index].date = new Date().toString();
				arrReview[index].title = JSON.stringify(reviewTitle);
				arrReview[index].content = JSON.stringify(reviewContent);
				found = true;
			} 
			//}
			if (!found) {
				//Save a new review
				arrReview.push({
					asin: asin,
					date: new Date().toString(),
					title: JSON.stringify(
						document.getElementById("scarface-review-title-label")
							.value
					),
					content: JSON.stringify(
						document.getElementById(
							"scarface-review-text-card-title"
						).value
					),
				});
			}

			await browser.storage.local.set({ reviews: arrReview });
			alert("Review saved!");
		});
}